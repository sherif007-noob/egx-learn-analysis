import type {
  DeepMetrics,
  LiveSignal,
  MarketContext,
  MinimalSnapshot,
  RegimeMetrics,
  ScannerRow,
} from './types';

const clamp = (value: number, low = 0, high = 1) => Math.max(low, Math.min(high, value));

function pctDelta(current: number, previous: number): number {
  if (!Number.isFinite(previous) || previous <= 0) return 0;
  return ((current - previous) / previous) * 100;
}

export function toSnapshot(row: ScannerRow): MinimalSnapshot | null {
  if (
    row.close === null ||
    row.volume === null ||
    row.high === null ||
    row.turnover === null
  ) return null;

  return {
    close: row.close,
    volume: row.volume,
    high: row.high,
    turnover: row.turnover,
    changePct: row.changePct ?? 0,
    rvol10: row.rvol10 ?? 0,
    closeLocation: row.closeLocation ?? 0.5,
  };
}

export function buildSignal(
  row: ScannerRow,
  previous: MinimalSnapshot,
  deep: DeepMetrics,
  market: MarketContext,
  config: {
    intervalSeconds: number;
    minScore: number;
    triggerScore: number;
    minDailyTurnover: number;
    minMinuteTurnover: number;
    minVolumeShares: number;
  },
): LiveSignal | null {
  if (
    row.close === null ||
    row.volume === null ||
    row.high === null ||
    row.turnover === null ||
    row.avgVol10 === null
  ) return null;

  if (row.turnover < config.minDailyTurnover || row.volume < config.minVolumeShares) {
    return null;
  }

  const intervalSeconds = Math.max(5, config.intervalSeconds);
  const volumeDelta = Math.max(0, row.volume - previous.volume);
  const intervalTurnover = volumeDelta * row.close;
  const intervalTurnoverFloor = config.minMinuteTurnover * (intervalSeconds / 60);
  if (intervalTurnover < intervalTurnoverFloor) return null;

  const priceDeltaPct = pctDelta(row.close, previous.close);
  const priceVelocityPerMinute = priceDeltaPct * (60 / intervalSeconds);

  const expectedMinuteVolume = Math.max(1, row.avgVol10 / 270);
  const expectedIntervalVolume = expectedMinuteVolume * (intervalSeconds / 60);
  const volumePace = volumeDelta / Math.max(1, expectedIntervalVolume);

  const closeLocation = row.closeLocation ?? 0.5;
  const hodDistancePct = row.high > 0 ? ((row.high - row.close) / row.high) * 100 : 100;
  const newHod = row.high > previous.high + Math.max(0.001, previous.high * 0.00005);
  const dailyChange = row.changePct ?? 0;
  const rvol10 = row.rvol10 ?? 0;

  const liquidityScore = clamp((Math.log10(Math.max(row.turnover, 1)) - 7) / 2) * 18;
  const priceVelocityScore = clamp(Math.max(0, priceVelocityPerMinute) / 0.8) * 18;
  const paceScore = clamp((volumePace - 0.8) / 3.2) * 18;
  const locationScore = clamp((closeLocation - 0.5) / 0.5) * 10;
  const hodScore = clamp((0.8 - hodDistancePct) / 0.8) * 8;
  const dailyMomentumScore = clamp(Math.max(0, dailyChange) / 8) * 6;
  const rvolScore = clamp((rvol10 - 0.8) / 2.2) * 6;

  const velocity1mScore = clamp(Math.max(0, deep.velocity1mPct) / 1.2) * 6;
  const velocity3mScore = clamp(Math.max(0, deep.velocity3mPct) / 2.2) * 4;
  const relativeStrengthScore = clamp(Math.max(0, deep.relativeStrengthPct) / 3) * 5;
  const persistenceScore = clamp(deep.positiveIntervals5 / 4) * 3;

  let score = liquidityScore
    + priceVelocityScore
    + paceScore
    + locationScore
    + hodScore
    + dailyMomentumScore
    + rvolScore
    + velocity1mScore
    + velocity3mScore
    + relativeStrengthScore
    + persistenceScore;

  if (deep.higherLow) score += 3;
  if (newHod && priceVelocityPerMinute > 0) score += 5;
  if (newHod && deep.compressionPct <= 0.75) score += 3;

  if (market.regime === 'RISK_ON') {
    score += 2;
  } else if (market.regime === 'RISK_OFF') {
    score += deep.relativeStrengthPct >= 2 ? 2 : -5;
  }

  if (priceVelocityPerMinute < -0.15) score -= 12;
  if (deep.velocity1mPct < -0.25) score -= 8;

  score = Math.max(0, Math.min(100, Math.round(score * 10) / 10));

  let stage: LiveSignal['stage'] | null = null;
  if (
    score >= config.triggerScore &&
    priceVelocityPerMinute > 0 &&
    volumePace >= 1.5 &&
    (newHod || hodDistancePct <= 0.35)
  ) {
    stage = newHod && volumePace >= 2 ? 'BREAKOUT' : 'TRIGGERING';
  } else if (
    score >= config.minScore &&
    priceVelocityPerMinute >= 0 &&
    closeLocation >= 0.6 &&
    deep.velocity1mPct >= -0.05
  ) {
    stage = 'WATCH';
  }

  if (!stage) return null;

  const reasons: string[] = [];
  if (volumePace >= 2) reasons.push(`volume pace ${volumePace.toFixed(1)}x`);
  else if (volumePace >= 1.3) reasons.push(`volume pace ${volumePace.toFixed(1)}x`);
  if (priceVelocityPerMinute >= 0.15) reasons.push(`velocity +${priceVelocityPerMinute.toFixed(2)}%/min`);
  if (deep.velocity1mPct >= 0.35) reasons.push(`1m +${deep.velocity1mPct.toFixed(2)}%`);
  if (deep.velocity3mPct >= 0.8) reasons.push(`3m +${deep.velocity3mPct.toFixed(2)}%`);
  if (deep.relativeStrengthPct >= 1.5) reasons.push(`RS +${deep.relativeStrengthPct.toFixed(2)}pp vs market`);
  if (deep.positiveIntervals5 >= 4) reasons.push(`${deep.positiveIntervals5}/5 positive intervals`);
  if (deep.higherLow) reasons.push('micro higher-low');
  if (deep.compressionPct <= 0.6) reasons.push(`2m compression ${deep.compressionPct.toFixed(2)}%`);
  if (newHod) reasons.push('new HOD');
  else if (hodDistancePct <= 0.35) reasons.push(`${hodDistancePct.toFixed(2)}% from HOD`);
  if (closeLocation >= 0.8) reasons.push('upper 20% of day range');
  if (rvol10 >= 1.5) reasons.push(`RVOL10 ${rvol10.toFixed(2)}x`);
  if (market.regime === 'RISK_OFF' && deep.relativeStrengthPct >= 2) {
    reasons.push('holding strength in weak tape');
  }

  return {
    ticker: row.ticker,
    name: row.name,
    sector: row.sector,
    stage,
    score,
    close: row.close,
    changePct: dailyChange,
    intervalSeconds,
    priceDeltaPct,
    volumeDelta,
    intervalTurnover,
    volumePace,
    rvol10,
    closeLocation,
    hodDistancePct,
    newHod,
    velocity1mPct: deep.velocity1mPct,
    velocity3mPct: deep.velocity3mPct,
    relativeStrengthPct: deep.relativeStrengthPct,
    positiveIntervals5: deep.positiveIntervals5,
    higherLow: deep.higherLow,
    compressionPct: deep.compressionPct,
    marketBreadthRatio: market.breadthRatio,
    marketMedianChangePct: market.medianChangePct,
    marketRegime: market.regime,
    reasons,
  };
}


