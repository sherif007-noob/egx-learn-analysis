import type { LiveSignal, RadarEnv, RadarState } from './types';

function money(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}m`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return Math.round(value).toString();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function stageEmoji(stage: LiveSignal['stage']): string {
  if (stage === 'BREAKOUT') return '🚨';
  if (stage === 'TRIGGERING') return '⚡';
  return '👀';
}

async function telegramApi(
  env: RadarEnv,
  method: string,
  body: Record<string, unknown>,
): Promise<any> {
  const botToken = env.TELEGRAM_BOT_TOKEN?.trim();
  if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN is not configured');

  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null) as any;
  if (!response.ok || !payload?.ok) {
    throw new Error(`Telegram ${method} failed: ${response.status} ${JSON.stringify(payload)}`);
  }
  return payload.result;
}

export async function sendTelegramMessage(
  env: RadarEnv,
  chatId: string,
  text: string,
): Promise<void> {
  await telegramApi(env, 'sendMessage', {
    chat_id: chatId.trim(),
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  });
}

export async function deriveTelegramWebhookSecret(adminToken: string): Promise<string> {
  const bytes = new TextEncoder().encode(adminToken);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function telegramBotStatus(env: RadarEnv): Promise<any> {
  const [me, webhook] = await Promise.all([
    telegramApi(env, 'getMe', {}),
    telegramApi(env, 'getWebhookInfo', {}),
  ]);

  return {
    bot: {
      id: me?.id,
      username: me?.username,
      firstName: me?.first_name,
    },
    webhook: {
      url: webhook?.url || '',
      hasCustomCertificate: Boolean(webhook?.has_custom_certificate),
      pendingUpdateCount: Number(webhook?.pending_update_count || 0),
      lastErrorDate: webhook?.last_error_date || null,
      lastErrorMessage: webhook?.last_error_message || null,
      maxConnections: webhook?.max_connections || null,
      allowedUpdates: webhook?.allowed_updates || [],
    },
  };
}

export async function configureTelegramBot(
  env: RadarEnv,
  origin: string,
): Promise<{ webhookUrl: string; commands: string[] }> {
  if (!env.TELEGRAM_BOT_TOKEN?.trim() || !env.TELEGRAM_CHAT_ID?.trim()) {
    throw new Error('Telegram token/chat ID are not configured');
  }
  if (!env.ADMIN_TOKEN) {
    throw new Error('ADMIN_TOKEN is required to secure the Telegram webhook');
  }

  const webhookUrl = `${origin.replace(/\/$/, '')}/telegram/webhook`;
  const secretToken = await deriveTelegramWebhookSecret(env.ADMIN_TOKEN);

  await telegramApi(env, 'setWebhook', {
    url: webhookUrl,
    secret_token: secretToken,
    allowed_updates: ['message'],
    drop_pending_updates: true,
  });

  const commands = ['scan', 'status', 'help'];
  await telegramApi(env, 'setMyCommands', {
    commands: [
      { command: 'scan', description: 'Run a live EGX scan now' },
      { command: 'status', description: 'Show latest radar state' },
      { command: 'help', description: 'Show available commands' },
    ],
  });

  await sendTelegramMessage(
    env,
    String(env.TELEGRAM_CHAT_ID).trim(),
    '✅ <b>EGX Live Radar connected</b>\nTelegram webhook is active. Try /scan now.',
  );

  return { webhookUrl, commands };
}

export function formatManualScanResult(result: any): string {
  if (result?.error) {
    return `❌ <b>Scan failed</b>\n${escapeHtml(String(result.error))}`;
  }

  if (result?.skipped) {
    return `⚠️ <b>Scan skipped</b>\n${escapeHtml(String(result.reason || 'unknown reason'))}`;
  }

  const market = result?.market || {};
  const signals = Array.isArray(result?.signals) ? result.signals as LiveSignal[] : [];
  const header = [
    '📡 <b>EGX Live Scan</b>',
    result?.atCairo ? `🕒 ${escapeHtml(String(result.atCairo))}` : '',
    `Universe: <b>${Number(result?.universeCount || 0).toLocaleString('en-US')}</b> · Signals: <b>${signals.length}</b>`,
    `Market: <b>${escapeHtml(String(market.regime || 'UNKNOWN'))}</b> · Adv ${Number(market.advancers || 0)} / Dec ${Number(market.decliners || 0)}`,
  ].filter(Boolean);

  if (!signals.length) {
    const leaders = Array.isArray(result?.leaders) ? result.leaders.slice(0, 7) : [];
    const leaderRows = leaders.map((leader: any, index: number) => [
      `${index + 1}. <b>${escapeHtml(String(leader.ticker || '-'))}</b> · ${Number(leader.close || 0).toFixed(3)} · Day ${Number(leader.changePct || 0) >= 0 ? '+' : ''}${Number(leader.changePct || 0).toFixed(2)}%`,
      `   RVOL ${Number(leader.rvol10 || 0).toFixed(2)}x · HOD gap ${Number(leader.hodDistancePct || 0).toFixed(2)}% · RS ${Number(leader.relativeStrengthPct || 0) >= 0 ? '+' : ''}${Number(leader.relativeStrengthPct || 0).toFixed(2)}pp`,
      `   Turnover EGP ${money(Number(leader.turnover || 0))}`,
    ].join('\n'));

    return [
      ...header,
      '',
      'مفيش سهم عدى شروط الـWATCH/TRIGGERING/BREAKOUT الرسمية في الـscan ده.',
      leaders.length ? 'لكن دي أقوى <b>liquid movers</b> الحالية:' : '',
      ...leaderRows,
      '',
      'الـliquid movers دي للمراقبة بس ومش محسوبة Signals رسمية.',
    ].filter(Boolean).join('\n');
  }

  const rows = signals.slice(0, 7).map((signal, index) => {
    const reasons = signal.reasons?.slice(0, 3).join(' · ') || 'live momentum setup';
    return [
      `${index + 1}. ${stageEmoji(signal.stage)} <b>${escapeHtml(signal.ticker)}</b> · ${signal.stage} · <b>${signal.score.toFixed(1)}</b>`,
      `   ${signal.close.toFixed(3)} · Day ${signal.changePct >= 0 ? '+' : ''}${signal.changePct.toFixed(2)}% · 1m ${signal.velocity1mPct >= 0 ? '+' : ''}${signal.velocity1mPct.toFixed(2)}%`,
      `   Pace ${signal.volumePace.toFixed(1)}x · HOD gap ${signal.hodDistancePct.toFixed(2)}% · RS ${signal.relativeStrengthPct >= 0 ? '+' : ''}${signal.relativeStrengthPct.toFixed(2)}pp`,
      `   <i>${escapeHtml(reasons)}</i>`,
    ].join('\n');
  });

  return [
    ...header,
    '',
    ...rows,
    '',
    'دي shortlist متابعة، مش أمر شراء. افتح Depth + Trades قبل أي تنفيذ.',
  ].join('\n');
}

export function formatRadarStatus(state: RadarState): string {
  const signals = state.latestSignals || [];
  return [
    '🛰 <b>EGX Radar Status</b>',
    `Updated: <b>${escapeHtml(state.updatedAt || '-')}</b>`,
    `Session: ${escapeHtml(state.sessionDate || '-')} · Universe: <b>${state.lastUniverseCount || 0}</b>`,
    `Market: <b>${escapeHtml(state.market?.regime || 'UNKNOWN')}</b> · breadth ${((state.market?.breadthRatio ?? 0.5) * 100).toFixed(0)}%`,
    `Current signals: <b>${signals.length}</b> · Pending calibration: <b>${state.pendingEvaluations?.length || 0}</b>`,
    signals[0]
      ? `Top: ${stageEmoji(signals[0].stage)} <b>${escapeHtml(signals[0].ticker)}</b> · ${signals[0].stage} · score ${signals[0].score.toFixed(1)}`
      : 'Top: no active signal',
  ].join('\n');
}

export function telegramHelpText(): string {
  return [
    '🤖 <b>EGX Live Radar</b>',
    '',
    '/scan — اعمل live scan دلوقتي وورّيني أعلى candidates',
    '/status — آخر حالة للـradar',
    '/help — الأوامر المتاحة',
    '',
    'الـalerts التلقائية هتفضل توصلك لوحدها وقت الجلسة.',
  ].join('\n');
}

export async function sendTelegramAlerts(env: RadarEnv, signals: LiveSignal[]): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN?.trim() || !env.TELEGRAM_CHAT_ID?.trim() || !signals.length) return;

  const body = signals
    .slice(0, 5)
    .map((signal) => {
      const reasons = signal.reasons.length ? signal.reasons.join(' · ') : 'live momentum setup';
      return [
        `${stageEmoji(signal.stage)} <b>${escapeHtml(signal.ticker)} — ${signal.stage}</b>  score ${signal.score.toFixed(1)}`,
        `Price <b>${signal.close.toFixed(3)}</b> · Day ${signal.changePct >= 0 ? '+' : ''}${signal.changePct.toFixed(2)}%`,
        `${signal.intervalSeconds}s Δ ${signal.priceDeltaPct >= 0 ? '+' : ''}${signal.priceDeltaPct.toFixed(2)}% · Vol ${signal.volumeDelta.toLocaleString('en-US')} · EGP ${money(signal.intervalTurnover)}`,
        `Pace ${signal.volumePace.toFixed(1)}x · HOD gap ${signal.hodDistancePct.toFixed(2)}%`,
        `1m ${signal.velocity1mPct >= 0 ? '+' : ''}${signal.velocity1mPct.toFixed(2)}% · 3m ${signal.velocity3mPct >= 0 ? '+' : ''}${signal.velocity3mPct.toFixed(2)}% · RS ${signal.relativeStrengthPct >= 0 ? '+' : ''}${signal.relativeStrengthPct.toFixed(2)}pp`,
        `Market ${signal.marketRegime} · breadth ${(signal.marketBreadthRatio * 100).toFixed(0)}%`,
        `<i>${escapeHtml(reasons)}</i>`,
        'راقبه على الـDepth والـTrades — دي إشارة متابعة مش أمر شراء.',
      ].join('\n');
    })
    .join('\n\n');

  await sendTelegramMessage(env, env.TELEGRAM_CHAT_ID.trim(), body);
}
