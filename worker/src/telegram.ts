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

function stageArabic(stage: LiveSignal['stage']): string {
  if (stage === 'BREAKOUT') return 'اختراق لحظي';
  if (stage === 'TRIGGERING') return 'الإشارة بتتكوّن';
  return 'فرصة متابعة';
}

function marketArabic(regime: LiveSignal['marketRegime']): string {
  if (regime === 'RISK_ON') return 'السوق إيجابي نسبيًا';
  if (regime === 'RISK_OFF') return 'السوق ضعيف نسبيًا';
  return 'السوق مختلط';
}

function signed(value: number, digits = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%`;
}

function beginnerPlan(signal: LiveSignal): string[] {
  if (signal.stage === 'BREAKOUT') {
    return [
      '1) <b>ما تجريش ورا السعر.</b> الاختراق حصل بالفعل والحركة ممكن تكون سريعة.',
      '2) افتح <b>Depth + Trades</b>: عايزين نشوف عروض البيع بتتسحب/تتنفذ والسعر ثابت فوق منطقة الاختراق.',
      '3) الأفضل للمبتدئ انتظار <b>ثبات أو pullback صغير ثم ارتداد</b> بدل الشراء في قمة شمعة سريعة.',
      '4) لو السعر رجع تحت منطقة الاختراق بسرعة أو الشراء وقف يحرك السعر: تجاهل الفرصة.',
      '5) لو فكرت تدخل، حدد الأول مستوى واضح يقول إن فكرتك غلط؛ من غير invalidation واضح مفيش صفقة.',
    ];
  }

  if (signal.stage === 'TRIGGERING') {
    return [
      '1) افتح السهم دلوقتي وراقبه، لكن <b>لسه مش شراء تلقائي</b>.',
      '2) راقب Depth + Trades لمدة دقيقة أو اتنين: هل التنفيذات على الـAsk بتزيد؟ وهل السعر بيتقدم فعلًا؟',
      '3) عايزين نشوف السعر يثبت قرب المستوى الحالي أو يعمل تراجع صغير ويرجع يطلع.',
      '4) لو الحجم عالي لكن السعر مش بيتحرك لفوق، ده ممكن يكون امتصاص بيع؛ ساعتها تجاهله.',
      '5) أي دخول لازم يبقى بعد ما تعرف هتخرج فين لو السيناريو فشل.',
    ];
  }

  return [
    '1) <b>افتح السهم وراقبه فقط.</b> WATCH معناها يستحق الشاشة، مش معناها اشتري.',
    '2) شوف آخر 1–3 دقائق: هل السعر ثابت/بيعمل قاع أعلى ولا الحركة بتفقد قوتها؟',
    '3) راقب Depth + Trades: تنفيذات شراء حقيقية + تقدم في السعر أهم من شكل الـDepth لوحده.',
    '4) استنى Trigger أو Breakout أنضج، أو pullback/reclaim واضح، بدل مطاردة الحركة.',
    '5) لو الحركة رجعت بسرعة أو السبريد بقى واسع أو مفيش تقدم في السعر: تجاهل الفرصة.',
  ];
}

function formatBeginnerAlert(signal: LiveSignal): string {
  const intervalMinutes = Math.max(signal.intervalSeconds / 60, 1 / 60);
  const velocityPerMinute = signal.priceDeltaPct / intervalMinutes;
  const explanations: string[] = [];

  explanations.push(
    `• <b>Score ${signal.score.toFixed(1)}/100</b>: ترتيب داخلي للرادار لقوة النشاط الحالي، <u>مش</u> احتمال نجاح الصفقة.`,
  );

  explanations.push(
    `• <b>Day ${signed(signal.changePct)}</b>: السهم متحرك بالنسبة لإقفال امبارح بالمقدار ده.`,
  );

  if (Math.abs(signal.priceDeltaPct) >= 0.05) {
    explanations.push(
      `• <b>${Math.round(signal.intervalSeconds)} ثانية: ${signed(signal.priceDeltaPct)}</b>: دي سرعة الحركة من آخر scan. ${Math.abs(velocityPerMinute) >= 1 ? 'الحركة سريعة جدًا.' : 'الحركة اللحظية ملحوظة.'}`,
    );
  }

  if (signal.volumePace > 0) {
    explanations.push(
      `• <b>Volume pace ${signal.volumePace.toFixed(1)}x</b>: التداول في الفترة الأخيرة أسرع بحوالي ${signal.volumePace.toFixed(1)} مرة من المعدل الطبيعي للسهم.`,
    );
  }

  explanations.push(
    `• <b>HOD gap ${signal.hodDistancePct.toFixed(2)}%</b>: السعر أقل من أعلى سعر النهارده بـ${signal.hodDistancePct.toFixed(2)}%. كل ما الرقم يقرب من صفر يبقى أقرب لقمة اليوم.`,
  );

  explanations.push(
    `• <b>1m ${signed(signal.velocity1mPct)} · 3m ${signed(signal.velocity3mPct)}</b>: اتجاه السعر خلال آخر دقيقة وآخر 3 دقايق.`,
  );

  explanations.push(
    `• <b>RS ${signal.relativeStrengthPct >= 0 ? '+' : ''}${signal.relativeStrengthPct.toFixed(2)} نقطة</b>: السهم أقوى/أضعف من متوسط حركة السوق بالمقدار ده؛ الموجب يعني أقوى من السوق.`,
  );

  const regimeLines: string[] = [];
  if (signal.regimePhase && signal.regimePhase !== 'NORMAL') {
    const label = signal.regimePhase.toLowerCase().replace(/_/g, ' ');
    regimeLines.push(
      `🧭 <b>Momentum regime: ${escapeHtml(label)}</b> · score ${(signal.regimeScore ?? 0).toFixed(1)}/100 · ${escapeHtml(signal.regimeConfidence || 'BOOTSTRAP')}`,
    );
    if (signal.regimeReturn5dPct !== null && signal.regimeReturn5dPct !== undefined) {
      regimeLines.push(`• 5-session move: <b>${signed(signal.regimeReturn5dPct)}</b>`);
    }
    if ((signal.regimeExplosiveDays5 ?? 0) > 0) {
      regimeLines.push(`• Explosive days: <b>${signal.regimeExplosiveDays5}/5</b>`);
    }
    if ((signal.regimeConsecutiveStrongDays ?? 0) >= 2) {
      regimeLines.push(`• Strong closes in a row: <b>${signal.regimeConsecutiveStrongDays}</b>`);
    }
    if ((signal.regimePriceMultiple10d ?? 0) >= 1.5) {
      regimeLines.push(`• Price is <b>${signal.regimePriceMultiple10d?.toFixed(2)}x</b> its 10-session low`);
    }
  }

  const warnings: string[] = [];
  if (signal.changePct >= 10) {
    warnings.push('⚠️ السهم طالع أكتر من 10% في نفس الجلسة؛ خطر مطاردة السعر عالي جدًا.');
  }
  if (Math.abs(velocityPerMinute) >= 2) {
    warnings.push('⚠️ السرعة اللحظية شديدة؛ السعر ممكن يرجع بعنف زي ما طلع.');
  }
  if (signal.volumePace >= 5) {
    warnings.push('⚠️ حجم التداول استثنائي؛ ده قوة اهتمام، لكنه ممكن يكون شراء <b>أو</b> تصريف، فلازم نشوف استجابة السعر.');
  }
  if (signal.hodDistancePct >= 2.5 && signal.changePct >= 5) {
    warnings.push('⚠️ السهم قوي يوميًا لكنه بعيد نسبيًا عن قمة اليوم؛ ممكن تكون حركة ارتداد داخل اليوم مش breakout جديد.');
  }

  const why = signal.reasons.length
    ? signal.reasons.slice(0, 5).map((reason) => `• ${escapeHtml(reason)}`)
    : ['• نشاط سعري/حجمي غير عادي'];

  return [
    `${stageEmoji(signal.stage)} <b>${escapeHtml(signal.ticker)} — ${stageArabic(signal.stage)}</b>`,
    `السعر: <b>${signal.close.toFixed(3)} جنيه</b> · اليوم: <b>${signed(signal.changePct)}</b>`,
    '',
    '<b>يعني إيه الإشارة دي؟</b>',
    signal.stage === 'WATCH'
      ? 'الرادار شايف السهم نشط وقوي بما يكفي إنك تفتحه وتراقبه، لكن مفيش تأكيد دخول لوحده.'
      : signal.stage === 'TRIGGERING'
        ? 'الزخم اللحظي بقى أقوى والإشارة بتقرب من setup قابل للتنفيذ، لكن محتاجة تأكيد من الحركة الفعلية.'
        : 'السهم عمل حركة اختراق لحظية قوية. ده أعلى تنبيه، لكنه برضه مش أمر شراء وخصوصًا لو السعر اندفع بسرعة.',
    '',
    '<b>شرح الأرقام ببساطة:</b>',
    ...explanations,
    '',
    '<b>ليه الرادار اختاره؟</b>',
    ...why,
    ...(regimeLines.length ? ['', '<b>Regime detector:</b>', ...regimeLines] : []),
    ...(warnings.length ? ['', '<b>خد بالك:</b>', ...warnings] : []),
    '',
    '<b>أعمل إيه دلوقتي كمبتدئ؟</b>',
    ...beginnerPlan(signal),
    '',
    `📊 <b>حالة السوق:</b> ${marketArabic(signal.marketRegime)} · breadth ${(signal.marketBreadthRatio * 100).toFixed(0)}%`,
    '',
    'التنبيه هدفه يلفت نظرك لفرصة محتملة؛ القرار يتاخد من السعر + التنفيذات + مستوى إلغاء الفكرة، مش من الـScore لوحده.',
  ].join('\n');
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

  const commands = ['live', 'regime', 'scan', 'inspect', 'why', 'leaders', 'session', 'watch', 'unwatch', 'watchlist', 'recap', 'terms', 'feedtest', 'status', 'help'];
  await telegramApi(env, 'setMyCommands', {
    commands: [
      { command: 'live', description: 'Intraday momentum scan (20s / session)' },
      { command: 'regime', description: 'Cross-session BIOC/TYCN-style regime scan' },
      { command: 'scan', description: 'Combined overview of all scan lanes' },
      { command: 'inspect', description: 'Inspect one ticker in plain language' },
      { command: 'why', description: 'Explain why a ticker is or is not a signal' },
      { command: 'leaders', description: 'Show current liquid market leaders' },
      { command: 'session', description: 'Explain the current market session' },
      { command: 'watch', description: 'Add a ticker to personal watchlist' },
      { command: 'unwatch', description: 'Remove a ticker from personal watchlist' },
      { command: 'watchlist', description: 'Show personal watchlist' },
      { command: 'recap', description: 'Review today radar alerts and outcomes' },
      { command: 'terms', description: 'Beginner glossary for radar terms' },
      { command: 'feedtest', description: 'Temporary live feed + Level II comparison' },
      { command: 'status', description: 'Show latest radar state' },
      { command: 'help', description: 'Show available commands' },
    ],
  });

  await sendTelegramMessage(
    env,
    String(env.TELEGRAM_CHAT_ID).trim(),
    '✅ <b>EGX Live Radar connected</b>\nUse /live for intraday momentum, /regime for cross-session anomalies, or /scan for the combined overview.',
  );

  return { webhookUrl, commands };
}

function formatScanResult(
  result: any,
  options: {
    title: string;
    signals: LiveSignal[];
    emptyMessage: string;
    showLeaders?: boolean;
    footer: string;
  },
): string {
  if (result?.error) {
    return `❌ <b>Scan failed</b>\n${escapeHtml(String(result.error))}`;
  }

  if (result?.skipped) {
    return `⚠️ <b>Scan skipped</b>\n${escapeHtml(String(result.reason || 'unknown reason'))}`;
  }

  const market = result?.market || {};
  const signals = options.signals;
  const header = [
    options.title,
    result?.atCairo ? `🕒 ${escapeHtml(String(result.atCairo))}` : '',
    `Universe: <b>${Number(result?.universeCount || 0).toLocaleString('en-US')}</b> · Signals: <b>${signals.length}</b>`,
    `Market: <b>${escapeHtml(String(market.regime || 'UNKNOWN'))}</b> · Adv ${Number(market.advancers || 0)} / Dec ${Number(market.decliners || 0)}`,
  ].filter(Boolean);

  if (!signals.length) {
    const leaders = options.showLeaders && Array.isArray(result?.leaders)
      ? result.leaders.slice(0, 7)
      : [];

    const leaderRows = leaders.map((leader: any, index: number) => [
      `${index + 1}. <b>${escapeHtml(String(leader.ticker || '-'))}</b> · ${Number(leader.close || 0).toFixed(3)} · Day ${Number(leader.changePct || 0) >= 0 ? '+' : ''}${Number(leader.changePct || 0).toFixed(2)}%`,
      `   RVOL ${Number(leader.rvol10 || 0).toFixed(2)}x · HOD gap ${Number(leader.hodDistancePct || 0).toFixed(2)}% · RS ${Number(leader.relativeStrengthPct || 0) >= 0 ? '+' : ''}${Number(leader.relativeStrengthPct || 0).toFixed(2)}pp`,
      `   Turnover EGP ${money(Number(leader.turnover || 0))}`,
    ].join('\n'));

    return [
      ...header,
      '',
      options.emptyMessage,
      ...(leaders.length ? ['', '<b>أقوى liquid movers الحالية:</b>', ...leaderRows] : []),
      '',
      options.footer,
    ].filter(Boolean).join('\n');
  }

  const rows = signals.slice(0, 10).map((signal, index) => {
    const reasons = signal.reasons?.slice(0, 3).join(' · ') || 'momentum setup';
    const lane = signal.detectionLane || 'LIVE';
    const regime = signal.regimePhase && signal.regimePhase !== 'NORMAL'
      ? ` · 🧭 ${signal.regimePhase} ${(signal.regimeScore ?? 0).toFixed(0)}`
      : '';

    return [
      `${index + 1}. ${stageEmoji(signal.stage)} <b>${escapeHtml(signal.ticker)}</b> · ${signal.stage} · <b>${signal.score.toFixed(1)}</b> · ${lane}${regime}`,
      `   ${signal.close.toFixed(3)} · Day ${signal.changePct >= 0 ? '+' : ''}${signal.changePct.toFixed(2)}% · 1m ${signal.velocity1mPct >= 0 ? '+' : ''}${signal.velocity1mPct.toFixed(2)}%`,
      `   RVOL ${signal.rvol10.toFixed(2)}x · HOD gap ${signal.hodDistancePct.toFixed(2)}% · RS ${signal.relativeStrengthPct >= 0 ? '+' : ''}${signal.relativeStrengthPct.toFixed(2)}pp`,
      `   <i>${escapeHtml(reasons)}</i>`,
    ].join('\n');
  });

  return [
    ...header,
    '',
    ...rows,
    '',
    options.footer,
  ].join('\n');
}

export function formatManualScanResult(result: any): string {
  const signals = Array.isArray(result?.signals) ? result.signals as LiveSignal[] : [];
  return formatScanResult(result, {
    title: '📡 <b>EGX Combined Scan</b>',
    signals,
    emptyMessage: 'مفيش signals رسمية في أي lane في الـscan ده.',
    showLeaders: true,
    footer: 'ده overview لكل طرق الـscan. استخدم /live أو /regime لو عايز lane محددة.',
  });
}

export function formatLiveScanResult(result: any): string {
  const all = Array.isArray(result?.signals) ? result.signals as LiveSignal[] : [];
  const signals = all.filter((signal) => signal.detectionLane !== 'REGIME');

  return formatScanResult(result, {
    title: '⚡ <b>Intraday Momentum Scan</b>',
    signals,
    emptyMessage: 'مفيش WATCH/TRIGGERING/BREAKOUT من الـintraday lanes دلوقتي.',
    showLeaders: true,
    footer: 'ده scan للحركة الحالية: 20s momentum + session leaders. مش بيعرض regime-only candidates.',
  });
}

export function formatRegimeScanResult(result: any): string {
  const all = Array.isArray(result?.signals) ? result.signals as LiveSignal[] : [];
  const regimeRank: Record<string, number> = {
    SELF_REINFORCING: 3,
    ACCELERATING: 2,
    ABNORMAL: 1,
    NORMAL: 0,
  };

  const signals = all
    .filter((signal) => signal.regimePhase && signal.regimePhase !== 'NORMAL')
    .sort((a, b) => {
      const phaseDiff = (regimeRank[b.regimePhase || 'NORMAL'] || 0)
        - (regimeRank[a.regimePhase || 'NORMAL'] || 0);
      if (phaseDiff !== 0) return phaseDiff;
      return (b.regimeScore ?? 0) - (a.regimeScore ?? 0);
    });

  return formatScanResult(result, {
    title: '🧭 <b>Momentum Regime Scan</b>',
    signals,
    emptyMessage: 'مفيش سهم دخل ABNORMAL / ACCELERATING / SELF_REINFORCING في الذاكرة الحالية.',
    showLeaders: false,
    footer: 'ده cross-session detector بتاع BIOC/TYCN-style behavior، مش إشارة دخول لحظية.',
  });
}


export function formatFeedTestResult(result: any): string {
  const rapid = result?.rapidApi || {};
  const quote = rapid?.quote || {};
  const depth = rapid?.depth || {};
  const summary = rapid?.summary || {};
  const tv = result?.tradingView || null;
  const derived = rapid?.derived || {};

  const bids = Array.isArray(depth?.bids) ? depth.bids.slice(0, 5) : [];
  const asks = Array.isArray(depth?.asks) ? depth.asks.slice(0, 5) : [];

  const bidQty = bids.reduce((sum: number, row: any) => sum + Number(row?.quantity || 0), 0);
  const askQty = asks.reduce((sum: number, row: any) => sum + Number(row?.quantity || 0), 0);
  const bookTotal = bidQty + askQty;
  const bidImbalance = bookTotal > 0 ? (bidQty / bookTotal) * 100 : null;

  const levelRows = Array.from({ length: Math.max(bids.length, asks.length, 5) }, (_, index) => {
    const bid = bids[index];
    const ask = asks[index];

    const bidText = bid
      ? `${Number(bid.price).toFixed(3)} × ${Number(bid.quantity).toLocaleString('en-US')} (${Number(bid.orders || 0)}o)`
      : '—';
    const askText = ask
      ? `${Number(ask.price).toFixed(3)} × ${Number(ask.quantity).toLocaleString('en-US')} (${Number(ask.orders || 0)}o)`
      : '—';

    return `${index + 1}) B ${bidText}\n   A ${askText}`;
  });

  const rapidLast = quote?.last === null || quote?.last === undefined
    ? '—'
    : Number(quote.last).toFixed(3);
  const tvLast = tv?.close === null || tv?.close === undefined
    ? '—'
    : Number(tv.close).toFixed(3);
  const priceDiffPct = result?.comparison?.priceDiffPct;
  const ageMs = quote?.dataAgeMs;
  const latencyMs = quote?.latencyMs;
  const quota = quote?.quota || {};
  const spreadPct = derived?.spreadPct;

  const ageText = typeof ageMs === 'number'
    ? ageMs < 1000
      ? `${Math.round(ageMs)}ms`
      : `${(ageMs / 1000).toFixed(1)}s`
    : 'timestamp غير متاح';

  const breadthTotal = Number(summary?.advancing || 0)
    + Number(summary?.declining || 0)
    + Number(summary?.unchanged || 0);

  return [
    `🧪 <b>Feed Test — ${escapeHtml(String(result?.symbol || quote?.symbol || '-'))}</b>`,
    `Sample: <b>${escapeHtml(String(result?.sampledAt || rapid?.sampledAt || '-'))}</b>`,
    '',
    '<b>1) السعر: RapidAPI vs TradingView</b>',
    `RapidAPI: <b>${rapidLast}</b> · Day ${quote?.changePct === null || quote?.changePct === undefined ? '—' : signed(Number(quote.changePct))}`,
    `TradingView: <b>${tvLast}</b> · Day ${tv?.changePct === null || tv?.changePct === undefined ? '—' : signed(Number(tv.changePct))}`,
    typeof priceDiffPct === 'number'
      ? `الفرق: <b>${priceDiffPct >= 0 ? '+' : ''}${priceDiffPct.toFixed(2)}%</b> بالنسبة لـTradingView`
      : 'الفرق: —',
    `Rapid updated_at: <b>${escapeHtml(String(quote?.updatedAt || '—'))}</b>`,
    `Data age: <b>${ageText}</b> · API latency: <b>${typeof latencyMs === 'number' ? `${latencyMs}ms` : '—'}</b>`,
    '',
    '<b>2) Level II — أول 5 مستويات</b>',
    ...levelRows,
    '',
    `Best Bid: <b>${derived?.bestBid ? Number(derived.bestBid.price).toFixed(3) : '—'}</b> · Best Ask: <b>${derived?.bestAsk ? Number(derived.bestAsk.price).toFixed(3) : '—'}</b>`,
    `Spread: <b>${typeof spreadPct === 'number' ? `${spreadPct.toFixed(3)}%` : '—'}</b>`,
    `Top-5 Bid qty: <b>${bidQty.toLocaleString('en-US')}</b> · Ask qty: <b>${askQty.toLocaleString('en-US')}</b>`,
    `Book imbalance: <b>${bidImbalance === null ? '—' : `${bidImbalance.toFixed(1)}% Bid / ${(100 - bidImbalance).toFixed(1)}% Ask`}</b>`,
    '',
    '<b>3) Market breadth من RapidAPI</b>',
    breadthTotal > 0
      ? `Adv <b>${Number(summary.advancing || 0)}</b> · Dec <b>${Number(summary.declining || 0)}</b> · Unchanged <b>${Number(summary.unchanged || 0)}</b>`
      : 'Breadth غير متاح في الرد الحالي.',
    '',
    '<b>4) Free-tier diagnostics</b>',
    `Requests remaining: <b>${escapeHtml(String(quota?.remaining ?? 'غير معلن'))}</b> / ${escapeHtml(String(quota?.limit ?? 'غير معلن'))}`,
    `Reset: <b>${escapeHtml(String(quota?.reset ?? 'غير معلن'))}</b>`,
    '',
    '📱 <b>اختبار بكرة:</b> افتح نفس السهم على Telda/Thndr في نفس اللحظة وقارن Last + Best Bid/Ask + أول 5 مستويات.',
    '⚠️ الـimbalance snapshot فقط؛ الأوردرات ممكن تتغير أو تتسحب ومش بنعتبره إشارة شراء.',
  ].join('\n');
}


export function formatInspectResult(input: {
  symbol: string;
  row: any | null;
  signal: LiveSignal | null;
  market: any;
}): string {
  const { symbol, row, signal, market } = input;

  if (!row) {
    return `❌ مش لاقي <b>${escapeHtml(symbol)}</b> في EGX scanner الحالي.`;
  }

  const close = Number(row.close || 0);
  const changePct = Number(row.changePct || 0);
  const volume = Number(row.volume || 0);
  const turnover = Number(row.turnover || 0);
  const rvol = Number(row.rvol10 || 0);
  const high = Number(row.high || 0);
  const low = Number(row.low || 0);
  const closeLocation = row.closeLocation === null || row.closeLocation === undefined
    ? null
    : Number(row.closeLocation);
  const hodGap = high > 0 ? ((high - close) / high) * 100 : null;
  const marketMedian = Number(market?.medianChangePct || 0);
  const rs = changePct - marketMedian;

  const status = signal
    ? `${stageEmoji(signal.stage)} <b>${stageArabic(signal.stage)}</b> · score ${signal.score.toFixed(1)}/100`
    : '⚪ <b>مفيش Signal رسمية دلوقتي</b>';

  const notes: string[] = [];
  if (changePct >= 5) notes.push('السهم قوي جدًا مقارنة بإقفال امبارح.');
  else if (changePct >= 2) notes.push('السهم إيجابي بوضوح خلال الجلسة.');
  else if (changePct <= -3) notes.push('السهم تحت ضغط بيع واضح خلال الجلسة.');

  if (rvol >= 2) notes.push(`الحجم غير عادي: RVOL ${rvol.toFixed(2)}x.`);
  else if (rvol >= 1.3) notes.push(`الحجم أعلى من المعتاد: RVOL ${rvol.toFixed(2)}x.`);

  if (hodGap !== null && hodGap <= 1) notes.push('السعر قريب جدًا من قمة اليوم.');
  if (closeLocation !== null && closeLocation >= 0.8) notes.push('السعر ماسك الجزء العلوي من range اليوم.');
  if (rs >= 2) notes.push('السهم أقوى من السوق بوضوح.');

  if (signal?.velocity1mPct !== undefined) {
    if (signal.velocity1mPct >= 0.5) notes.push('آخر دقيقة فيها momentum إيجابي سريع.');
    if (signal.velocity1mPct <= -0.5) notes.push('آخر دقيقة فيها فقدان momentum/رجوع سريع.');
  }

  return [
    `🔎 <b>Inspect — ${escapeHtml(symbol)}</b>`,
    status,
    '',
    `السعر: <b>${close.toFixed(3)}</b> · اليوم: <b>${signed(changePct)}</b>`,
    `High / Low: <b>${high.toFixed(3)}</b> / <b>${low.toFixed(3)}</b>`,
    `HOD gap: <b>${hodGap === null ? '—' : `${hodGap.toFixed(2)}%`}</b>`,
    `Volume: <b>${volume.toLocaleString('en-US')}</b> · Turnover: <b>EGP ${money(turnover)}</b>`,
    `RVOL10: <b>${rvol.toFixed(2)}x</b> · RS vs market: <b>${rs >= 0 ? '+' : ''}${rs.toFixed(2)}pp</b>`,
    signal
      ? `1m: <b>${signed(signal.velocity1mPct)}</b> · 3m: <b>${signed(signal.velocity3mPct)}</b> · lane: <b>${escapeHtml(signal.detectionLane || 'LIVE')}</b>`
      : '',
    signal?.regimePhase && signal.regimePhase !== 'NORMAL'
      ? `Regime: <b>${escapeHtml(signal.regimePhase)}</b> · ${(signal.regimeScore ?? 0).toFixed(1)}/100`
      : '',
    '',
    '<b>قراءتي المبسطة:</b>',
    ...(notes.length ? notes.map((note) => `• ${note}`) : ['• مفيش حاجة استثنائية واضحة من المقاييس الحالية.']),
    '',
    'ℹ️ مصدر السعر الحالي للـinspect لسه TradingView لحد ما نثبت الـlive feed بكرة.',
  ].filter(Boolean).join('\n');
}

export function formatWhyResult(input: {
  symbol: string;
  row: any | null;
  signal: LiveSignal | null;
  market: any;
}): string {
  const { symbol, row, signal, market } = input;

  if (!row) return `❌ مش لاقي <b>${escapeHtml(symbol)}</b> في السوق الحالي.`;

  if (signal) {
    return [
      `🧠 <b>Why — ${escapeHtml(symbol)}</b>`,
      `الحالة: ${stageEmoji(signal.stage)} <b>${stageArabic(signal.stage)}</b> · score ${signal.score.toFixed(1)}/100`,
      '',
      '<b>الرادار شايفه ليه؟</b>',
      ...(signal.reasons?.length
        ? signal.reasons.slice(0, 8).map((reason) => `• ${escapeHtml(reason)}`)
        : ['• combination من السعر + الحجم + القوة النسبية']),
      '',
      `1m ${signed(signal.velocity1mPct)} · 3m ${signed(signal.velocity3mPct)} · HOD gap ${signal.hodDistancePct.toFixed(2)}%`,
      `RVOL ${signal.rvol10.toFixed(2)}x · RS ${signal.relativeStrengthPct >= 0 ? '+' : ''}${signal.relativeStrengthPct.toFixed(2)}pp`,
      '',
      '<b>المهم:</b> الـscore ترتيب نشاط، مش نسبة نجاح.',
    ].join('\n');
  }

  const changePct = Number(row.changePct || 0);
  const rvol = Number(row.rvol10 || 0);
  const closeLocation = Number(row.closeLocation ?? 0.5);
  const rs = changePct - Number(market?.medianChangePct || 0);

  const blockers: string[] = [];
  if (changePct < 1.5) blockers.push(`الحركة اليومية ${signed(changePct)} مش قوية كفاية للـsession-leader lane.`);
  if (rvol < 1.3) blockers.push(`RVOL ${rvol.toFixed(2)}x مش ملفت قوي.`);
  if (closeLocation < 0.6) blockers.push('السعر مش ماسك الجزء القوي من range اليوم.');
  if (rs < 1) blockers.push(`Relative strength ${rs >= 0 ? '+' : ''}${rs.toFixed(2)}pp مش متفوق بوضوح على السوق.`);

  return [
    `🧠 <b>Why — ${escapeHtml(symbol)}</b>`,
    '⚪ السهم <b>مش Signal رسمية دلوقتي</b>.',
    '',
    '<b>أسباب محتملة:</b>',
    ...(blockers.length ? blockers.map((item) => `• ${item}`) : ['• المقاييس اليومية كويسة، لكن شروط الـmomentum اللحظي/score الكاملة لسه ما اكتملتش.']),
    '',
    'ده تفسير للشروط الحالية، مش حكم إن السهم وحش.',
  ].join('\n');
}

export function formatLeadersResult(result: any): string {
  const leaders = Array.isArray(result?.leaders) ? result.leaders.slice(0, 10) : [];
  const market = result?.market || {};

  if (!leaders.length) {
    return '📈 <b>Leaders</b>\nمفيش liquid leaders متاحة في الـsnapshot الحالي.';
  }

  return [
    '📈 <b>Current Liquid Leaders</b>',
    `Market: <b>${escapeHtml(String(market.regime || 'UNKNOWN'))}</b> · Adv ${Number(market.advancers || 0)} / Dec ${Number(market.decliners || 0)}`,
    '',
    ...leaders.map((leader: any, index: number) => [
      `${index + 1}. <b>${escapeHtml(String(leader.ticker || '-'))}</b> · ${Number(leader.close || 0).toFixed(3)} · Day ${signed(Number(leader.changePct || 0))}`,
      `   RVOL ${Number(leader.rvol10 || 0).toFixed(2)}x · HOD gap ${Number(leader.hodDistancePct || 0).toFixed(2)}% · RS ${Number(leader.relativeStrengthPct || 0) >= 0 ? '+' : ''}${Number(leader.relativeStrengthPct || 0).toFixed(2)}pp · EGP ${money(Number(leader.turnover || 0))}`,
    ].join('\n')),
    '',
    'دي قائمة اكتشاف، مش ترتيب "أفضل سهم للشراء".',
  ].join('\n');
}

export function formatSessionResult(result: any): string {
  const market = result?.market || {};
  const adv = Number(market.advancers || 0);
  const dec = Number(market.decliners || 0);
  const unchanged = Number(market.unchanged || 0);
  const directional = adv + dec;
  const breadth = directional > 0 ? (adv / directional) * 100 : 50;
  const regime = String(market.regime || 'UNKNOWN');

  let read = 'السوق متوازن/مختلط نسبيًا.';
  if (regime === 'RISK_ON') read = 'عدد الأسهم الصاعدة أعلى بوضوح؛ البيئة العامة داعمة نسبيًا للمومنتوم.';
  if (regime === 'RISK_OFF') read = 'الهابطين مسيطرين؛ أي سهم قوي محتاج Relative Strength استثنائي أكتر.';
  if (regime === 'MIXED') read = 'الحركة انتقائية؛ ركّز على الأسهم الأقوى بدل افتراض إن السوق كله طالع.';

  return [
    '🌐 <b>EGX Session</b>',
    result?.atCairo ? `🕒 ${escapeHtml(String(result.atCairo))}` : '',
    '',
    `Regime: <b>${escapeHtml(regime)}</b>`,
    `Advancers: <b>${adv}</b> · Decliners: <b>${dec}</b> · Unchanged: <b>${unchanged}</b>`,
    `Breadth: <b>${breadth.toFixed(1)}%</b>`,
    `Median stock change: <b>${signed(Number(market.medianChangePct || 0))}</b>`,
    `Signals الآن: <b>${Number(result?.signalCount || 0)}</b>`,
    '',
    '<b>يعني إيه؟</b>',
    read,
  ].filter(Boolean).join('\n');
}

export function formatWatchlistResult(symbols: string[], state: RadarState): string {
  if (!symbols.length) {
    return '⭐ <b>Watchlist</b>\nفاضية دلوقتي. استخدم <code>/watch BIOC</code>.';
  }

  const byTicker = new Map((state.latestSignals || []).map((signal) => [signal.ticker, signal]));

  return [
    '⭐ <b>Personal Watchlist</b>',
    '',
    ...symbols.map((symbol, index) => {
      const signal = byTicker.get(symbol);
      if (!signal) return `${index + 1}. <b>${escapeHtml(symbol)}</b> · no active radar signal`;
      return `${index + 1}. <b>${escapeHtml(symbol)}</b> · ${stageEmoji(signal.stage)} ${signal.stage} · ${signal.score.toFixed(1)} · Day ${signed(signal.changePct)}`;
    }),
    '',
    'استخدم /inspect TICKER لأي سهم عشان تشوف التفاصيل.',
  ].join('\n');
}

export function formatRecapResult(
  sessionDate: string,
  recap: { events: any[]; outcomes: any[] },
): string {
  const events = Array.isArray(recap?.events) ? recap.events : [];
  const outcomes = Array.isArray(recap?.outcomes) ? recap.outcomes : [];

  if (!events.length) {
    return [
      '🧾 <b>Session Recap</b>',
      `Session: <b>${escapeHtml(sessionDate || '-')}</b>`,
      '',
      'مفيش alert events متسجلة للجلسة دي.',
    ].join('\n');
  }

  const outcomeMap = new Map<string, any[]>();
  for (const outcome of outcomes) {
    const id = String(outcome?.event_id || '');
    if (!id) continue;
    const current = outcomeMap.get(id) || [];
    current.push(outcome);
    outcomeMap.set(id, current);
  }

  const rows = events.slice(-12).map((event: any, index: number) => {
    const eventOutcomes = (outcomeMap.get(String(event.event_id || '')) || [])
      .sort((a, b) => Number(a.horizon_minutes || 0) - Number(b.horizon_minutes || 0));
    const latest = eventOutcomes.at(-1);
    const bestMfe = eventOutcomes.length
      ? Math.max(...eventOutcomes.map((x) => Number(x.mfe_pct || 0)))
      : null;
    const worstMae = eventOutcomes.length
      ? Math.min(...eventOutcomes.map((x) => Number(x.mae_pct || 0)))
      : null;
    const time = String(event.observed_at || '').slice(11, 16);

    return [
      `${index + 1}. <b>${escapeHtml(String(event.ticker || '-'))}</b> · ${escapeHtml(String(event.stage || '-'))} · score ${Number(event.score || 0).toFixed(1)} · ${time || '--:--'} UTC`,
      `   Alert price ${Number(event.entry_price || 0).toFixed(3)}${latest ? ` · ${Number(latest.horizon_minutes)}m ${signed(Number(latest.forward_return_pct || 0))}` : ' · outcome pending'}`,
      bestMfe === null ? '' : `   MFE <b>${signed(bestMfe)}</b> · MAE <b>${signed(worstMae || 0)}</b>`,
    ].filter(Boolean).join('\n');
  });

  return [
    '🧾 <b>Session Recap</b>',
    `Session: <b>${escapeHtml(sessionDate)}</b> · Alerts: <b>${events.length}</b>`,
    '',
    ...rows,
    '',
    'MFE = أكبر حركة لصالح الإشارة بعد التنبيه. MAE = أكبر حركة عكسها.',
  ].join('\n');
}

export function telegramTermsText(): string {
  return [
    '📚 <b>مصطلحات الرادار السريعة</b>',
    '',
    '<b>HOD</b> — High of Day، أعلى سعر وصل له السهم النهارده.',
    '<b>HOD gap</b> — السهم بعيد كام % عن أعلى سعر اليوم.',
    '<b>RVOL</b> — حجم التداول الحالي مقارنة بالمعتاد. 2x يعني تقريبًا ضعف الطبيعي.',
    '<b>RS</b> — Relative Strength، قوة السهم مقارنة بمتوسط السوق، مش RSI.',
    '<b>Breadth</b> — نسبة واتجاه الأسهم الصاعدة مقابل الهابطة.',
    '<b>WATCH</b> — سهم يستحق المتابعة، مش أمر شراء.',
    '<b>TRIGGERING</b> — الزخم اللحظي بيتقوى والإشارة بتتكون.',
    '<b>BREAKOUT</b> — اختراق لحظي قوي/قمة جديدة حسب شروط الرادار.',
    '<b>MFE</b> — أكبر مكسب نظري بعد التنبيه.',
    '<b>MAE</b> — أكبر حركة سلبية بعد التنبيه.',
    '<b>Regime</b> — هل السهم دخل سلوك momentum غير طبيعي عبر أكتر من جلسة.',
    '',
    'استخدم <code>/why TICKER</code> عشان البوت يشرح إشارة سهم بعينه.',
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
    '🤖 <b>EGX Radar Commands</b>',
    '',
    '⚡ /live — Intraday momentum: 20s velocity + volume + session leaders',
    '🧭 /regime — Multi-session regime detector: BIOC/TYCN-style abnormal momentum',
    '📡 /scan — Combined overview لكل الـscan lanes',
    '🔎 /inspect TICKER — تحليل سهم واحد بلغة بسيطة',
    '🧠 /why TICKER — ليه السهم Signal أو ليه مش داخل الرادار',
    '📈 /leaders — أقوى liquid movers الحالية',
    '🌐 /session — حالة السوق والـbreadth',
    '⭐ /watch TICKER — ضيف سهم للمتابعة الشخصية',
    '⭐ /unwatch TICKER — شيل سهم من المتابعة',
    '⭐ /watchlist — اعرض قائمة المتابعة',
    '🧾 /recap — مراجعة alerts الجلسة ونتايجها',
    '📚 /terms — شرح المصطلحات للمبتدئ',
    '🧪 /feedtest TICKER — اختبار مؤقت لـRapidAPI: السعر + Level II + مقارنة TradingView',
    '🛰 /status — آخر حالة وstate للـradar',
    '❓ /help — شرح الأوامر',
    '',
    '<b>قاعدة التنظيم:</b> كل scanning strategy جديدة هتاخد command مستقل، و/scan يفضل overview جامع بس.',
    '',
    'الـalerts التلقائية بتفضل شغالة أثناء الجلسة بشكل مستقل عن الـmanual commands.',
  ].join('\n');
}

export async function sendTelegramAlerts(env: RadarEnv, signals: LiveSignal[]): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN?.trim() || !env.TELEGRAM_CHAT_ID?.trim() || !signals.length) return;

  const chatId = env.TELEGRAM_CHAT_ID.trim();

  // Send each signal separately so the beginner explanation remains readable
  // and we stay comfortably below Telegram's per-message size limit.
  for (const signal of signals.slice(0, 5)) {
    await sendTelegramMessage(env, chatId, formatBeginnerAlert(signal));
  }
}
