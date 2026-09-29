import { fetchEgyptScanner } from './scanner';
import { buildSignal, toSnapshot } from './signal';
import { sendTelegramAlerts } from './telegram';
import type {
  AlertState,
  LiveSignal,
  RadarConfig,
  RadarEnv,
  RadarState,
  SignalStage,
} from './types';

const STATE_KEY = 'radar-state-v1';
const STAGE_RANK: Record<SignalStage, number> = {
  WATCH: 1,
  TRIGGERING: 2,
  BREAKOUT: 3,
};

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
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

function isTradingSession(epochMs: number, cfg: RadarConfig): boolean {
  const { weekday, hhmm } = cairoParts(epochMs, cfg.timeZone);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'].includes(weekday)
    && hhmm >= cfg.sessionStart
    && hhmm <= cfg.sessionEnd;
}

function emptyState(sessionDate = ''): RadarState {
  return {
    updatedAt: new Date(0).toISOString(),
    sessionDate,
    lastRunAt: 0,
    previous: {},
    alerts: {},
    latestSignals: [],
    lastUniverseCount: 0,
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
  return now - existing.lastAt >= cooldownMs && signal.score >= existing.lastScore + 4;
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
    return (await this.ctx.storage.get(STATE_KEY)) || emptyState();
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

  private async run(now: number, force = false) {
    const cfg = getConfig(this.env);

    if (!cfg.enabled && !force) {
      return { skipped: true, reason: 'RADAR_ENABLED=false' };
    }

    if (!force && !isTradingSession(now, cfg)) {
      return { skipped: true, reason: 'outside EGX session' };
    }

    let state = await this.readState();
    const clock = cairoParts(now, cfg.timeZone);

    if (state.sessionDate !== clock.date) {
      state = emptyState(clock.date);
    }

    const sinceLastMs = state.lastRunAt > 0 ? now - state.lastRunAt : Number.POSITIVE_INFINITY;
    const duplicateFloorMs = cfg.pollSeconds * 1000 * 0.55;

    if (!force && sinceLastMs < duplicateFloorMs) {
      await this.ensureNextAlarm(now, cfg);
      return {
        skipped: true,
        reason: 'duplicate tick',
        nextPollSeconds: cfg.pollSeconds,
      };
    }

    const { rows, totalCount } = await fetchEgyptScanner();

    const intervalSeconds = state.lastRunAt > 0
      ? clamp((now - state.lastRunAt) / 1000, 5, 90)
      : cfg.pollSeconds;

    const nextPrevious: RadarState['previous'] = {};
    const signals: LiveSignal[] = [];

    for (const row of rows) {
      const snapshot = toSnapshot(row);
      if (!snapshot) continue;
      nextPrevious[row.ticker] = snapshot;

      const previous = state.previous[row.ticker];
      if (!previous) continue;

      // TradingView daily volume resets at the first print of a new session.
      if (snapshot.volume < previous.volume) continue;

      const signal = buildSignal(row, previous, {
        intervalSeconds,
        minScore: cfg.minScore,
        triggerScore: cfg.triggerScore,
        minDailyTurnover: cfg.minDailyTurnover,
        minMinuteTurnover: cfg.minMinuteTurnover,
        minVolumeShares: cfg.minVolumeShares,
      });

      if (signal) signals.push(signal);
    }

    signals.sort((a, b) => b.score - a.score);
    const latestSignals = signals.slice(0, cfg.maxCandidates);

    const cooldownMs = cfg.cooldownMinutes * 60_000;
    const alertsToSend = latestSignals.filter((signal) =>
      shouldAlert(state.alerts[signal.ticker], signal, now, cooldownMs),
    );

    const nextAlerts = { ...state.alerts };
    for (const signal of alertsToSend) {
      nextAlerts[signal.ticker] = {
        stage: signal.stage,
        lastAt: now,
        lastScore: signal.score,
      };
    }

    const nextState: RadarState = {
      updatedAt: new Date(now).toISOString(),
      sessionDate: clock.date,
      lastRunAt: now,
      previous: nextPrevious,
      alerts: nextAlerts,
      latestSignals,
      lastUniverseCount: totalCount,
    };

    await this.writeState(nextState);

    let telegramError: string | null = null;
    if (alertsToSend.length) {
      try {
        await sendTelegramAlerts(this.env, alertsToSend);
      } catch (error) {
        telegramError = error instanceof Error ? error.message : String(error);
        console.error(JSON.stringify({ type: 'telegram-error', telegramError }));
      }
    }

    await this.ensureNextAlarm(now, cfg);

    return {
      skipped: false,
      atCairo: `${clock.date} ${clock.hms}`,
      intervalSeconds: Math.round(intervalSeconds * 10) / 10,
      universeCount: totalCount,
      signalCount: latestSignals.length,
      alertsSelected: alertsToSend.length,
      telegramConfigured: Boolean(this.env.TELEGRAM_BOT_TOKEN && this.env.TELEGRAM_CHAT_ID),
      telegramError,
      nextPollSeconds: cfg.pollSeconds,
      signals: latestSignals,
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
        state: {
          updatedAt: state.updatedAt,
          sessionDate: state.sessionDate,
          lastUniverseCount: state.lastUniverseCount,
          signalCount: state.latestSignals.length,
        },
        nextAlarm: await this.ctx.storage.getAlarm(),
      });
    }

    if (url.pathname === '/latest') {
      return json(await this.readState());
    }

    if (url.pathname === '/reset' && request.method === 'POST') {
      await this.ctx.storage.deleteAll();
      await this.ctx.storage.deleteAlarm();
      return json({ ok: true, reset: true });
    }

    if (url.pathname === '/tick' && request.method === 'POST') {
      const force = url.searchParams.get('force') === '1';
      const scheduledAt = Number(url.searchParams.get('scheduledAt'));
      const now = Number.isFinite(scheduledAt) && scheduledAt > 0 ? scheduledAt : Date.now();

      try {
        return json(await this.run(now, force));
      } catch (error) {
        await this.ensureNextAlarm(Date.now(), cfg);
        return json({
          error: error instanceof Error ? error.message : String(error),
        }, 502);
      }
    }

    return json({ error: 'not found' }, 404);
  }

  async alarm(): Promise<void> {
    const cfg = getConfig(this.env);
    const now = Date.now();

    try {
      const result = await this.run(now, false);
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
