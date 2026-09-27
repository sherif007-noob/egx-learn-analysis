import { mkdir, writeFile } from 'node:fs/promises';

const TV_URL = 'https://scanner.tradingview.com/egypt/scan';

const COLUMNS = [
  'name',
  'description',
  'close',
  'change',
  'change_abs',
  'volume',
  'average_volume_10d_calc',
  'relative_volume_10d_calc',
  'high',
  'low',
  'high_52_week',
  'low_52_week',
  'market_cap_basic',
  'sector',
  'RSI',
] as const;

type Row = {
  symbol: string;
  ticker: string;
  name: string;
  close: number | null;
  changePct: number | null;
  changeAbs: number | null;
  volume: number | null;
  avgVol10: number | null;
  rvol10: number | null;
  high: number | null;
  low: number | null;
  high52: number | null;
  low52: number | null;
  marketCap: number | null;
  sector: string;
  rsi: number | null;
  turnover: number | null;
  rangePct: number | null;
  closeLocation: number | null;
  dist52HighPct: number | null;
  score: number;
  flags: string[];
};

const n = (v: unknown): number | null => {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};

function clamp(x: number, lo = 0, hi = 1) {
  return Math.max(lo, Math.min(hi, x));
}

function tickerFromSymbol(symbol: string, fallback: string) {
  const raw = String(symbol || fallback || '').trim().toUpperCase();
  return raw.includes(':') ? raw.split(':').at(-1)! : raw;
}

function scoreRow(row: Omit<Row, 'score' | 'flags'>): { score: number; flags: string[] } {
  const flags: string[] = [];
  const turnover = row.turnover ?? 0;
  const rvol = row.rvol10 ?? 0;
  const range = row.rangePct ?? 0;
  const closeLoc = row.closeLocation ?? 0.5;
  const change = row.changePct ?? 0;
  const volume = row.volume ?? 0;

  // Hard liquidity gate for a beginner day-trading watchlist.
  if (turnover < 1_500_000 || volume < 50_000) {
    flags.push('thin');
  }

  if (turnover >= 25_000_000) flags.push('high-turnover');
  else if (turnover >= 8_000_000) flags.push('liquid');

  if (rvol >= 2) flags.push('rvol>=2');
  else if (rvol >= 1.2) flags.push('rvol>=1.2');

  if (range >= 5) flags.push('wide-range');
  if (Math.abs(change) >= 7) flags.push('high-momentum');
  if (closeLoc >= 0.8) flags.push('strong-close');
  if (closeLoc <= 0.2) flags.push('weak-close');

  // Score emphasizes tradability first, then activity/volatility.
  const liquidityScore = clamp((Math.log10(Math.max(turnover, 1)) - 6) / 2.2) * 35;
  const rvolScore = clamp((rvol - 0.7) / 2.3) * 20;
  const rangeScore = clamp(range / 10) * 20;
  const momentumScore = clamp(Math.abs(change) / 12) * 10;
  const closeScore = clamp(Math.abs(closeLoc - 0.5) * 2) * 8;
  const volumeScore = clamp((Math.log10(Math.max(volume, 1)) - 4.7) / 2.3) * 7;

  let score = liquidityScore + rvolScore + rangeScore + momentumScore + closeScore + volumeScore;
  if (flags.includes('thin')) score -= 25;

  return { score: Math.round(score * 10) / 10, flags };
}

async function fetchScanner() {
  const payload = {
    filter: [],
    options: { lang: 'en' },
    symbols: { query: { types: [] }, tickers: [] },
    columns: COLUMNS,
    sort: { sortBy: 'volume', sortOrder: 'desc' },
    range: [0, 500],
  };

  const res = await fetch(TV_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64)',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`TradingView scanner failed: ${res.status} ${res.statusText} :: ${await res.text()}`);
  }
  return await res.json() as { totalCount?: number; data?: Array<{ s?: string; d?: unknown[] }> };
}

