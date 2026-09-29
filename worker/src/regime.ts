import type {
  LiveSignal,
  MarketContext,
  RegimeDailyPoint,
  RegimeMetrics,
  RegimePhase,
  ScannerRow,
} from './types';

const MAX_REGIME_SESSIONS = 12;
const STRONG_DAY_PCT = 8;
const EXPLOSIVE_DAY_PCT = 15;
const LIMIT_UP_LIKE_PCT = 18.5;

const clamp = (value: number, low = 0, high = 1) => Math.max(low, Math.min(high, value));

function pctDelta(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function priorReference(
  prior: RegimeDailyPoint[],
  sessionsAgo: number,
): RegimeDailyPoint | null {
  if (prior.length < sessionsAgo) return null;
  return prior[prior.length - sessionsAgo] || null;
}

function countAtLeast(changes: number[], threshold: number): number {
  return changes.filter((value) => value >= threshold).length;
}

function consecutiveAtLeast(changes: number[], threshold: number): number {
  let count = 0;
  for (let index = changes.length - 1; index >= 0; index -= 1) {
    if (changes[index] < threshold) break;
    count += 1;
  }
  return count;
}

export function updateRegimeHistory(
  history: RegimeDailyPoint[],
  currentDate: string,
  row: ScannerRow,
): RegimeDailyPoint[] {
  if (
    row.close === null
    || row.high === null
    || row.low === null
    || row.volume === null
  ) return history.slice(-MAX_REGIME_SESSIONS);

  const point: RegimeDailyPoint = {
    date: currentDate,
    close: row.close,
    high: row.high,
    low: row.low,
    volume: row.volume,
    changePct: row.changePct ?? 0,
    rvol10: row.rvol10 ?? 0,
  };

  const withoutToday = history.filter((item) => item.date !== currentDate);
  return [...withoutToday, point]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-MAX_REGIME_SESSIONS);
}

