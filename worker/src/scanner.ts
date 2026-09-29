import type { ScannerRow } from './types';

const TV_URL = 'https://scanner.tradingview.com/egypt/scan';

const COLUMNS = [
  'name',
  'description',
  'close',
  'change',
  'volume',
  'average_volume_10d_calc',
  'relative_volume_10d_calc',
  'high',
  'low',
  'market_cap_basic',
  'sector',
] as const;

const asNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

function tickerFromSymbol(symbol: string, fallback: string): string {
  const raw = String(symbol || fallback || '').trim().toUpperCase();
  return raw.includes(':') ? raw.split(':').at(-1)! : raw;
}

export async function fetchEgyptScanner(): Promise<{ totalCount: number; rows: ScannerRow[] }> {
  const response = await fetch(TV_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      'user-agent': 'Mozilla/5.0 (compatible; EGX-Live-Radar/1.0)',
    },
    body: JSON.stringify({
      filter: [],
      options: { lang: 'en' },
      symbols: { query: { types: [] }, tickers: [] },
      columns: COLUMNS,
      sort: { sortBy: 'volume', sortOrder: 'desc' },
      range: [0, 500],
    }),
  });

  if (!response.ok) {
    throw new Error(`TradingView scanner failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json() as {
    totalCount?: number;
    data?: Array<{ s?: string; d?: unknown[] }>;
  };

  const rows: ScannerRow[] = [];

  for (const item of payload.data || []) {
    const [
      name,
      description,
      closeRaw,
      changeRaw,
      volumeRaw,
      avgVolRaw,
      rvolRaw,
      highRaw,
      lowRaw,
      _marketCap,
      sectorRaw,
    ] = item.d || [];

    const close = asNumber(closeRaw);
    const volume = asNumber(volumeRaw);
    const high = asNumber(highRaw);
    const low = asNumber(lowRaw);
    const turnover = close !== null && volume !== null ? close * volume : null;
    const closeLocation = high !== null && low !== null && close !== null && high > low
      ? (close - low) / (high - low)
      : null;

    rows.push({
      symbol: String(item.s || ''),
      ticker: tickerFromSymbol(String(item.s || ''), String(name || '')),
      name: String(description || name || ''),
      close,
      changePct: asNumber(changeRaw),
      volume,
      avgVol10: asNumber(avgVolRaw),
      rvol10: asNumber(rvolRaw),
      high,
      low,
      turnover,
      closeLocation,
      sector: String(sectorRaw || ''),
    });
  }

  return {
    totalCount: Number(payload.totalCount || rows.length),
    rows,
  };
}
