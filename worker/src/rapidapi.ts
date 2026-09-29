import type { RadarEnv } from './types';

export type RapidApiQuota = {
  limit: string | null;
  remaining: string | null;
  reset: string | null;
};

export type RapidApiMeta = {
  provider: 'rapidapi-egx-live';
  endpoint: string;
  receivedAt: string;
  latencyMs: number;
  quota: RapidApiQuota;
};

export type RapidEgxQuote = RapidApiMeta & {
  symbol: string;
  last: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  prevClose: number | null;
  bid: number | null;
  ask: number | null;
  bidVol: number | null;
  askVol: number | null;
  volume: number | null;
  change: number | null;
  changePct: number | null;
  updatedAt: string | null;
  dataAgeMs: number | null;
};

export type RapidDepthLevel = {
  level: number;
  price: number;
  quantity: number;
  orders: number;
};

export type RapidEgxDepth = RapidApiMeta & {
  symbol: string;
  requestedLevels: 5 | 40;
  bids: RapidDepthLevel[];
  asks: RapidDepthLevel[];
  updatedAt: string | null;
  dataAgeMs: number | null;
};

export type RapidEgxSummary = RapidApiMeta & {
  advancing: number | null;
  declining: number | null;
  unchanged: number | null;
  total: number | null;
  threshold: number | null;
};

export class RapidApiError extends Error {
  status: number;
  endpoint: string;

  constructor(message: string, status: number, endpoint: string) {
    super(message);
    this.name = 'RapidApiError';
    this.status = status;
    this.endpoint = endpoint;
  }
}

function cleanHost(value?: string): string {
  return String(value || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');
}

function baseUrl(env: RadarEnv): string {
  const explicit = String(env.RAPIDAPI_BASE_URL || '').trim().replace(/\/+$/, '');
  if (explicit) return explicit;

  const host = cleanHost(env.RAPIDAPI_HOST);
  if (!host) throw new Error('RAPIDAPI_HOST or RAPIDAPI_BASE_URL is not configured');
  return `https://${host}`;
}

function authHost(env: RadarEnv): string {
  const explicit = cleanHost(env.RAPIDAPI_HOST);
  if (explicit) return explicit;

  const configuredBaseUrl = String(env.RAPIDAPI_BASE_URL || '').trim();
  if (!configuredBaseUrl) return '';

  try {
    return new URL(configuredBaseUrl).host;
  } catch {
    return '';
  }
}

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function dataAgeMs(updatedAt: string | null): number | null {
  if (!updatedAt) return null;
  const timestamp = Date.parse(updatedAt);
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, Date.now() - timestamp);
}

function normalizeSymbol(symbol: string): string {
  const normalized = symbol.trim().toUpperCase();
  if (!/^[A-Z0-9._-]{1,24}$/.test(normalized)) {
    throw new Error('Invalid EGX symbol');
  }
  return normalized;
}

function quotaFromHeaders(headers: Headers): RapidApiQuota {
  return {
    limit: headers.get('x-ratelimit-requests-limit'),
    remaining: headers.get('x-ratelimit-requests-remaining'),
    reset: headers.get('x-ratelimit-requests-reset'),
  };
}

function timeoutMs(env: RadarEnv): number {
  const parsed = Number(env.RAPIDAPI_TIMEOUT_MS || 5000);
  if (!Number.isFinite(parsed)) return 5000;
  return Math.max(1500, Math.min(15_000, parsed));
}

export function rapidApiConfigured(env: RadarEnv): boolean {
  return Boolean(
    env.RAPIDAPI_KEY?.trim()
    && (env.RAPIDAPI_HOST?.trim() || env.RAPIDAPI_BASE_URL?.trim()),
  );
}

export function rapidApiEnabled(env: RadarEnv): boolean {
  return String(env.RAPIDAPI_ENABLED || 'false').toLowerCase() === 'true';
}

export function rapidApiConfigSummary(env: RadarEnv) {
  return {
    enabled: rapidApiEnabled(env),
    configured: rapidApiConfigured(env),
    host: authHost(env) || null,
    timeoutMs: timeoutMs(env),
    keyConfigured: Boolean(env.RAPIDAPI_KEY?.trim()),
    mode: 'shadow-validation',
  };
}

