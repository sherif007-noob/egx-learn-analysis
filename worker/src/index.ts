import { fetchEgyptScanner } from './scanner';
import { buildSignal, toSnapshot } from './signal';
import { sendTelegramAlerts } from './telegram';
import type { AlertState, LiveSignal, RadarEnv, RadarState, SignalStage } from './types';

const STATE_KEY = 'radar:state:v1';
const STAGE_RANK: Record<SignalStage, number> = {
  WATCH: 1,
  TRIGGERING: 2,
  BREAKOUT: 3,
};

let memoryState: RadarState | null = null;

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function config(env: RadarEnv) {
  return {
    enabled: String(env.RADAR_ENABLED ?? 'true').toLowerCase() !== 'false',
    timeZone: env.CAIRO_TZ || 'Africa/Cairo',
    sessionStart: env.SESSION_START || '10:00',
    sessionEnd: env.SESSION_END || '14:30',
    minScore: num(env.MIN_SCORE, 70),
    triggerScore: num(env.TRIGGER_SCORE, 83),
    cooldownMinutes: num(env.ALERT_COOLDOWN_MINUTES, 8),
    maxCandidates: Math.max(1, Math.trunc(num(env.MAX_CANDIDATES, 15))),
    minDailyTurnover: num(env.MIN_DAILY_TURNOVER_EGP, 8_000_000),
    minMinuteTurnover: num(env.MIN_MINUTE_TURNOVER_EGP, 120_000),
    minVolumeShares: num(env.MIN_VOLUME_SHARES, 100_000),
  };
}

function emptyState(): RadarState {
  return {
    updatedAt: new Date(0).toISOString(),
    previous: {},
    alerts: {},
    latestSignals: [],
    lastUniverseCount: 0,
  };
}

async function loadState(env: RadarEnv): Promise<RadarState> {
  if (env.LIVE_RADAR_STATE) {
    const stored = await env.LIVE_RADAR_STATE.get(STATE_KEY, { type: 'json' });
    if (stored && typeof stored === 'object') return stored as RadarState;
  }
  return memoryState || emptyState();
}

async function saveState(env: RadarEnv, state: RadarState): Promise<void> {
  memoryState = state;
  if (env.LIVE_RADAR_STATE) {
    await env.LIVE_RADAR_STATE.put(STATE_KEY, JSON.stringify(state), {
      expirationTtl: 60 * 60 * 24 * 7,
    });
  }
}

function cairoClock(epochMs: number, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(new Date(epochMs));
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return {
    weekday: get('weekday'),
    hhmm: `${get('hour')}:${get('minute')}`,
  };
}

function isTradingSession(epochMs: number, env: RadarEnv): boolean {
  const cfg = config(env);
  const { weekday, hhmm } = cairoClock(epochMs, cfg.timeZone);
  const openDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'].includes(weekday);
  return openDay && hhmm >= cfg.sessionStart && hhmm <= cfg.sessionEnd;
}

function shouldAlert(
  existing: AlertState | undefined,
  signal: LiveSignal,
  now: number,
  cooldownMs: number,
): boolean {
  if (!existing) return true;
  if (STAGE_RANK[signal.stage] > STAGE_RANK[existing.stage]) return true;
  if (now - existing.lastAt >= cooldownMs && signal.score >= existing.lastScore + 4) return true;
  return false;
}

async function runRadar(env: RadarEnv, now = Date.now(), force = false) {
  const cfg = config(env);
  if (!cfg.enabled && !force) {
    return { skipped: true, reason: 'RADAR_ENABLED=false' };
  }
  if (!force && !isTradingSession(now, env)) {
    return { skipped: true, reason: 'outside EGX session' };
  }

  const state = await loadState(env);
  const { rows, totalCount } = await fetchEgyptScanner();

  const nextPrevious: RadarState['previous'] = {};
  const signals: LiveSignal[] = [];

  for (const row of rows) {
    const snapshot = toSnapshot(row);
    if (!snapshot) continue;
    nextPrevious[row.ticker] = snapshot;

    const previous = state.previous[row.ticker];
    if (!previous) continue;
    if (snapshot.volume < previous.volume) continue;

    const signal = buildSignal(row, previous, {
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
    previous: nextPrevious,
    alerts: nextAlerts,
    latestSignals,
    lastUniverseCount: totalCount,
  };

  await saveState(env, nextState);

  if (alertsToSend.length) {
    await sendTelegramAlerts(env, alertsToSend);
  }

  return {
    skipped: false,
    universeCount: totalCount,
    signalCount: latestSignals.length,
    alertsSent: alertsToSend.length,
    signals: latestSignals,
    statePersistence: env.LIVE_RADAR_STATE ? 'kv' : 'memory-fallback',
  };
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

function authorized(request: Request, env: RadarEnv): boolean {
  if (!env.ADMIN_TOKEN) return true;
  const url = new URL(request.url);
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : url.searchParams.get('token');
  return token === env.ADMIN_TOKEN;
}

export default {
  async fetch(request: Request, env: RadarEnv): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/health') {
      const cfg = config(env);
      return json({
        ok: true,
        service: 'EGX Live Radar',
        now: new Date().toISOString(),
        cairo: cairoClock(Date.now(), cfg.timeZone),
        tradingSession: isTradingSession(Date.now(), env),
        stateBinding: Boolean(env.LIVE_RADAR_STATE),
        telegramConfigured: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID),
      });
    }

    if (!authorized(request, env)) {
      return json({ error: 'unauthorized' }, 401);
    }

    if (url.pathname === '/api/latest' && request.method === 'GET') {
      return json(await loadState(env));
    }

    if (url.pathname === '/api/scan' && (request.method === 'GET' || request.method === 'POST')) {
      const force = url.searchParams.get('force') === '1';
      try {
        return json(await runRadar(env, Date.now(), force));
      } catch (error) {
        return json({
          error: error instanceof Error ? error.message : String(error),
        }, 502);
      }
    }

    if (url.pathname === '/api/reset' && request.method === 'POST') {
      memoryState = null;
      if (env.LIVE_RADAR_STATE) await env.LIVE_RADAR_STATE.delete(STATE_KEY);
      return json({ ok: true, reset: true });
    }

    return json({ error: 'not found' }, 404);
  },

  async scheduled(controller: { scheduledTime: number }, env: RadarEnv, ctx: { waitUntil(promise: Promise<unknown>): void }) {
    ctx.waitUntil(
      runRadar(env, controller.scheduledTime)
        .then((result) => {
          console.log(JSON.stringify({ type: 'radar-run', ...result }));
        })
        .catch((error) => {
          console.error(JSON.stringify({
            type: 'radar-error',
            message: error instanceof Error ? error.message : String(error),
          }));
        }),
    );
  },
};