export function computeRegimeMetrics(
  history: RegimeDailyPoint[],
  currentDate: string,
  row: ScannerRow,
  market: MarketContext,
): RegimeMetrics {
  const prior = history
    .filter((item) => item.date < currentDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-MAX_REGIME_SESSIONS);

  const close = row.close ?? 0;
  const high = row.high ?? close;
  const low = row.low ?? close;
  const dailyChange = row.changePct ?? 0;
  const rvol10 = Math.max(0, row.rvol10 ?? 0);
  const relativeStrengthPct = dailyChange - market.medianChangePct;
  const closeLocation = row.closeLocation ?? 0.5;

  const ref3 = priorReference(prior, 3);
  const ref5 = priorReference(prior, 5);
  const ref10 = priorReference(prior, 10);

  const return3dPct = ref3 ? pctDelta(close, ref3.close) : null;
  const return5dPct = ref5 ? pctDelta(close, ref5.close) : null;
  const return10dPct = ref10 ? pctDelta(close, ref10.close) : null;

  const tenSessionWindow = [...prior.slice(-9), {
    date: currentDate,
    close,
    high,
    low,
    volume: row.volume ?? 0,
    changePct: dailyChange,
    rvol10,
  }];

  const lowest10 = tenSessionWindow.length
    ? Math.min(...tenSessionWindow.map((item) => item.low))
    : close;
  const priceMultiple10d = lowest10 > 0 ? high / lowest10 : null;

  const changes5 = [...prior.slice(-4).map((item) => item.changePct), dailyChange];
  const changes10 = [...prior.slice(-9).map((item) => item.changePct), dailyChange];

  const explosiveDays5 = countAtLeast(changes5, EXPLOSIVE_DAY_PCT);
  const limitUpLikeDays5 = countAtLeast(changes5, LIMIT_UP_LIKE_PCT);
  const strongDays10 = countAtLeast(changes10, STRONG_DAY_PCT);
  const consecutiveStrongDays = consecutiveAtLeast(changes10, STRONG_DAY_PCT);
  const consecutiveLimitUpLikeDays = consecutiveAtLeast(changes10, LIMIT_UP_LIKE_PCT);

  const priorHigh10 = prior.length
    ? Math.max(...prior.slice(-10).map((item) => item.high))
    : null;
  const fresh10dHigh = priorHigh10 !== null && high > priorHigh10 * 1.001;
  const previousSession = prior.at(-1) || null;
  const holdingAfterIgnition = Boolean(
    previousSession
    && previousSession.changePct >= STRONG_DAY_PCT
    && dailyChange > -5
    && close >= previousSession.close * 0.92
  );

  let score = 0;

  // Same-session ignition. This keeps the detector useful immediately after
  // deployment, before multi-session memory has matured.
  score += clamp((dailyChange - 3) / 17) * 18;
  score += clamp((rvol10 - 1) / 4) * 18;
  score += clamp(Math.max(0, relativeStrengthPct) / 8) * 6;
  score += clamp((closeLocation - 0.55) / 0.45) * 4;

  // Multi-session acceleration: the BIOC/TYCN signature is not simply one
  // green candle; it is repeated large closes plus compounding over 3-10 days.
  if (return3dPct !== null) score += clamp(Math.max(0, return3dPct) / 35) * 15;
  if (return5dPct !== null) score += clamp(Math.max(0, return5dPct) / 60) * 15;
  if (return10dPct !== null) score += clamp(Math.max(0, return10dPct) / 100) * 8;
  if (priceMultiple10d !== null) score += clamp((priceMultiple10d - 1) / 1.5) * 10;

  score += Math.min(explosiveDays5, 3) * 6;
  score += Math.min(limitUpLikeDays5, 3) * 4;
  score += Math.min(strongDays10, 4) * 2;
  score += Math.max(0, Math.min(consecutiveStrongDays - 1, 3)) * 4;
  score += Math.max(0, Math.min(consecutiveLimitUpLikeDays - 1, 2)) * 4;

  if (fresh10dHigh) score += 6;
  if (holdingAfterIgnition) score += 28;

  // A sharp red session can happen inside a mania regime, so this is a brake,
  // not a reset. That lets the radar remember a BIOC-style violent pullback.
  if (dailyChange <= -8) score -= clamp((-dailyChange - 8) / 12) * 12;

  score = Math.max(0, Math.min(100, round1(score)));

  const selfReinforcingEvidence =
    consecutiveStrongDays >= 3
    || consecutiveLimitUpLikeDays >= 2
    || explosiveDays5 >= 3
    || (return5dPct !== null && return5dPct >= 50)
    || (
      priceMultiple10d !== null
      && priceMultiple10d >= 1.8
      && return5dPct !== null
      && return5dPct >= 20
    );

  const acceleratingEvidence =
    dailyChange >= 8
    || explosiveDays5 >= 1
    || (return3dPct !== null && return3dPct >= 15)
    || (return5dPct !== null && return5dPct >= 20);

  const abnormalEvidence =
    dailyChange >= 5
    || rvol10 >= 2
    || (return5dPct !== null && return5dPct >= 12)
    || fresh10dHigh
    || holdingAfterIgnition;

  let phase: RegimePhase = 'NORMAL';
  if (score >= 84 && selfReinforcingEvidence) phase = 'SELF_REINFORCING';
  else if (score >= 66 && acceleratingEvidence) phase = 'ACCELERATING';
  else if (score >= 50 && abnormalEvidence) phase = 'ABNORMAL';

  const priorSessions = prior.length;
  const confidence = priorSessions >= 7
    ? 'MATURE'
    : priorSessions >= 3
      ? 'PARTIAL'
      : 'BOOTSTRAP';

  const reasons: string[] = [];
  if (dailyChange >= 8) reasons.push(`day +${dailyChange.toFixed(1)}%`);
  if (rvol10 >= 2) reasons.push(`RVOL10 ${rvol10.toFixed(1)}x`);
  if (return3dPct !== null && return3dPct >= 15) reasons.push(`3-session +${return3dPct.toFixed(1)}%`);
  if (return5dPct !== null && return5dPct >= 20) reasons.push(`5-session +${return5dPct.toFixed(1)}%`);
  if (return10dPct !== null && return10dPct >= 40) reasons.push(`10-session +${return10dPct.toFixed(1)}%`);
  if (explosiveDays5 >= 1) reasons.push(`${explosiveDays5} explosive day(s)/5`);
  if (limitUpLikeDays5 >= 1) reasons.push(`${limitUpLikeDays5} ~limit-up day(s)/5`);
  if (consecutiveStrongDays >= 2) reasons.push(`${consecutiveStrongDays} strong closes in a row`);
  if (priceMultiple10d !== null && priceMultiple10d >= 1.5) {
    reasons.push(`${priceMultiple10d.toFixed(2)}x from 10-session low`);
  }
  if (fresh10dHigh) reasons.push('fresh 10-session high');
  if (holdingAfterIgnition) reasons.push('holding after ignition day');

  return {
    phase,
    score,
    confidence,
    priorSessions,
    return3dPct: return3dPct === null ? null : round1(return3dPct),
    return5dPct: return5dPct === null ? null : round1(return5dPct),
    return10dPct: return10dPct === null ? null : round1(return10dPct),
    priceMultiple10d: priceMultiple10d === null ? null : Math.round(priceMultiple10d * 100) / 100,
    explosiveDays5,
    limitUpLikeDays5,
    strongDays10,
    consecutiveStrongDays,
    consecutiveLimitUpLikeDays,
    fresh10dHigh,
    reasons,
  };
}

export function attachRegime(signal: LiveSignal, regime: RegimeMetrics): LiveSignal {
  return {
    ...signal,
    regimePhase: regime.phase,
    regimeScore: regime.score,
    regimeConfidence: regime.confidence,
    regimePriorSessions: regime.priorSessions,
    regimeReturn3dPct: regime.return3dPct,
    regimeReturn5dPct: regime.return5dPct,
    regimeReturn10dPct: regime.return10dPct,
    regimePriceMultiple10d: regime.priceMultiple10d,
    regimeExplosiveDays5: regime.explosiveDays5,
    regimeLimitUpLikeDays5: regime.limitUpLikeDays5,
    regimeStrongDays10: regime.strongDays10,
    regimeConsecutiveStrongDays: regime.consecutiveStrongDays,
    regimeConsecutiveLimitUpLikeDays: regime.consecutiveLimitUpLikeDays,
    regimeFresh10dHigh: regime.fresh10dHigh,
    regimeReasons: regime.reasons,
  };
}
