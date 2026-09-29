import { fetchCalibrationSummary, supabaseConfigured } from './supabase';
import {
  fetchRapidDepth,
  fetchRapidHealth,
  fetchRapidMovers,
  fetchRapidQuote,
  fetchRapidSummary,
  fetchRapidSymbols,
  fetchRapidValidationSample,
  rapidApiConfigSummary,
  rapidApiConfigured,
  rapidApiEnabled,
} from './rapidapi';
import { fetchEgyptScanner } from './scanner';
import {
  configureTelegramBot,
  deriveTelegramWebhookSecret,
  formatLiveScanResult,
  formatManualScanResult,
  formatRadarStatus,
  formatRegimeScanResult,
  sendTelegramMessage,
  telegramBotStatus,
  telegramHelpText,
} from './telegram';
import type { RadarEnv, RadarState } from './types';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function authorized(request: Request, env: RadarEnv): boolean {
  if (!env.ADMIN_TOKEN) return true;
  const url = new URL(request.url);
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : url.searchParams.get('token');
  return token === env.ADMIN_TOKEN;
}

function coordinator(env: RadarEnv) {
  return env.RADAR_COORDINATOR.getByName('egx-market');
}

function rapidFeedReady(env: RadarEnv): { ok: true } | { ok: false; response: Response } {
  if (!rapidApiEnabled(env)) {
    return {
      ok: false,
      response: json({
        error: 'RapidAPI EGX feed is disabled',
        hint: 'Set RAPIDAPI_ENABLED=true after configuring the RapidAPI key and host.',
        config: rapidApiConfigSummary(env),
      }, 503),
    };
  }

  if (!rapidApiConfigured(env)) {
    return {
      ok: false,
      response: json({
        error: 'RapidAPI EGX feed is not configured',
        hint: 'Add RAPIDAPI_KEY and RAPIDAPI_HOST (or RAPIDAPI_BASE_URL) as Worker runtime settings.',
        config: rapidApiConfigSummary(env),
      }, 503),
    };
  }

  return { ok: true };
}

function feedError(error: unknown): Response {
  return json({
    error: error instanceof Error ? error.message : String(error),
  }, 502);
}

function requestedSymbol(url: URL): string | null {
  const value = url.searchParams.get('symbol')?.trim().toUpperCase() || '';
  return value || null;
}

async function telegramWebhookAuthorized(request: Request, env: RadarEnv): Promise<boolean> {
  if (!env.ADMIN_TOKEN) return false;
  const expected = await deriveTelegramWebhookSecret(env.ADMIN_TOKEN);
  const actual = request.headers.get('x-telegram-bot-api-secret-token') || '';
  return actual === expected;
}

async function handleTelegramCommand(update: any, env: RadarEnv): Promise<void> {
  const message = update?.message;
  const chatId = String(message?.chat?.id ?? '');
  const text = String(message?.text ?? '').trim();

  if (!chatId || !text || !env.TELEGRAM_CHAT_ID) return;
  if (chatId !== String(env.TELEGRAM_CHAT_ID)) return;

  const rawCommand = text.split(/\s+/)[0]?.toLowerCase() || '';
  const command = rawCommand.split('@')[0];

  if (command === '/live' || command === '/regime' || command === '/scan') {
    const label = command === '/live'
      ? '⚡ <b>بعمل intraday momentum scan...</b>'
      : command === '/regime'
        ? '🧭 <b>بعمل cross-session regime scan...</b>'
        : '📡 <b>بعمل combined scan لكل الـlanes...</b>';

    await sendTelegramMessage(env, chatId, label);

    // Manual commands should inspect the current market without consuming
    // automatic-alert cooldowns or creating duplicate Telegram alerts.
    const response = await coordinator(env).fetch(
      'https://radar.internal/tick?force=1&notify=0',
      { method: 'POST' },
    );
    const result = await response.json();

    const formatted = command === '/live'
      ? formatLiveScanResult(result)
      : command === '/regime'
        ? formatRegimeScanResult(result)
        : formatManualScanResult(result);

    await sendTelegramMessage(env, chatId, formatted);
    return;
  }

  if (command === '/status') {
    const response = await coordinator(env).fetch('https://radar.internal/latest');
    const state = await response.json() as RadarState;
    await sendTelegramMessage(env, chatId, formatRadarStatus(state));
    return;
  }

  if (command === '/start' || command === '/help') {
    await sendTelegramMessage(env, chatId, telegramHelpText());
  }
}

export { RadarCoordinator } from './radarObject';

