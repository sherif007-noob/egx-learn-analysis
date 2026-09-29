import { fetchEgyptScanner } from './scanner';
import { buildRegimeWatch, buildSessionWatch, buildSignal, toSnapshot } from './signal';
import { attachRegime, computeRegimeMetrics, updateRegimeHistory } from './regime';
import {
  persistAlertEvents,
  persistAlertOutcomes,
  persistRadarBatch,
  supabaseConfigured,
  type AlertEventRecord,
} from './supabase';
import { sendTelegramAlerts } from './telegram';
import type {
  AlertOutcome,
  AlertState,
  DeepMetrics,
  HistoryPoint,
  LiveSignal,
  MarketContext,
  PendingAlertEvaluation,
  RadarConfig,
  RadarEnv,
  RadarState,
  RegimePhase,
  ScannerRow,
  SignalStage,
} from './types';

const STATE_KEY = 'radar-state-v4';
const OUTCOME_HORIZONS = [5, 10, 20, 30] as const;

const STAGE_RANK: Record<SignalStage, number> = {
  WATCH: 1,
  TRIGGERING: 2,
  BREAKOUT: 3,
};

const REGIME_RANK: Record<RegimePhase, number> = {
  NORMAL: 0,
  ABNORMAL: 1,
  ACCELERATING: 2,
  SELF_REINFORCING: 3,
};

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

function pctDelta(current: number, previous: number): number {
  if (!Number.isFinite(previous) || previous <= 0) return 0;
  return ((current - previous) / previous) * 100;
}

function getConfig(env: RadarEnv): RadarConfig {
  return {
    enabled: String(env.RADAR_ENABLED ?? 'true').toLowerCase() !== 'false',
    timeZone: env.CAIRO_TZ || 'Africa/Cairo',
    sessionStart: env.SESSION_START || '10:00',
    sessionEnd: env.SESSION_END || '14:30',
    pollSeconds: clamp(Math.trunc(num(env.POLL_SECONDS, 20)), 10, 60),
    minScore: clamp(num(env.MIN_SCORE, 70), 0, 100),
    triggerScore: clamp(num(env.TRIGGER_SCORE, 83), 0, 100),
    cooldownMinutes: clamp(num(env.ALERT_COOLDOWN_MINUTES, 8), 1, 120),
    maxCandidates: clamp(Math.trunc(num(env.MAX_CANDIDATES, 15)), 1, 50),
    minDailyTurnover: Math.max(0, num(env.MIN_DAILY_TURNOVER_EGP, 8_000_000)),
    minMinuteTurnover: Math.max(0, num(env.MIN_MINUTE_TURNOVER_EGP, 120_000)),
    minVolumeShares: Math.max(0, num(env.MIN_VOLUME_SHARES, 100_000)),
    historyMinutes: clamp(Math.trunc(num(env.HISTORY_MINUTES, 5)), 3, 15),
  };
}

function cairoParts(epochMs: number, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(new Date(epochMs));
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return {
    weekday: get('weekday'),
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hhmm: `${get('hour')}:${get('minute')}`,
    hms: `${get('hour')}:${get('minute')}:${get('second')}`,
  };
}

function hhmmToMinutes(value: string): number {
  const [hourRaw, minuteRaw] = value.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
  return hour * 60 + minute;
}

function minutesUntilClose(hhmm: string, sessionEnd: string): number {
  return Math.max(0, hhmmToMinutes(sessionEnd) - hhmmToMinutes(hhmm));
}

function timeBucket(hhmm: string): string {
  const minutes = hhmmToMinutes(hhmm);
  if (minutes < 10 * 60 + 30) return 'OPEN_10_00_10_30';
  if (minutes < 12 * 60) return 'MORNING_10_30_12_00';
  if (minutes < 13 * 60 + 30) return 'MIDDAY_12_00_13_30';
  return 'CLOSE_13_30_14_30';
}

function isTradingSession(epochMs: number, cfg: RadarConfig): boolean {
  const { weekday, hhmm } = cairoParts(epochMs, cfg.timeZone);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'].includes(weekday)
    && hhmm >= cfg.sessionStart
    && hhmm <= cfg.sessionEnd;
}

