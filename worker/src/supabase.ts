import type { LiveSignal, MarketContext, RadarEnv } from './types';

type PersistInput = {
  observedAt: string;
  sessionDate: string;
  universeCount: number;
  intervalSeconds: number;
  market: MarketContext;
  signals: LiveSignal[];
  alertedTickers: Set<string>;
};

function configured(env: RadarEnv): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

async function postgrest(
  env: RadarEnv,
  table: string,
  body: unknown,
  query = '',
  prefer = 'return=minimal',
): Promise<void> {
  if (!configured(env)) return;

  const url = `${env.SUPABASE_URL}/rest/v1/${table}${query}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY!,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
      prefer,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Supabase ${table} failed: ${response.status} ${await response.text()}`);
  }
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
  if (!configured(env)) return;

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
