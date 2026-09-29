import type {
  AlertOutcome,
  LiveSignal,
  MarketContext,
  RadarEnv,
} from './types';

type PersistInput = {
  observedAt: string;
  sessionDate: string;
  universeCount: number;
  intervalSeconds: number;
  market: MarketContext;
  signals: LiveSignal[];
  alertedTickers: Set<string>;
};

export type AlertEventRecord = {
  eventId: string;
  observedAt: string;
  sessionDate: string;
  timeBucket: string;
  signal: LiveSignal;
};

export function supabaseConfigured(env: RadarEnv): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

async function request(
  env: RadarEnv,
  path: string,
  init: RequestInit,
): Promise<Response> {
  if (!supabaseConfigured(env)) {
    throw new Error('Supabase is not configured');
  }

  const key = env.SUPABASE_SERVICE_ROLE_KEY!.trim();
  const authHeaders: Record<string, string> = {
    apikey: key,
  };

  // New Supabase sb_secret_* keys are opaque API keys, not JWTs.
  // Sending them as Authorization: Bearer causes PostgREST to reject them
  // as an invalid JWT. Legacy service_role JWTs still need Authorization.
  if (!key.startsWith('sb_secret_')) {
    authHeaders.authorization = `Bearer ${key}`;
  }

  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...authHeaders,
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed: ${response.status} ${await response.text()}`);
  }

  return response;
}

async function postgrest(
  env: RadarEnv,
  table: string,
  body: unknown,
  query = '',
  prefer = 'return=minimal',
): Promise<void> {
  if (!supabaseConfigured(env)) return;

  await request(env, `${table}${query}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      prefer,
    },
    body: JSON.stringify(body),
  });
}

function signalRow(
  signal: LiveSignal,
  observedAt: string,
  sessionDate: string,
  alertSent: boolean,
) {
  return {
    observed_at: observedAt,
    session_date: sessionDate,
    ticker: signal.ticker,
    name: signal.name,
    sector: signal.sector,
    stage: signal.stage,
    score: signal.score,
    close: signal.close,
    change_pct: signal.changePct,
    interval_seconds: signal.intervalSeconds,
    price_delta_pct: signal.priceDeltaPct,
    volume_delta: signal.volumeDelta,
    interval_turnover: signal.intervalTurnover,
    volume_pace: signal.volumePace,
    rvol10: signal.rvol10,
    close_location: signal.closeLocation,
    hod_distance_pct: signal.hodDistancePct,
    new_hod: signal.newHod,
    velocity_1m_pct: signal.velocity1mPct,
    velocity_3m_pct: signal.velocity3mPct,
    relative_strength_pct: signal.relativeStrengthPct,
    positive_intervals_5: signal.positiveIntervals5,
    higher_low: signal.higherLow,
    compression_pct: signal.compressionPct,
    market_breadth_ratio: signal.marketBreadthRatio,
    market_median_change_pct: signal.marketMedianChangePct,
    market_regime: signal.marketRegime,
    reasons: signal.reasons,
    alert_sent: alertSent,
    source: 'tradingview',
  };
}

export async function persistRadarBatch(env: RadarEnv, input: PersistInput): Promise<void> {
  if (!supabaseConfigured(env)) return;

  const topScore = input.signals[0]?.score ?? null;

  await postgrest(env, 'live_radar_runs', {
    observed_at: input.observedAt,
    session_date: input.sessionDate,
    universe_count: input.universeCount,
    advancers: input.market.advancers,
    decliners: input.market.decliners,
    unchanged: input.market.unchanged,
    breadth_ratio: input.market.breadthRatio,
    median_change_pct: input.market.medianChangePct,
    signal_count: input.signals.length,
    top_score: topScore,
    interval_seconds: input.intervalSeconds,
    source: 'tradingview',
  });

  if (!input.signals.length) return;

  const rows = input.signals.map((signal) =>
    signalRow(signal, input.observedAt, input.sessionDate, input.alertedTickers.has(signal.ticker)),
  );

  await postgrest(env, 'live_radar_signals', rows);

  const latestRows = rows.map(({ alert_sent: _alertSent, ...row }) => ({
    ...row,
    updated_at: input.observedAt,
  }));

  await postgrest(
    env,
    'live_radar_latest',
    latestRows,
    '?on_conflict=ticker',
    'resolution=merge-duplicates,return=minimal',
  );
}

export async function persistAlertEvents(
  env: RadarEnv,
  events: AlertEventRecord[],
): Promise<void> {
  if (!supabaseConfigured(env) || !events.length) return;

  const rows = events.map(({ eventId, observedAt, sessionDate, timeBucket, signal }) => ({
    event_id: eventId,
    observed_at: observedAt,
    session_date: sessionDate,
    ticker: signal.ticker,
    name: signal.name,
    sector: signal.sector,
    stage: signal.stage,
    score: signal.score,
    entry_price: signal.close,
    change_pct: signal.changePct,
    volume_pace: signal.volumePace,
    rvol10: signal.rvol10,
    close_location: signal.closeLocation,
    hod_distance_pct: signal.hodDistancePct,
    new_hod: signal.newHod,
    velocity_1m_pct: signal.velocity1mPct,
    velocity_3m_pct: signal.velocity3mPct,
    relative_strength_pct: signal.relativeStrengthPct,
    positive_intervals_5: signal.positiveIntervals5,
    higher_low: signal.higherLow,
    compression_pct: signal.compressionPct,
    market_breadth_ratio: signal.marketBreadthRatio,
    market_median_change_pct: signal.marketMedianChangePct,
    market_regime: signal.marketRegime,
    time_bucket: timeBucket,
    reasons: signal.reasons,
    notification_selected: true,
    source: 'tradingview',
  }));

  await postgrest(
    env,
    'live_radar_alert_events',
    rows,
    '?on_conflict=event_id',
    'resolution=ignore-duplicates,return=minimal',
  );
}

export async function persistAlertOutcomes(
  env: RadarEnv,
  outcomes: AlertOutcome[],
): Promise<void> {
  if (!supabaseConfigured(env) || !outcomes.length) return;

  const rows = outcomes.map((outcome) => ({
    event_id: outcome.eventId,
    horizon_minutes: outcome.horizonMinutes,
    evaluated_at: outcome.evaluatedAt,
    price: outcome.price,
    forward_return_pct: outcome.forwardReturnPct,
    max_price: outcome.maxPrice,
    min_price: outcome.minPrice,
    mfe_pct: outcome.mfePct,
    mae_pct: outcome.maePct,
    hit_0_5_pct: outcome.hit05Pct,
    hit_1_pct: outcome.hit1Pct,
    hit_2_pct: outcome.hit2Pct,
    drawdown_0_5_pct: outcome.drawdown05Pct,
    drawdown_1_pct: outcome.drawdown1Pct,
    source: 'tradingview',
  }));

  await postgrest(
    env,
    'live_radar_alert_outcomes',
    rows,
    '?on_conflict=event_id,horizon_minutes',
    'resolution=merge-duplicates,return=minimal',
  );
}

export async function fetchCalibrationSummary(env: RadarEnv): Promise<unknown[]> {
  if (!supabaseConfigured(env)) return [];

  const response = await request(
    env,
    'live_radar_calibration_summary?select=*&order=horizon_minutes.asc,samples.desc&limit=250',
    {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
    },
  );

  return await response.json() as unknown[];
}