async function rapidGet<T = any>(
  env: RadarEnv,
  endpoint: string,
): Promise<{ payload: T; meta: RapidApiMeta }> {
  if (!rapidApiConfigured(env)) {
    throw new Error('RapidAPI EGX feed is not configured');
  }

  const key = env.RAPIDAPI_KEY!.trim();
  const host = authHost(env);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs(env));
  const startedAt = Date.now();

  try {
    const response = await fetch(`${baseUrl(env)}${endpoint}`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-rapidapi-key': key,
        'x-rapidapi-host': host,
        'user-agent': 'EGX-Live-Radar/1.0',
      },
      signal: controller.signal,
    });

    const latencyMs = Date.now() - startedAt;
    const text = await response.text();
    let payload: any = null;

    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }

    if (!response.ok) {
      const detail = typeof payload === 'string'
        ? payload.slice(0, 400)
        : JSON.stringify(payload).slice(0, 400);
      throw new RapidApiError(
        `RapidAPI EGX request failed: ${response.status} ${detail}`,
        response.status,
        endpoint,
      );
    }

    return {
      payload: payload as T,
      meta: {
        provider: 'rapidapi-egx-live',
        endpoint,
        receivedAt: new Date().toISOString(),
        latencyMs,
        quota: quotaFromHeaders(response.headers),
      },
    };
  } catch (error) {
    if (error instanceof RapidApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`RapidAPI EGX request timed out after ${timeoutMs(env)}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeDepthLevels(value: unknown): RapidDepthLevel[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item: any, index) => {
      const price = numberOrNull(item?.price);
      const quantity = numberOrNull(item?.quantity);
      const orders = numberOrNull(item?.orders);
      const level = numberOrNull(item?.level) ?? index;
      if (price === null || quantity === null) return null;

      return {
        level,
        price,
        quantity,
        orders: orders ?? 0,
      };
    })
    .filter((item): item is RapidDepthLevel => Boolean(item));
}

export async function fetchRapidQuote(
  env: RadarEnv,
  symbol: string,
): Promise<RapidEgxQuote> {
  const ticker = normalizeSymbol(symbol);
  const endpoint = `/api/price/${encodeURIComponent(ticker)}`;
  const { payload, meta } = await rapidGet<any>(env, endpoint);
  const updatedAt = stringOrNull(payload?.updated_at);

  return {
    ...meta,
    symbol: String(payload?.symbol || ticker).toUpperCase(),
    last: numberOrNull(payload?.last),
    open: numberOrNull(payload?.open),
    high: numberOrNull(payload?.high),
    low: numberOrNull(payload?.low),
    prevClose: numberOrNull(payload?.prev_close),
    bid: numberOrNull(payload?.bid),
    ask: numberOrNull(payload?.ask),
    bidVol: numberOrNull(payload?.bid_vol),
    askVol: numberOrNull(payload?.ask_vol),
    volume: numberOrNull(payload?.volume),
    change: numberOrNull(payload?.change),
    changePct: numberOrNull(payload?.change_pct),
    updatedAt,
    dataAgeMs: dataAgeMs(updatedAt),
  };
}

export async function fetchRapidDepth(
  env: RadarEnv,
  symbol: string,
  levels: 5 | 40 = 5,
): Promise<RapidEgxDepth> {
  const ticker = normalizeSymbol(symbol);
  const requestedLevels: 5 | 40 = levels === 40 ? 40 : 5;
  const endpoint = `/api/depth_${requestedLevels}/${encodeURIComponent(ticker)}`;
  const { payload, meta } = await rapidGet<any>(env, endpoint);
  const updatedAt = stringOrNull(payload?.updated_at);

  return {
    ...meta,
    symbol: String(payload?.symbol || ticker).toUpperCase(),
    requestedLevels,
    bids: normalizeDepthLevels(payload?.bids),
    asks: normalizeDepthLevels(payload?.asks),
    updatedAt,
    dataAgeMs: dataAgeMs(updatedAt),
  };
}

export async function fetchRapidSummary(
  env: RadarEnv,
  threshold?: number,
): Promise<RapidEgxSummary> {
  const normalizedThreshold = typeof threshold === 'number' && Number.isFinite(threshold)
    ? Math.max(0, Math.min(20, threshold))
    : null;
  const endpoint = normalizedThreshold === null
    ? '/api/summary'
    : `/api/summary?threshold=${encodeURIComponent(String(normalizedThreshold))}`;
  const { payload, meta } = await rapidGet<any>(env, endpoint);

  return {
    ...meta,
    advancing: numberOrNull(payload?.advancing),
    declining: numberOrNull(payload?.declining),
    unchanged: numberOrNull(payload?.unchanged),
    total: numberOrNull(payload?.total),
    threshold: numberOrNull(payload?.threshold),
  };
}

export async function fetchRapidMovers(
  env: RadarEnv,
  limit = 10,
): Promise<any> {
  const normalizedLimit = Math.max(1, Math.min(50, Math.round(Number(limit) || 10)));
  const endpoint = `/api/movers?limit=${normalizedLimit}`;
  const { payload, meta } = await rapidGet<any>(env, endpoint);
  return { ...meta, ...payload };
}

export async function fetchRapidSymbols(env: RadarEnv): Promise<any> {
  const endpoint = '/api/symbols';
  const { payload, meta } = await rapidGet<any>(env, endpoint);
  return { ...meta, data: payload };
}

export async function fetchRapidHealth(env: RadarEnv): Promise<any> {
  const endpoint = '/health';
  const { payload, meta } = await rapidGet<any>(env, endpoint);
  return { ...meta, data: payload };
}

export async function fetchRapidValidationSample(
  env: RadarEnv,
  symbol: string,
  levels: 5 | 40 = 5,
): Promise<any> {
  const [quote, depth, summary] = await Promise.all([
    fetchRapidQuote(env, symbol),
    fetchRapidDepth(env, symbol, levels),
    fetchRapidSummary(env),
  ]);

  const bestBid = depth.bids[0] || null;
  const bestAsk = depth.asks[0] || null;
  const spread = bestBid && bestAsk ? bestAsk.price - bestBid.price : null;
  const midpoint = bestBid && bestAsk ? (bestAsk.price + bestBid.price) / 2 : null;
  const spreadPct = spread !== null && midpoint && midpoint > 0
    ? (spread / midpoint) * 100
    : null;

  return {
    provider: 'rapidapi-egx-live',
    sampledAt: new Date().toISOString(),
    quote,
    depth,
    summary,
    derived: {
      bestBid,
      bestAsk,
      spread,
      spreadPct,
    },
  };
}