function emptyMarket(): MarketContext {
  return {
    advancers: 0,
    decliners: 0,
    unchanged: 0,
    breadthRatio: 0.5,
    medianChangePct: 0,
    regime: 'MIXED',
  };
}

function emptyState(sessionDate = ''): RadarState {
  return {
    updatedAt: new Date(0).toISOString(),
    sessionDate,
    lastRunAt: 0,
    previous: {},
    history: {},
    regimeHistory: {},
    alerts: {},
    pendingEvaluations: [],
    latestSignals: [],
    market: emptyMarket(),
    lastUniverseCount: 0,
  };
}

function marketContext(rows: ScannerRow[]): MarketContext {
  const changes = rows
    .map((row) => row.changePct)
    .filter((value): value is number => value !== null && Number.isFinite(value))
    .sort((a, b) => a - b);

  const advancers = changes.filter((x) => x > 0.01).length;
  const decliners = changes.filter((x) => x < -0.01).length;
  const unchanged = Math.max(0, changes.length - advancers - decliners);
  const directional = advancers + decliners;
  const breadthRatio = directional > 0 ? advancers / directional : 0.5;

  let medianChangePct = 0;
  if (changes.length) {
    const mid = Math.floor(changes.length / 2);
    medianChangePct = changes.length % 2
      ? changes[mid]
      : (changes[mid - 1] + changes[mid]) / 2;
  }

  const regime = breadthRatio >= 0.58
    ? 'RISK_ON'
    : breadthRatio <= 0.32
      ? 'RISK_OFF'
      : 'MIXED';

  return {
    advancers,
    decliners,
    unchanged,
    breadthRatio,
    medianChangePct,
    regime,
  };
}

function currentLiquidLeaders(
  rows: ScannerRow[],
  market: MarketContext,
  cfg: RadarConfig,
) {
  return rows
    .filter((row) =>
      row.close !== null
      && row.volume !== null
      && row.turnover !== null
      && row.high !== null
      && row.turnover >= cfg.minDailyTurnover
      && row.volume >= cfg.minVolumeShares
    )
    .map((row) => {
      const close = row.close!;
      const high = row.high!;
      const changePct = row.changePct ?? 0;
      const rvol10 = row.rvol10 ?? 0;
      const closeLocation = row.closeLocation ?? 0.5;
      const relativeStrengthPct = changePct - market.medianChangePct;
      const hodDistancePct = high > 0 ? ((high - close) / high) * 100 : 100;
      const rank =
        Math.max(0, changePct) * 2.2
        + Math.min(Math.max(rvol10, 0), 5) * 2.5
        + closeLocation * 4
        + Math.max(0, relativeStrengthPct) * 1.4
        + Math.max(0, Math.log10(Math.max(row.turnover!, 1)) - 6) * 2;

      return {
        ticker: row.ticker,
        name: row.name,
        close,
        changePct,
        turnover: row.turnover!,
        rvol10,
        closeLocation,
        hodDistancePct,
        relativeStrengthPct,
        rank,
      };
    })
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 7)
    .map(({ rank: _rank, ...leader }) => leader);
}

function trimHistory(points: HistoryPoint[], now: number, historyMinutes: number): HistoryPoint[] {
  const cutoff = now - historyMinutes * 60_000;
  return points.filter((point) => point.at >= cutoff).slice(-60);
}

function referencePoint(points: HistoryPoint[], target: number): HistoryPoint | null {
  if (!points.length) return null;
  let best = points[0];
  let bestDistance = Math.abs(points[0].at - target);

  for (const point of points) {
    const distance = Math.abs(point.at - target);
    if (distance < bestDistance) {
      best = point;
      bestDistance = distance;
    }
  }
  return best;
}