export default {
  async fetch(
    request: Request,
    env: RadarEnv,
    ctx: { waitUntil(promise: Promise<unknown>): void },
  ): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/telegram/webhook' && request.method === 'POST') {
      if (!(await telegramWebhookAuthorized(request, env))) {
        return json({ error: 'unauthorized webhook' }, 401);
      }

      let update: any;
      try {
        update = await request.json();
      } catch {
        return json({ ok: true, ignored: 'invalid-json' });
      }

      ctx.waitUntil(
        handleTelegramCommand(update, env).catch((error) => {
          console.error(JSON.stringify({
            type: 'telegram-command-error',
            message: error instanceof Error ? error.message : String(error),
          }));
        }),
      );
      return json({ ok: true });
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      const response = await coordinator(env).fetch('https://radar.internal/health');
      const body = await response.json();
      return json(body, response.status);
    }

    if (!authorized(request, env)) {
      return json({ error: 'unauthorized' }, 401);
    }

    if (url.pathname === '/api/feed/status' && request.method === 'GET') {
      return json({
        ok: true,
        config: rapidApiConfigSummary(env),
        mode: 'shadow-validation',
        productionScanner: 'tradingview',
        note: 'RapidAPI is isolated from automatic radar polling until live-session validation is complete.',
      });
    }

    if (url.pathname.startsWith('/api/feed/') && request.method === 'GET') {
      const readiness = rapidFeedReady(env);
      if (!readiness.ok) return readiness.response;

      try {
        if (url.pathname === '/api/feed/probe') {
          const [health, summary] = await Promise.all([
            fetchRapidHealth(env),
            fetchRapidSummary(env),
          ]);
          return json({ ok: true, health, summary });
        }

        if (url.pathname === '/api/feed/quote') {
          const symbol = requestedSymbol(url);
          if (!symbol) return json({ error: 'symbol is required' }, 400);
          return json(await fetchRapidQuote(env, symbol));
        }

        if (url.pathname === '/api/feed/depth') {
          const symbol = requestedSymbol(url);
          if (!symbol) return json({ error: 'symbol is required' }, 400);
          const levels = url.searchParams.get('levels') === '40' ? 40 : 5;
          return json(await fetchRapidDepth(env, symbol, levels));
        }

        if (url.pathname === '/api/feed/summary') {
          const thresholdRaw = url.searchParams.get('threshold');
          const threshold = thresholdRaw === null ? undefined : Number(thresholdRaw);
          return json(await fetchRapidSummary(env, threshold));
        }

        if (url.pathname === '/api/feed/movers') {
          const limit = Number(url.searchParams.get('limit') || 10);
          return json(await fetchRapidMovers(env, limit));
        }

        if (url.pathname === '/api/feed/symbols') {
          return json(await fetchRapidSymbols(env));
        }

        if (url.pathname === '/api/feed/sample') {
          const symbol = requestedSymbol(url);
          if (!symbol) return json({ error: 'symbol is required' }, 400);
          const levels = url.searchParams.get('levels') === '40' ? 40 : 5;
          return json(await fetchRapidValidationSample(env, symbol, levels));
        }

        if (url.pathname === '/api/feed/compare') {
          const symbol = requestedSymbol(url);
          if (!symbol) return json({ error: 'symbol is required' }, 400);

          const [rapid, tradingView] = await Promise.all([
            fetchRapidQuote(env, symbol),
            fetchEgyptScanner(),
          ]);

          const tv = tradingView.rows.find((row) => row.ticker === symbol) || null;
          const priceDiff = rapid.last !== null && tv?.close !== null && tv?.close !== undefined
            ? rapid.last - tv.close
            : null;
          const priceDiffPct = priceDiff !== null && tv?.close && tv.close > 0
            ? (priceDiff / tv.close) * 100
            : null;

          return json({
            symbol,
            sampledAt: new Date().toISOString(),
            rapidApi: rapid,
            tradingView: tv
              ? {
                  close: tv.close,
                  changePct: tv.changePct,
                  volume: tv.volume,
                  high: tv.high,
                  low: tv.low,
                }
              : null,
            comparison: {
              priceDiff,
              priceDiffPct,
              rapidDataAgeMs: rapid.dataAgeMs,
            },
            note: 'TradingView scanner remains the production radar source during shadow validation.',
          });
        }

        return json({ error: 'feed endpoint not found' }, 404);
      } catch (error) {
        return feedError(error);
      }
    }

    if (
      url.pathname === '/api/telegram/setup'
      && (request.method === 'GET' || request.method === 'POST')
    ) {
      try {
        const result = await configureTelegramBot(env, url.origin);
        return json({ ok: true, ...result });
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : String(error) }, 502);
      }
    }

    if (url.pathname === '/api/telegram/status' && request.method === 'GET') {
      try {
        const status = await telegramBotStatus(env);
        return json({ ok: true, ...status });
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : String(error) }, 502);
      }
    }

    if (url.pathname === '/api/latest') {
      return coordinator(env).fetch('https://radar.internal/latest');
    }

    if (url.pathname === '/api/calibration' && request.method === 'GET') {
      if (!supabaseConfigured(env)) {
        return json({ error: 'Supabase calibration storage is not configured' }, 503);
      }
      try {
        const rows = await fetchCalibrationSummary(env);
        return json({ rows });
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : String(error) }, 502);
      }
    }

    if (url.pathname === '/api/scan' && (request.method === 'GET' || request.method === 'POST')) {
      const force = url.searchParams.get('force') === '1' ? '?force=1' : '';
      return coordinator(env).fetch(`https://radar.internal/tick${force}`, { method: 'POST' });
    }

    if (url.pathname === '/api/reset' && request.method === 'POST') {
      return coordinator(env).fetch('https://radar.internal/reset', { method: 'POST' });
    }

    return json({ error: 'not found' }, 404);
  },

  async scheduled(
    controller: { scheduledTime: number },
    env: RadarEnv,
    ctx: { waitUntil(promise: Promise<unknown>): void },
  ) {
    ctx.waitUntil(
      coordinator(env)
        .fetch(`https://radar.internal/tick?scheduledAt=${controller.scheduledTime}`, { method: 'POST' })
        .then(async (response) => {
          console.log(await response.text());
        })
        .catch((error) => {
          console.error(JSON.stringify({
            type: 'radar-cron-error',
            message: error instanceof Error ? error.message : String(error),
          }));
        }),
    );
  },
};