export function buildSessionWatch(
  row: ScannerRow,
  deep: DeepMetrics,
  market: MarketContext,
  config: {
    intervalSeconds: number;
    minScore: number;
    minDailyTurnover: number;
    minVolumeShares: number;
  },
): LiveSignal | null {
  if (
    row.close === null ||
    row.volume === null ||
    row.high === null ||
    row.turnover === null
  ) return null;

  if (row.turnover < config.minDailyTurnover || row.volume < config.minVolumeShares) {
    return null;
  }

  const dailyChange = row.changePct ?? 0;
  const rvol10 = row.rvol10 ?? 0;
  const closeLocation = row.closeLocation ?? 0.5;
  const hodDistancePct = row.high > 0 ? ((row.high - row.close) / row.high) * 100 : 100;
  const relativeStrengthPct = deep.relativeStrengthPct;

  // Session discovery is intentionally broader than the live trigger lane.
  // It should surface a strong liquid name even while it is consolidating,
  // so the trader can open Depth/Trades before the next acceleration.
  if (dailyChange < 1.5) return null;
  if (relativeStrengthPct < 1.0) return null;
  if (closeLocation < 0.35 && hodDistancePct > 5) return null;

  const liquidityScore = clamp((Math.log10(Math.max(row.turnover, 1)) - 7) / 2) * 20;
  const momentumScore = clamp(dailyChange / 10) * 26;
  const rvolScore = clamp((rvol10 - 0.7) / 2.3) * 16;
  const locationScore = clamp((closeLocation - 0.25) / 0.75) * 10;
  const hodScore = clamp((5 - hodDistancePct) / 5) * 10;
  const rsScore = clamp(relativeStrengthPct / 5) * 15;

  let score = liquidityScore + momentumScore + rvolScore + locationScore + hodScore + rsScore;
  if (market.regime === 'RISK_ON') score += 2;
  if (dailyChange >= 7) score += 4;
  if (rvol10 >= 2) score += 3;

  score = Math.max(0, Math.min(100, Math.round(score * 10) / 10));
  const watchFloor = Math.max(62, config.minScore - 8);
  if (score < watchFloor) return null;

  const reasons = ['session leader'];
  if (dailyChange >= 3) reasons.push(`day +${dailyChange.toFixed(2)}%`);
  if (relativeStrengthPct >= 1.5) reasons.push(`RS +${relativeStrengthPct.toFixed(2)}pp vs market`);
  if (rvol10 >= 1.3) reasons.push(`RVOL10 ${rvol10.toFixed(2)}x`);
  if (hodDistancePct <= 2) reasons.push(`${hodDistancePct.toFixed(2)}% from HOD`);
  if (closeLocation >= 0.7) reasons.push('holding upper 30% of day range');

  return {
    ticker: row.ticker,
    name: row.name,
    sector: row.sector,
    stage: 'WATCH',
    score,
    close: row.close,
    changePct: dailyChange,
    intervalSeconds: Math.max(5, config.intervalSeconds),
    priceDeltaPct: 0,
    volumeDelta: 0,
    intervalTurnover: 0,
    volumePace: 0,
    rvol10,
    closeLocation,
    hodDistancePct,
    newHod: false,
    velocity1mPct: deep.velocity1mPct,
    velocity3mPct: deep.velocity3mPct,
    relativeStrengthPct,
    positiveIntervals5: deep.positiveIntervals5,
    higherLow: deep.higherLow,
    compressionPct: deep.compressionPct,
    marketBreadthRatio: market.breadthRatio,
    marketMedianChangePct: market.medianChangePct,
    marketRegime: market.regime,
    reasons,
  };
}