function computeDeepMetrics(
  points: HistoryPoint[],
  current: HistoryPoint,
  market: MarketContext,
): DeepMetrics {
  const all = [...points, current].sort((a, b) => a.at - b.at);
  const oneMinute = referencePoint(all, current.at - 60_000);
  const threeMinute = referencePoint(all, current.at - 180_000);

  const velocity1mPct = oneMinute ? pctDelta(current.close, oneMinute.close) : 0;
  const velocity3mPct = threeMinute ? pctDelta(current.close, threeMinute.close) : velocity1mPct;

  const recent = all.slice(-6);
  let positiveIntervals5 = 0;
  for (let i = 1; i < recent.length; i += 1) {
    if (recent[i].close > recent[i - 1].close) positiveIntervals5 += 1;
  }

  const last60 = all.filter((point) => point.at >= current.at - 60_000);
  const prior60 = all.filter((point) =>
    point.at >= current.at - 120_000 && point.at < current.at - 60_000
  );

  const recentLow = last60.length ? Math.min(...last60.map((x) => x.close)) : current.close;
  const priorLow = prior60.length ? Math.min(...prior60.map((x) => x.close)) : recentLow;
  const higherLow = prior60.length >= 2 && last60.length >= 2 && recentLow > priorLow;

  const last120 = all.filter((point) => point.at >= current.at - 120_000);
  const compressionPct = last120.length >= 2 && current.close > 0
    ? ((Math.max(...last120.map((x) => x.close)) - Math.min(...last120.map((x) => x.close))) / current.close) * 100
    : 99;

  return {
    velocity1mPct,
    velocity3mPct,
    relativeStrengthPct: current.changePct - market.medianChangePct,
    positiveIntervals5,
    higherLow,
    compressionPct,
  };
}

function shouldAlert(
  existing: AlertState | undefined,
  signal: LiveSignal,
  now: number,
  cooldownMs: number,
): boolean {
  if (!existing) return true;
  if (STAGE_RANK[signal.stage] > STAGE_RANK[existing.stage]) return true;

  const currentRegime = signal.regimePhase || 'NORMAL';
  const previousRegime = existing.regimePhase || 'NORMAL';
  if (REGIME_RANK[currentRegime] > REGIME_RANK[previousRegime]) return true;

  return now - existing.lastAt >= cooldownMs && signal.score >= existing.lastScore + 4;
}

function createPendingEvaluation(
  eventId: string,
  signal: LiveSignal,
  now: number,
  availableMinutes: number,
): PendingAlertEvaluation | null {
  const remainingHorizons = OUTCOME_HORIZONS.filter((minutes) => minutes <= availableMinutes);
  if (!remainingHorizons.length) return null;

  return {
    eventId,
    ticker: signal.ticker,
    createdAt: now,
    entryPrice: signal.close,
    stage: signal.stage,
    score: signal.score,
    maxPrice: signal.close,
    minPrice: signal.close,
    remainingHorizons: [...remainingHorizons],
  };
}

