import { fetchCalibrationSummary, supabaseConfigured } from './supabase';
import {
  configureTelegramBot,
  deriveTelegramWebhookSecret,
  formatManualScanResult,
  formatRadarStatus,
  sendTelegramMessage,
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

  if (command === '/scan') {
    await sendTelegramMessage(env, chatId, '🔎 <b>بعمل live scan دلوقتي...</b>');
    const response = await coordinator(env).fetch('https://radar.internal/tick?force=1', {
      method: 'POST',
    });
    const result = await response.json();
    await sendTelegramMessage(env, chatId, formatManualScanResult(result));
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
