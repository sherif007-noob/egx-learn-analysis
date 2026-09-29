import type { LiveSignal, MinimalSnapshot, ScannerRow } from './types';

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
  config: {
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

  const volumeDelta = Math.max(0, row.volume - previous.volume);
  const minuteTurnover = volumeDelta * row.close;
  if (minuteTurnover < config.minMinuteTurnover) return null;

  const priceDelta1mPct = pctDelta(row.close, previous.close);
  const expectedMinuteVolume = Math.max(1, row.avgVol10 / 270);
  const minuteVolumePace = volumeDelta / expectedMinuteVolume;
  const closeLocation = row.closeLocation ?? 0.5;
  const hodDistancePct = row.high > 0 ? ((row.high - row.close) / row.high) * 100 : 100;
  const newHod = row.high > previous.high + Math.max(0.001, previous.high * 0.00005);
  const dailyChange = row.changePct ?? 0;
  const rvol10 = row.rvol10 ?? 0;

  const liquidityScore = clamp((Math.log10(Math.max(row.turnover, 1)) - 7) / 2) * 20;
  const priceVelocityScore = clamp(Math.max(0, priceDelta1mPct) / 0.8) * 22;
  const paceScore = clamp((minuteVolumePace - 0.8) / 3.2) * 22;
  const locationScore = clamp((closeLocation - 0.5) / 0.5) * 12;
  const hodScore = clamp((0.8 - hodDistancePct) / 0.8) * 10;
  const dailyMomentumScore = clamp(Math.max(0, dailyChange) / 8) * 7;
  const rvolScore = clamp((rvol10 - 0.8) / 2.2) * 7;

  let score = liquidityScore
    + priceVelocityScore
    + paceScore
    + locationScore
    + hodScore
    + dailyMomentumScore
    + rvolScore;

  if (newHod && priceDelta1mPct > 0) score += 5;
  if (priceDelta1mPct < -0.15) score -= 12;
  score = Math.max(0, Math.min(100, Math.round(score * 10) / 10));

  let stage: LiveSignal['stage'] | null = null;
  if (
    score >= config.triggerScore &&
    priceDelta1mPct > 0 &&
    minuteVolumePace >= 1.5 &&
    (newHod || hodDistancePct <= 0.35)
  ) {
    stage = newHod && minuteVolumePace >= 2 ? 'BREAKOUT' : 'TRIGGERING';
  } else if (
    score >= config.minScore &&
    priceDelta1mPct >= 0 &&
    closeLocation >= 0.6
  ) {
    stage = 'WATCH';
  }

  if (!stage) return null;

  const reasons: string[] = [];
  if (minuteVolumePace >= 2) reasons.push(`1m volume pace ${minuteVolumePace.toFixed(1)}x`);
  else if (minuteVolumePace >= 1.3) reasons.push(`1m volume pace ${minuteVolumePace.toFixed(1)}x`);
  if (priceDelta1mPct >= 0.15) reasons.push(`price +${priceDelta1mPct.toFixed(2)}%/min`);
  if (newHod) reasons.push('new HOD');
  else if (hodDistancePct <= 0.35) reasons.push(`${hodDistancePct.toFixed(2)}% from HOD`);
  if (closeLocation >= 0.8) reasons.push('upper 20% of day range');
  if (rvol10 >= 1.5) reasons.push(`RVOL10 ${rvol10.toFixed(2)}x`);

  return {
    ticker: row.ticker,
    name: row.name,
    stage,
    score,
    close: row.close,
    changePct: dailyChange,
    priceDelta1mPct,
    volumeDelta1m: volumeDelta,
    minuteTurnover,
    minuteVolumePace,
    rvol10,
    closeLocation,
    hodDistancePct,
    newHod,
    reasons,
  };
}
