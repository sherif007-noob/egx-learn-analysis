import assert from 'node:assert/strict';
import { computeRegimeMetrics, updateRegimeHistory } from '../worker/src/regime';
import type { MarketContext, RegimeDailyPoint, RegimePhase, ScannerRow } from '../worker/src/types';

type Fixture = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const market: MarketContext = {
  advancers: 100,
  decliners: 100,
  unchanged: 0,
  breadthRatio: 0.5,
  medianChangePct: 0,
  regime: 'MIXED',
};

function rowFromFixture(
  ticker: string,
  current: Fixture,
  previous: Fixture | null,
  trailing: Fixture[],
): ScannerRow {
  const changePct = previous
    ? ((current.close - previous.close) / previous.close) * 100
    : 0;
  const avgVol = trailing.length
    ? trailing.reduce((sum, item) => sum + item.volume, 0) / trailing.length
    : current.volume;
  const rvol10 = current.volume / Math.max(1, avgVol);
  const closeLocation = current.high > current.low
    ? (current.close - current.low) / (current.high - current.low)
    : 1;

  return {
    symbol: `EGX:${ticker}`,
    ticker,
    name: ticker,
    close: current.close,
    changePct,
    volume: current.volume,
    avgVol10: avgVol,
    rvol10,
    high: current.high,
    low: current.low,
    turnover: current.close * current.volume,
    closeLocation,
    sector: '',
  };
}

function runFixture(ticker: string, bars: Fixture[]) {
  let history: RegimeDailyPoint[] = [];
  const phases: Array<{ date: string; phase: RegimePhase; score: number }> = [];

  bars.forEach((bar, index) => {
    const previous = index > 0 ? bars[index - 1] : null;
    const trailing = bars.slice(Math.max(0, index - 10), index);
    const row = rowFromFixture(ticker, bar, previous, trailing);
    const metrics = computeRegimeMetrics(history, bar.date, row, market);
    phases.push({ date: bar.date, phase: metrics.phase, score: metrics.score });
    history = updateRegimeHistory(history, bar.date, row);
  });

  return phases;
}

function firstDateAtLeast(
  phases: ReturnType<typeof runFixture>,
  target: RegimePhase,
): string | null {
  const rank: Record<RegimePhase, number> = {
    NORMAL: 0,
    ABNORMAL: 1,
    ACCELERATING: 2,
    SELF_REINFORCING: 3,
  };
  return phases.find((item) => rank[item.phase] >= rank[target])?.date || null;
}

const bioc: Fixture[] = [
  { date: '2026-07-01', open: 69.22, high: 71.78, low: 69.10, close: 71.48, volume: 28729 },
  { date: '2026-07-05', open: 71.48, high: 72.98, low: 70.03, close: 70.57, volume: 37879 },
  { date: '2026-07-06', open: 70.57, high: 73.11, low: 70.57, close: 72.09, volume: 32590 },
  { date: '2026-07-07', open: 72.09, high: 72.50, low: 71.90, close: 72.02, volume: 21381 },
  { date: '2026-07-08', open: 72.02, high: 76.95, low: 71.60, close: 73.24, volume: 212691 },
  { date: '2026-07-09', open: 73.24, high: 75.49, low: 73.24, close: 73.60, volume: 55573 },
  { date: '2026-07-12', open: 73.60, high: 74.70, low: 73.50, close: 73.60, volume: 27766 },
  { date: '2026-07-13', open: 73.60, high: 75.46, low: 73.15, close: 74.79, volume: 62455 },
  { date: '2026-07-14', open: 74.79, high: 74.79, low: 73.00, close: 73.85, volume: 35955 },
  { date: '2026-07-15', open: 73.41, high: 88.09, low: 73.23, close: 88.09, volume: 570282 },
  { date: '2026-07-16', open: 88.09, high: 105.70, low: 88.09, close: 105.70, volume: 314307 },
  { date: '2026-07-19', open: 105.70, high: 126.84, low: 105.70, close: 126.84, volume: 1576204 },
];

const tycn: Fixture[] = [
  { date: '2026-05-24', open: 14.25, high: 14.50, low: 14.00, close: 14.07, volume: 497817 },
  { date: '2026-05-25', open: 14.07, high: 14.65, low: 14.02, close: 14.05, volume: 1165222 },
  { date: '2026-06-01', open: 14.05, high: 14.40, low: 14.05, close: 14.14, volume: 504557 },
  { date: '2026-06-02', open: 14.14, high: 14.31, low: 14.10, close: 14.13, volume: 523659 },
  { date: '2026-06-03', open: 14.13, high: 14.27, low: 14.02, close: 14.02, volume: 354764 },
  { date: '2026-06-04', open: 14.02, high: 14.12, low: 13.82, close: 14.05, volume: 401344 },
  { date: '2026-06-07', open: 14.05, high: 15.70, low: 14.00, close: 15.70, volume: 4049363 },
  { date: '2026-06-08', open: 15.70, high: 16.04, low: 15.26, close: 15.52, volume: 2526812 },
  { date: '2026-06-09', open: 15.52, high: 18.62, low: 15.16, close: 18.62, volume: 7228368 },
  { date: '2026-06-10', open: 18.62, high: 21.99, low: 18.25, close: 19.75, volume: 8523731 },
  { date: '2026-06-11', open: 19.75, high: 22.80, low: 18.13, close: 21.65, volume: 6615984 },
  { date: '2026-06-14', open: 21.65, high: 24.30, low: 21.65, close: 23.96, volume: 5776379 },
  { date: '2026-06-15', open: 23.96, high: 28.75, low: 23.96, close: 28.75, volume: 7034004 },
  { date: '2026-06-16', open: 28.75, high: 34.50, low: 28.75, close: 34.50, volume: 7939208 },
  { date: '2026-06-17', open: 34.50, high: 41.40, low: 34.50, close: 41.40, volume: 8214676 },
];

const biocPhases = runFixture('BIOC', bioc);
const tycnPhases = runFixture('TYCN', tycn);

const biocAccelerating = firstDateAtLeast(biocPhases, 'ACCELERATING');
const biocSelf = firstDateAtLeast(biocPhases, 'SELF_REINFORCING');
const tycnAbnormal = firstDateAtLeast(tycnPhases, 'ABNORMAL');
const tycnAccelerating = firstDateAtLeast(tycnPhases, 'ACCELERATING');
const tycnSelf = firstDateAtLeast(tycnPhases, 'SELF_REINFORCING');

assert.ok(biocAccelerating && biocAccelerating <= '2026-07-15', `BIOC acceleration detected too late: ${biocAccelerating}`);
assert.ok(biocSelf && biocSelf <= '2026-07-19', `BIOC self-reinforcing detected too late: ${biocSelf}`);
assert.ok(tycnAbnormal && tycnAbnormal <= '2026-06-07', `TYCN abnormal regime detected too late: ${tycnAbnormal}`);
assert.ok(tycnAccelerating && tycnAccelerating <= '2026-06-09', `TYCN acceleration detected too late: ${tycnAccelerating}`);
assert.ok(tycnSelf && tycnSelf <= '2026-06-15', `TYCN self-reinforcing detected too late: ${tycnSelf}`);

console.log(JSON.stringify({
  BIOC: { accelerating: biocAccelerating, selfReinforcing: biocSelf, phases: biocPhases },
  TYCN: { abnormal: tycnAbnormal, accelerating: tycnAccelerating, selfReinforcing: tycnSelf, phases: tycnPhases },
}, null, 2));
