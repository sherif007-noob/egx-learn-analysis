import type { LiveSignal, RadarEnv } from './types';

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

export async function sendTelegramAlerts(env: RadarEnv, signals: LiveSignal[]): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID || !signals.length) return;

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

  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text: body,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Telegram send failed: ${response.status} ${await response.text()}`);
  }
}