function normalize(raw: Awaited<ReturnType<typeof fetchScanner>>): Row[] {
  const rows: Row[] = [];
  for (const item of raw.data || []) {
    const d = item.d || [];
    const [
      name,
      description,
      closeRaw,
      changeRaw,
      changeAbsRaw,
      volumeRaw,
      avgVolRaw,
      rvolRaw,
      highRaw,
      lowRaw,
      high52Raw,
      low52Raw,
      marketCapRaw,
      sectorRaw,
      rsiRaw,
    ] = d;

    const close = n(closeRaw);
    const high = n(highRaw);
    const low = n(lowRaw);
    const volume = n(volumeRaw);
    const avgVol10 = n(avgVolRaw);
    const rvol10 = n(rvolRaw);
    const turnover = close !== null && volume !== null ? close * volume : null;
    const rangePct = close && high !== null && low !== null && close > 0
      ? ((high - low) / close) * 100
      : null;
    const closeLocation = high !== null && low !== null && close !== null && high > low
      ? (close - low) / (high - low)
      : null;
    const high52 = n(high52Raw);
    const dist52HighPct = close && high52 && high52 > 0 ? ((high52 - close) / high52) * 100 : null;

    const base = {
      symbol: String(item.s || ''),
      ticker: tickerFromSymbol(String(item.s || ''), String(name || '')),
      name: String(description || name || ''),
      close,
      changePct: n(changeRaw),
      changeAbs: n(changeAbsRaw),
      volume,
      avgVol10,
      rvol10,
      high,
      low,
      high52,
      low52: n(low52Raw),
      marketCap: n(marketCapRaw),
      sector: String(sectorRaw || ''),
      rsi: n(rsiRaw),
      turnover,
      rangePct,
      closeLocation,
      dist52HighPct,
    };

    const scored = scoreRow(base);
    rows.push({ ...base, ...scored });
  }
  return rows;
}

function fmt(n: number | null, digits = 2) {
  return n === null ? '-' : n.toLocaleString('en-US', { maximumFractionDigits: digits });
}

function markdown(rows: Row[], totalCount: number | undefined) {
  const eligible = rows
    .filter(r => !r.flags.includes('thin'))
    .sort((a,b) => b.score - a.score);

  const top = eligible.slice(0, 25);
  const strongClose = eligible.filter(r => (r.closeLocation ?? 0) >= 0.7 && (r.changePct ?? 0) > 0).slice(0, 15);
  const reversal = eligible.filter(r => (r.rangePct ?? 0) >= 4 && (r.closeLocation ?? 1) <= 0.35).slice(0, 15);

  const table = (items: Row[]) => [
    '| Ticker | Score | Close | Chg% | RVOL10 | Turnover EGP | Range% | Close loc | RSI | Flags |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---|',
    ...items.map(r =>
      `| ${r.ticker} | ${fmt(r.score,1)} | ${fmt(r.close)} | ${fmt(r.changePct)} | ${fmt(r.rvol10)} | ${fmt(r.turnover,0)} | ${fmt(r.rangePct)} | ${fmt(r.closeLocation === null ? null : r.closeLocation*100,0)}% | ${fmt(r.rsi,1)} | ${r.flags.join(', ')} |`
    )
  ].join('\n');

  return `# EGX Day-Trading Market Scan

Generated: ${new Date().toISOString()}  
Universe returned by TradingView Egypt scanner: ${totalCount ?? rows.length}

## What the score means
The score is a **shortlisting tool, not a buy signal**. It weights:
- executable liquidity / turnover first,
- relative volume,
- intraday range,
- absolute momentum,
- where the stock closed inside its daily range,
- raw volume.

Names marked **thin** are penalized and excluded from the main shortlist.

## Top 25 tradable candidates
${table(top)}

## Strong-close momentum candidates
Positive session + close in the upper 30% of the day's range.

${table(strongClose)}

## Wide-range / failed-move candidates
Large range + close in the lower 35% of the day's range. These can be useful for reclaim/reversal setups, but are not automatic longs.

${table(reversal)}

## Next step
Take the top 8–12 names and fetch 1-minute history. Then evaluate:
1. spread/liquidity,
2. support/resistance,
3. opening behavior,
4. pullback/reclaim structure,
5. tape/Depth live at the trigger.

Do not trade directly from this ranking.
`;
}

async function main() {
  await mkdir('data/scans', { recursive: true });
  const raw = await fetchScanner();
  const rows = normalize(raw);
  const sorted = [...rows].sort((a,b) => b.score - a.score);

  const payload = {
    generated_at: new Date().toISOString(),
    total_count: raw.totalCount ?? rows.length,
    columns: COLUMNS,
    methodology: {
      purpose: 'day-trading candidate shortlist',
      min_turnover_egp: 1_500_000,
      min_volume_shares: 50_000,
      note: 'score is not a buy signal',
    },
    rows: sorted,
  };

  await writeFile('data/scans/latest-market-scan.json', JSON.stringify(payload, null, 2) + '\n');
  await writeFile('data/scans/latest-market-scan.md', markdown(rows, raw.totalCount) + '\n');
  console.log(`Scanned ${rows.length} EGX symbols. Top candidates:`);
  for (const row of sorted.filter(r => !r.flags.includes('thin')).slice(0, 15)) {
    console.log(`${row.ticker}\tscore=${row.score}\tchg=${fmt(row.changePct)}%\trvol=${fmt(row.rvol10)}\tturnover=${fmt(row.turnover,0)}\trange=${fmt(row.rangePct)}%`);
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
