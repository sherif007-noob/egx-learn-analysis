import { fetchCalibrationSummary, supabaseConfigured } from './supabase';
import type { RadarEnv } from './types';

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

export { RadarCoordinator } from './radarObject';

export default {
  async fetch(request: Request, env: RadarEnv): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/health') {
      const response = await coordinator(env).fetch('https://radar.internal/health');
      const body = await response.json();
      return json(body, response.status);
    }

    if (!authorized(request, env)) {
      return json({ error: 'unauthorized' }, 401);
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