export function buildRegimeWatch(
  row: ScannerRow,
  deep: DeepMetrics,
  market: MarketContext,
  regime: RegimeMetrics,
  config: {
    intervalSeconds: number;
    minDailyTurnover: number;
    minVolumeShares: number;
  },
): LiveSignal | null {
  if (regime.phase === 'NORMAL') return null;

  if (
    row.close === null
    || row.volume === null
    || row.high === null
    || row.turnover === null
  ) return null;

  // The regime lane is deliberately a discovery lane, not an execution lane.
  // It can surface a BIOC/TYCN-style transition even if the latest 20-second
  // interval is quiet, but it still requires tradable liquidity.
  if (
    row.turnover < config.minDailyTurnover
    || row.volume < config.minVolumeShares
  ) return null;

  const dailyChange = row.changePct ?? 0;
  const rvol10 = row.rvol10 ?? 0;
  const closeLocation = row.closeLocation ?? 0.5;
  const hodDistancePct = row.high > 0 ? ((row.high - row.close) / row.high) * 100 : 100;

  if (regime.phase === 'ABNORMAL' && dailyChange < 3 && rvol10 < 2) return null;
  if (closeLocation < 0.25 && dailyChange < 8) return null;

  const baseScore = regime.phase === 'SELF_REINFORCING'
    ? Math.max(82, regime.score)
    : regime.phase === 'ACCELERATING'
      ? Math.max(72, regime.score)
      : Math.max(64, regime.score);

  const reasons = [
    `regime ${regime.phase.toLowerCase().replace(/_/g, ' ')} ${regime.score.toFixed(1)}`,
    ...regime.reasons,
  ];

  if (deep.relativeStrengthPct >= 1.5) {
    reasons.push(`RS +${deep.relativeStrengthPct.toFixed(2)}pp vs market`);
  }

  return {
    ticker: row.ticker,
    name: row.name,
    sector: row.sector,
    stage: 'WATCH',
    score: Math.min(100, Math.round(baseScore * 10) / 10),
    close: row.close,
    changePct: dailyChange,
    intervalSeconds: Math.max(5, config.intervalSeconds),
    priceDeltaPct: 0,
    volumeDelta: 0,
    intervalTurnover: 0,
    volumePace: 0,
    rvol10,
    closeLocation,
    hodDistancePct,
    newHod: regime.fresh10dHigh,
    velocity1mPct: deep.velocity1mPct,
    velocity3mPct: deep.velocity3mPct,
    relativeStrengthPct: deep.relativeStrengthPct,
    positiveIntervals5: deep.positiveIntervals5,
    higherLow: deep.higherLow,
    compressionPct: deep.compressionPct,
    marketBreadthRatio: market.breadthRatio,
    marketMedianChangePct: market.medianChangePct,
    marketRegime: market.regime,
    reasons,
  };
}