function evaluatePending(
  pending: PendingAlertEvaluation[],
  rowsByTicker: Map<string, ScannerRow>,
  now: number,
) {
  const updatedWithExtrema: PendingAlertEvaluation[] = [];
  const afterCompletion: PendingAlertEvaluation[] = [];
  const outcomes: AlertOutcome[] = [];

  for (const item of pending) {
    const row = rowsByTicker.get(item.ticker);
    const currentPrice = row?.close;

    if (currentPrice === null || currentPrice === undefined || !Number.isFinite(currentPrice)) {
      updatedWithExtrema.push(item);
      afterCompletion.push(item);
      continue;
    }

    const maxPrice = Math.max(item.maxPrice, currentPrice);
    const minPrice = Math.min(item.minPrice, currentPrice);
    const elapsedMinutes = (now - item.createdAt) / 60_000;

    const due = item.remainingHorizons.filter((horizon) => elapsedMinutes >= horizon);
    const remaining = item.remainingHorizons.filter((horizon) => elapsedMinutes < horizon);

    const withExtrema: PendingAlertEvaluation = {
      ...item,
      maxPrice,
      minPrice,
    };
    updatedWithExtrema.push(withExtrema);

    for (const horizonMinutes of due) {
      const forwardReturnPct = pctDelta(currentPrice, item.entryPrice);
      const mfePct = pctDelta(maxPrice, item.entryPrice);
      const maePct = pctDelta(minPrice, item.entryPrice);

      outcomes.push({
        eventId: item.eventId,
        horizonMinutes,
        evaluatedAt: new Date(now).toISOString(),
        price: currentPrice,
        forwardReturnPct,
        maxPrice,
        minPrice,
        mfePct,
        maePct,
        hit05Pct: mfePct >= 0.5,
        hit1Pct: mfePct >= 1,
        hit2Pct: mfePct >= 2,
        drawdown05Pct: maePct <= -0.5,
        drawdown1Pct: maePct <= -1,
      });
    }

    if (remaining.length) {
      afterCompletion.push({
        ...withExtrema,
        remainingHorizons: remaining,
      });
    }
  }

  return { updatedWithExtrema, afterCompletion, outcomes };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export class RadarCoordinator {
  private ctx: any;
  private env: RadarEnv;

  constructor(ctx: any, env: RadarEnv) {
    this.ctx = ctx;
    this.env = env;
  }

  private async readState(): Promise<RadarState> {
    const stored = await this.ctx.storage.get(STATE_KEY) as RadarState | undefined;
    if (!stored) return emptyState();

    return {
      ...emptyState(stored.sessionDate || ''),
      ...stored,
      previous: stored.previous || {},
      history: stored.history || {},
      regimeHistory: stored.regimeHistory || {},
      alerts: stored.alerts || {},
      pendingEvaluations: stored.pendingEvaluations || [],
      latestSignals: stored.latestSignals || [],
      market: stored.market || emptyMarket(),
    };
  }

  private async writeState(state: RadarState): Promise<void> {
    await this.ctx.storage.put(STATE_KEY, state);
  }

  private async ensureNextAlarm(now: number, cfg: RadarConfig): Promise<void> {
    if (!cfg.enabled || !isTradingSession(now, cfg)) return;
    const desired = now + cfg.pollSeconds * 1000;
    const current = await this.ctx.storage.getAlarm();
    if (current === null || current > desired + 3000) {
      await this.ctx.storage.setAlarm(desired);
    }
  }

  private async run(now: number, force = false, notify = true) {
    const cfg = getConfig(this.env);

    if (!cfg.enabled && !force) return { skipped: true, reason: 'RADAR_ENABLED=false' };
    if (!force && !isTradingSession(now, cfg)) return { skipped: true, reason: 'outside EGX session' };

    let state = await this.readState();
    const clock = cairoParts(now, cfg.timeZone);

    if (state.sessionDate !== clock.date) {
      const regimeHistory = state.regimeHistory || {};
      state = {
        ...emptyState(clock.date),
        regimeHistory,
      };
    }

    const sinceLastMs = state.lastRunAt > 0 ? now - state.lastRunAt : Number.POSITIVE_INFINITY;
    const duplicateFloorMs = cfg.pollSeconds * 1000 * 0.55;

    if (!force && sinceLastMs < duplicateFloorMs) {
      await this.ensureNextAlarm(now, cfg);
      return { skipped: true, reason: 'duplicate tick', nextPollSeconds: cfg.pollSeconds };
    }

    const { rows, totalCount } = await fetchEgyptScanner();
    const market = marketContext(rows);
    const leaders = currentLiquidLeaders(rows, market, cfg);
    const rowsByTicker = new Map(rows.map((row) => [row.ticker, row]));

    const pendingEvaluation = evaluatePending(state.pendingEvaluations || [], rowsByTicker, now);

    const intervalSeconds = state.lastRunAt > 0
      ? clamp((now - state.lastRunAt) / 1000, 5, 90)
      : cfg.pollSeconds;

    const nextPrevious: RadarState['previous'] = {};
    const nextHistory: RadarState['history'] = {};
    const nextRegimeHistory: RadarState['regimeHistory'] = { ...(state.regimeHistory || {}) };
    const signals: LiveSignal[] = [];

    for (const row of rows) {
      const snapshot = toSnapshot(row);
      if (!snapshot) continue;

      nextPrevious[row.ticker] = snapshot;
      const oldHistory = trimHistory(state.history[row.ticker] || [], now, cfg.historyMinutes);
      const currentPoint: HistoryPoint = { ...snapshot, at: now };
      nextHistory[row.ticker] = trimHistory([...oldHistory, currentPoint], now, cfg.historyMinutes);

      const previous = state.previous[row.ticker];
      const deep = computeDeepMetrics(oldHistory, currentPoint, market);
      const regime = computeRegimeMetrics(
        state.regimeHistory[row.ticker] || [],
        clock.date,
        row,
        market,
      );
      nextRegimeHistory[row.ticker] = updateRegimeHistory(
        state.regimeHistory[row.ticker] || [],
        clock.date,
        row,
      );

      let signal: LiveSignal | null = null;

      if (previous && snapshot.volume >= previous.volume) {
        signal = buildSignal(row, previous, deep, market, {
          intervalSeconds,
          minScore: cfg.minScore,
          triggerScore: cfg.triggerScore,
          minDailyTurnover: cfg.minDailyTurnover,
          minMinuteTurnover: cfg.minMinuteTurnover,
          minVolumeShares: cfg.minVolumeShares,
        });
      }

      // Fallback discovery lane: strong liquid session leaders should remain
      // visible even when the latest 20-second window is quiet or this is the
      // first scan after deployment.
      if (!signal) {
        signal = buildSessionWatch(row, deep, market, {
          intervalSeconds,
          minScore: cfg.minScore,
          minDailyTurnover: cfg.minDailyTurnover,
          minVolumeShares: cfg.minVolumeShares,
        });
      }

      if (!signal) {
        signal = buildRegimeWatch(row, deep, market, regime, {
          intervalSeconds,
          minDailyTurnover: cfg.minDailyTurnover,
          minVolumeShares: cfg.minVolumeShares,
        });
      }

      if (signal) signals.push(attachRegime(signal, regime));
    }

    signals.sort((a, b) => b.score - a.score);
    const latestSignals = signals.slice(0, cfg.maxCandidates);

    const cooldownMs = cfg.cooldownMinutes * 60_000;
    const alertsToSend = notify
      ? latestSignals.filter((signal) =>
          shouldAlert(state.alerts[signal.ticker], signal, now, cooldownMs),
        )
      : [];

    const nextAlerts = { ...state.alerts };
    for (const signal of alertsToSend) {
      nextAlerts[signal.ticker] = {
        stage: signal.stage,
        lastAt: now,
        lastScore: signal.score,
        regimePhase: signal.regimePhase,
      };
    }

    const availableMinutes = minutesUntilClose(clock.hhmm, cfg.sessionEnd);
    const bucket = timeBucket(clock.hhmm);
    const alertEvents: AlertEventRecord[] = alertsToSend.map((signal) => ({
      eventId: crypto.randomUUID(),
      observedAt: new Date(now).toISOString(),
      sessionDate: clock.date,
      timeBucket: bucket,
      signal,
    }));

    const candidateNewPending = alertEvents
      .map((event) => createPendingEvaluation(event.eventId, event.signal, now, availableMinutes))
      .filter((item): item is PendingAlertEvaluation => item !== null);

    let telegramError: string | null = null;
    if (alertsToSend.length) {
      try {
        await sendTelegramAlerts(this.env, alertsToSend);
      } catch (error) {
        telegramError = error instanceof Error ? error.message : String(error);
        console.error(JSON.stringify({ type: 'telegram-error', telegramError }));
      }
    }

    let supabaseError: string | null = null;
    let alertEventsPersisted = !supabaseConfigured(this.env);
    let outcomesPersisted = !supabaseConfigured(this.env);

    try {
      await persistRadarBatch(this.env, {
        observedAt: new Date(now).toISOString(),
        sessionDate: clock.date,
        universeCount: totalCount,
        intervalSeconds,
        market,
        signals: latestSignals,
        alertedTickers: new Set(alertsToSend.map((signal) => signal.ticker)),
      });
    } catch (error) {
      supabaseError = error instanceof Error ? error.message : String(error);
      console.error(JSON.stringify({ type: 'supabase-radar-error', supabaseError }));
    }

    if (supabaseConfigured(this.env) && alertEvents.length) {
      try {
        await persistAlertEvents(this.env, alertEvents);
        alertEventsPersisted = true;
      } catch (error) {
        supabaseError = error instanceof Error ? error.message : String(error);
        console.error(JSON.stringify({ type: 'supabase-alert-event-error', supabaseError }));
      }
    }

    if (supabaseConfigured(this.env) && pendingEvaluation.outcomes.length) {
      try {
        await persistAlertOutcomes(this.env, pendingEvaluation.outcomes);
        outcomesPersisted = true;
      } catch (error) {
        supabaseError = error instanceof Error ? error.message : String(error);
        console.error(JSON.stringify({ type: 'supabase-outcome-error', supabaseError }));
      }
    }

    const retainedExistingPending = outcomesPersisted
      ? pendingEvaluation.afterCompletion
      : pendingEvaluation.updatedWithExtrema;

    const newPending = alertEventsPersisted ? candidateNewPending : [];

    const nextState: RadarState = {
      updatedAt: new Date(now).toISOString(),
      sessionDate: clock.date,
      lastRunAt: now,
      previous: nextPrevious,
      history: nextHistory,
      regimeHistory: nextRegimeHistory,
      alerts: nextAlerts,
      pendingEvaluations: [...retainedExistingPending, ...newPending],
      latestSignals,
      market,
      lastUniverseCount: totalCount,
    };

    await this.writeState(nextState);
    await this.ensureNextAlarm(now, cfg);

    return {
      skipped: false,
      atCairo: `${clock.date} ${clock.hms}`,
      intervalSeconds: Math.round(intervalSeconds * 10) / 10,
      universeCount: totalCount,
      market,
      signalCount: latestSignals.length,
      alertsSelected: alertsToSend.length,
      calibration: {
        pending: nextState.pendingEvaluations.length,
        outcomesEvaluated: pendingEvaluation.outcomes.length,
        eventTrackingEligible: candidateNewPending.length,
      },
      telegramConfigured: Boolean(this.env.TELEGRAM_BOT_TOKEN && this.env.TELEGRAM_CHAT_ID),
      supabaseConfigured: supabaseConfigured(this.env),
      telegramError,
      supabaseError,
      nextPollSeconds: cfg.pollSeconds,
      signals: latestSignals,
      leaders,
    };
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const cfg = getConfig(this.env);

    if (url.pathname === '/health') {
      const state = await this.readState();
      return json({
        ok: true,
        service: 'EGX Live Radar',
        now: new Date().toISOString(),
        cairo: cairoParts(Date.now(), cfg.timeZone),
        tradingSession: isTradingSession(Date.now(), cfg),
        pollSeconds: cfg.pollSeconds,
        telegramConfigured: Boolean(this.env.TELEGRAM_BOT_TOKEN && this.env.TELEGRAM_CHAT_ID),
        supabaseConfigured: supabaseConfigured(this.env),
        state: {
          updatedAt: state.updatedAt,
          sessionDate: state.sessionDate,
          lastUniverseCount: state.lastUniverseCount,
          signalCount: state.latestSignals.length,
          pendingEvaluations: state.pendingEvaluations?.length || 0,
          market: state.market,
        },
        nextAlarm: await this.ctx.storage.getAlarm(),
      });
    }

    if (url.pathname === '/latest') return json(await this.readState());

    if (url.pathname === '/reset' && request.method === 'POST') {
      await this.ctx.storage.deleteAll();
      await this.ctx.storage.deleteAlarm();
      return json({ ok: true, reset: true });
    }

    if (url.pathname === '/tick' && request.method === 'POST') {
      const force = url.searchParams.get('force') === '1';
      const notify = url.searchParams.get('notify') !== '0';
      const scheduledAt = Number(url.searchParams.get('scheduledAt'));
      const tickAt = Number.isFinite(scheduledAt) && scheduledAt > 0 ? scheduledAt : Date.now();

      try {
        return json(await this.run(tickAt, force, notify));
      } catch (error) {
        await this.ensureNextAlarm(Date.now(), cfg);
        return json({ error: error instanceof Error ? error.message : String(error) }, 502);
      }
    }

    return json({ error: 'not found' }, 404);
  }

  async alarm(): Promise<void> {
    const cfg = getConfig(this.env);
    try {
      const result = await this.run(Date.now(), false);
      console.log(JSON.stringify({ type: 'radar-alarm', ...result }));
    } catch (error) {
      console.error(JSON.stringify({
        type: 'radar-alarm-error',
        message: error instanceof Error ? error.message : String(error),
      }));
    } finally {
      await this.ensureNextAlarm(Date.now(), cfg);
    }
  }
}
