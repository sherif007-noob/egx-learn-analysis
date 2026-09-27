import { mkdir, writeFile } from 'node:fs/promises';
import { createChart, createSeries, createSession } from '@ch99q/twc';

type HistoryBar = [number, number, number, number, number, number?];

const TICKER_METADATA: Record<string, { persistedSymbol?: string; isin?: string }> = {
  CRST: { persistedSymbol: 'CRST', isin: 'EGS23141C012' },
  NAPR: { persistedSymbol: 'EGS370O1C013', isin: 'EGS370O1C013' },
  KORA: { persistedSymbol: 'KORA', isin: 'EGS07911C018' },
  RKAZ: { persistedSymbol: 'RKAZ', isin: 'EGS521T1C016' },
  RUBX: { persistedSymbol: 'RUBX', isin: 'EGS3A221C018' },
};

function normalizeTicker(value: string): string {
  return value.trim().toUpperCase().replace(/^EGX:/, '').replace(/\.CA$/, '');
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function requestedTickers(): string[] {
  const raw = process.env.EGX_INTRADAY_TICKERS || 'CRST,NAPR,KORA,RKAZ,RUBX,TAQA,MAAL,OFH,SWDY,GIHD,FWRY,OIH,ARCC,MBSC,MCQE,SCEM,SVCE';
  return unique(raw.split(',').map(normalizeTicker).filter(Boolean));
}

function requestedBars(): number {
  const parsed = Number(process.env.EGX_INTRADAY_BARS || '5000');
  if (!Number.isFinite(parsed) || parsed <= 0) return 5000;
  return Math.min(Math.trunc(parsed), 7500);
}

function cairoTimestamp(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
}

function candidateSymbols(ticker: string): string[] {
  const meta = TICKER_METADATA[ticker] || {};
  return unique(
    [meta.persistedSymbol, ticker, meta.isin]
      .map((value) => String(value || '').trim().toUpperCase())
      .filter(Boolean),
  );
}

async function resolveInstrument(chart: Awaited<ReturnType<typeof createChart>>, ticker: string) {
  const attempts: Array<{ symbol: string; ok: boolean; error?: string }> = [];

  for (const symbol of candidateSymbols(ticker)) {
    try {
      const resolved = await chart.resolve(symbol, 'EGX');
      attempts.push({ symbol, ok: true });
      return { symbol, resolved, attempts };
    } catch (error) {
      attempts.push({
        symbol,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  throw new Error(
    `${ticker}: TradingView resolution failed: ${attempts
      .map((x) => `${x.symbol}=${x.ok ? 'ok' : 'failed'}`)
      .join(' -> ')}`,
  );
}

function normalizeBars(history: HistoryBar[]) {
  return history
    .map((bar) => {
      const [timestamp, open, high, low, close, volume] = bar.map(Number);
      if (
        !Number.isFinite(timestamp) ||
        !Number.isFinite(open) ||
        !Number.isFinite(high) ||
        !Number.isFinite(low) ||
        !Number.isFinite(close) ||
        open <= 0 ||
        high <= 0 ||
        low <= 0 ||
        close <= 0
      ) {
        return null;
      }

      return {
        timestamp_utc: new Date(timestamp * 1000).toISOString(),
        timestamp_cairo: cairoTimestamp(timestamp),
        open,
        high,
        low,
        close,
        volume: Number.isFinite(volume) && volume >= 0 ? volume : null,
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => a.timestamp_utc.localeCompare(b.timestamp_utc));
}

function dailySummary(bars: ReturnType<typeof normalizeBars>) {
  const grouped = new Map<
    string,
    { date: string; open: number; high: number; low: number; close: number; volume: number }
  >();

  for (const bar of bars) {
    const date = bar.timestamp_cairo.slice(0, 10);
    const existing = grouped.get(date);
    if (!existing) {
      grouped.set(date, {
        date,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: Number(bar.volume || 0),
      });
      continue;
    }

    existing.high = Math.max(existing.high, bar.high);
    existing.low = Math.min(existing.low, bar.low);
    existing.close = bar.close;
    existing.volume += Number(bar.volume || 0);
  }

  return [...grouped.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function csvEscape(value: unknown): string {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsv(bars: ReturnType<typeof normalizeBars>): string {
  const rows = [
    ['timestamp_utc', 'timestamp_cairo', 'open', 'high', 'low', 'close', 'volume'],
    ...bars.map((bar) => [
      bar.timestamp_utc,
      bar.timestamp_cairo,
      bar.open,
      bar.high,
      bar.low,
      bar.close,
      bar.volume ?? '',
    ]),
  ];
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n') + '\n';
}

async function main() {
  const tickers = requestedTickers();
  const barsRequested = requestedBars();
  await mkdir('data/intraday', { recursive: true });

  const session = await createSession();
  const runSummary: any = {
    fetched_at: new Date().toISOString(),
    interval_minutes: 1,
    requested_bars_per_ticker: barsRequested,
    tickers: {},
  };

  try {
    const chart = await createChart(session);

    for (const ticker of tickers) {
      const resolution = await resolveInstrument(chart, ticker);
      const series = await createSeries(session, chart, resolution.resolved, '1', barsRequested);

      try {
        const bars = normalizeBars((series.history || []) as HistoryBar[]);
        if (!bars.length) throw new Error(`${ticker}: no usable 1m bars returned`);

        const daily = dailySummary(bars);
        const payload = {
          ticker,
          source: 'tradingview',
          resolved_symbol: resolution.symbol,
          resolution_attempts: resolution.attempts,
          fetched_at: new Date().toISOString(),
          interval_minutes: 1,
          bars_requested: barsRequested,
          bars_returned: bars.length,
          first_bar_utc: bars[0].timestamp_utc,
          last_bar_utc: bars.at(-1)!.timestamp_utc,
          daily,
          bars,
        };

        await writeFile(
          `data/intraday/${ticker}-1m.json`,
          JSON.stringify(payload, null, 2) + '\n',
          'utf8',
        );
        await writeFile(`data/intraday/${ticker}-1m.csv`, toCsv(bars), 'utf8');

        runSummary.tickers[ticker] = {
          resolved_symbol: resolution.symbol,
          bars_returned: bars.length,
          first_bar_utc: bars[0].timestamp_utc,
          last_bar_utc: bars.at(-1)!.timestamp_utc,
          latest_session: daily.at(-1),
        };

        console.log(JSON.stringify({ ticker, ...runSummary.tickers[ticker] }));
      } finally {
        await series.close();
      }
    }
  } finally {
    await session.close();
  }

  await writeFile(
    'data/intraday/summary.json',
    JSON.stringify(runSummary, null, 2) + '\n',
    'utf8',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
