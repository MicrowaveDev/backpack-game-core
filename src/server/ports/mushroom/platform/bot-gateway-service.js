function requiredDependency(name) {
  return () => {
    throw new Error(`createTelegramBotGatewayPort requires ${name}`);
  };
}

export function createTelegramBotGatewayPort(options = {}) {
  const {
    createTelegramAuthCode = requiredDependency('createTelegramAuthCode'),
    confirmTelegramAuthCode = requiredDependency('confirmTelegramAuthCode'),
    completeTelegramSuccessfulPayment = requiredDependency('completeTelegramSuccessfulPayment'),
    getPaymentSupportLinks = requiredDependency('getPaymentSupportLinks'),
    validateTelegramPreCheckout = requiredDependency('validateTelegramPreCheckout'),
    env = {},
    defaultFetch = globalThis.fetch,
    defaultMiniAppName = 'app',
    defaultGameShortName = 'game',
    copy = {}
  } = options;

function normalizeBotUsername(botUsername) {
  return String(botUsername || '').trim().replace(/^@+/, '');
}

function miniAppName() {
  return env.TELEGRAM_MINI_APP_NAME || defaultMiniAppName;
}

function gameShortName() {
  return env.TELEGRAM_GAME_SHORT_NAME || defaultGameShortName;
}

function buildMiniAppLink(botUsername, startapp) {
  const username = normalizeBotUsername(botUsername);
  const appName = miniAppName();
  return `https://t.me/${username}/${startapp ? `${appName}?startapp=${encodeURIComponent(startapp)}` : appName}`;
}

function buildDmStartLink(botUsername, startParam) {
  return `https://t.me/${normalizeBotUsername(botUsername)}?start=${encodeURIComponent(startParam)}`;
}

function createMentionReply({ botUsername, chatType = 'group' }) {
  const playLink = buildMiniAppLink(botUsername, `entry_${chatType}`);
  return {
    text: copy.mentionText || 'Open the game and start playing.',
    ctas: [
      { label: 'Play', url: playLink },
      { label: 'Start in DM', url: buildDmStartLink(botUsername, 'play') }
    ]
  };
}

function createTelegramInlineKeyboard(reply) {
  const buttons = (reply?.ctas || []).map((cta) => ([{ text: cta.label, url: cta.url }]));
  return buttons.length ? { inline_keyboard: buttons } : undefined;
}

function createPaymentSupportReply() {
  const { supportUrl, termsUrl } = getPaymentSupportLinks({
    fallbackUrl: env.PUBLIC_GAME_URL || ''
  });
  return {
    text: copy.paymentSupportText || [
      'Payment support: contact the game team before opening a dispute.',
      'Wallet purchases are granted only after verified provider payment callbacks.',
      'Refunds and failed or late payments are handled by support review.'
    ].join('\n'),
    ctas: [
      supportUrl ? { label: 'Support', url: supportUrl } : null,
      termsUrl ? { label: 'Terms', url: termsUrl } : null
    ].filter(Boolean)
  };
}

function appendQuery(url, params) {
  const target = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') target.searchParams.set(key, String(value));
  }
  return target.toString();
}

function buildGameLaunchUrl({ botUsername, callbackQuery, shortName = gameShortName() } = {}) {
  const baseUrl = env.TELEGRAM_GAME_URL || env.PUBLIC_GAME_URL || '';
  const startParam = `game_${shortName}`;
  if (!baseUrl) return buildMiniAppLink(botUsername, startParam);

  return appendQuery(baseUrl, {
    startapp: startParam,
    tgGame: shortName,
    tgChatInstance: callbackQuery?.chat_instance,
    tgGameMessageId: callbackQuery?.message?.message_id,
    tgGameChatId: callbackQuery?.message?.chat?.id,
    tgInlineMessageId: callbackQuery?.inline_message_id
  });
}

function buildTelegramGameScorePayload({
  telegramUserId,
  score,
  chatId,
  messageId,
  inlineMessageId,
  force = false,
  disableEditMessage = false
} = {}) {
  const normalizedScore = Math.max(0, Math.floor(Number(score)));
  if (!Number.isFinite(normalizedScore)) {
    throw new Error('Telegram game score must be a non-negative number');
  }
  const payload = {
    user_id: Number(telegramUserId),
    score: normalizedScore,
    force: Boolean(force),
    disable_edit_message: Boolean(disableEditMessage)
  };
  if (!Number.isFinite(payload.user_id)) {
    throw new Error('Telegram user id is required for game scores');
  }
  if (inlineMessageId) {
    payload.inline_message_id = String(inlineMessageId);
    return payload;
  }
  if (chatId == null || messageId == null) {
    throw new Error('Telegram game score needs chat/message ids or an inline message id');
  }
  payload.chat_id = chatId;
  payload.message_id = Number(messageId);
  return payload;
}

async function callTelegramBotApi(method, payload, {
  token = env.TELEGRAM_BOT_TOKEN,
  fetchImpl = defaultFetch
} = {}) {
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');
  if (typeof fetchImpl !== 'function') throw new Error('fetch is required');

  const response = await fetchImpl(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {})
  });
  const json = await response.json();
  if (!json.ok) {
    throw new Error(`Telegram ${method} failed: ${json.description || response.status}`);
  }
  return json.result;
}

function buildWebhookUrl(baseUrl = env.PUBLIC_GAME_URL || env.TELEGRAM_GAME_URL || '') {
  if (!baseUrl) return '';
  return new URL('/api/bot/webhook', baseUrl).toString();
}

async function getTelegramWebhookInfo(options = {}) {
  return callTelegramBotApi('getWebhookInfo', {}, options);
}

async function setTelegramWebhook({ webhookUrl = buildWebhookUrl(), secretToken = env.TELEGRAM_WEBHOOK_SECRET } = {}, options = {}) {
  if (!webhookUrl) throw new Error('PUBLIC_GAME_URL or TELEGRAM_GAME_URL is required to set Telegram webhook');
  if (!secretToken && env.NODE_ENV === 'production') {
    throw new Error('TELEGRAM_WEBHOOK_SECRET is required to set Telegram webhook in production');
  }
  return callTelegramBotApi('setWebhook', {
    url: webhookUrl,
    secret_token: secretToken || undefined,
    allowed_updates: ['message', 'callback_query', 'pre_checkout_query']
  }, options);
}

async function ensureTelegramWebhook(options = {}) {
  const webhookUrl = options.webhookUrl || buildWebhookUrl();
  if (!env.TELEGRAM_BOT_TOKEN && !options.token) {
    return { skipped: true, reason: 'missing_token' };
  }
  if (!webhookUrl) {
    return { skipped: true, reason: 'missing_public_url' };
  }

  const info = await getTelegramWebhookInfo(options);
  if (info?.url === webhookUrl) {
    return { changed: false, url: webhookUrl };
  }

  await setTelegramWebhook({ webhookUrl, secretToken: options.secretToken }, options);
  return { changed: true, previousUrl: info?.url || '', url: webhookUrl };
}

async function answerTelegramGameCallback(callbackQuery, options = {}) {
  const shortName = options.shortName || gameShortName();
  const requestedGame = callbackQuery?.game_short_name;
  if (!callbackQuery?.id) throw new Error('Callback query id is required');

  if (requestedGame !== shortName) {
    return callTelegramBotApi('answerCallbackQuery', {
      callback_query_id: callbackQuery.id,
      text: 'Unknown game',
      show_alert: true
    }, options);
  }

  return callTelegramBotApi('answerCallbackQuery', {
    callback_query_id: callbackQuery.id,
    url: buildGameLaunchUrl({
      botUsername: options.botUsername || env.TELEGRAM_BOT_USERNAME,
      callbackQuery,
      shortName
    })
  }, options);
}

async function reportTelegramGameScore(scoreInput, options = {}) {
  return callTelegramBotApi('setGameScore', buildTelegramGameScorePayload(scoreInput), options);
}

async function answerTelegramPreCheckoutQuery(preCheckoutQueryId, ok, errorMessage = '', options = {}) {
  if (!preCheckoutQueryId) throw new Error('Pre-checkout query id is required');
  return callTelegramBotApi('answerPreCheckoutQuery', {
    pre_checkout_query_id: preCheckoutQueryId,
    ok: Boolean(ok),
    error_message: ok ? undefined : errorMessage || 'Payment cannot be processed'
  }, options);
}

async function sendTelegramMessage(chatId, text, options = {}) {
  return callTelegramBotApi('sendMessage', {
    chat_id: chatId,
    text,
    reply_markup: options.replyMarkup
  }, options);
}

async function createBrowserFallbackPayload(botUsername) {
  const authCode = await createTelegramAuthCode();
  return {
    ...authCode,
    botUsername,
    botUrl: buildDmStartLink(botUsername, `auth-${authCode.publicCode}`),
    expiresInSeconds: 600
  };
}

async function handleBotStartParam(startParam, telegramUser) {
  if (!startParam?.startsWith('auth-')) {
    return {
      kind: 'launch',
      text: copy.launchText || 'Open the Mini App to continue.'
    };
  }

  const publicCode = startParam.replace(/^auth-/, '');
  await confirmTelegramAuthCode(publicCode, telegramUser);
  return {
    kind: 'auth_confirmed',
    text: copy.authConfirmedText || 'Authentication confirmed. Return to the app.'
  };
}

async function handleTelegramWebhook(update, options = {}) {
  const preCheckoutQuery = update?.pre_checkout_query;
  if (preCheckoutQuery?.id) {
    const validation = await validateTelegramPreCheckout(preCheckoutQuery);
    await answerTelegramPreCheckoutQuery(
      preCheckoutQuery.id,
      validation.ok,
      validation.errorMessage,
      options
    );
    return {
      kind: 'wallet_pre_checkout',
      answered: true,
      ok: validation.ok
    };
  }

  const callbackQuery = update?.callback_query;
  if (callbackQuery?.game_short_name) {
    await answerTelegramGameCallback(callbackQuery, options);
    return { kind: 'game_callback', answered: true };
  }

  const message = update?.message;
  if (message?.successful_payment) {
    const result = await completeTelegramSuccessfulPayment(message.successful_payment);
    return {
      kind: 'wallet_payment',
      answered: true,
      intentId: result.intent.id,
      alreadyCompleted: result.alreadyCompleted
    };
  }

  const text = typeof message?.text === 'string' ? message.text.trim() : '';
  if (/^\/paysupport(?:@\w+)?(?:\s|$)/.test(text) && message?.chat?.id) {
    const reply = createPaymentSupportReply();
    await sendTelegramMessage(message.chat.id, reply.text, {
      ...options,
      replyMarkup: createTelegramInlineKeyboard(reply)
    });
    return { kind: 'payment_support', answered: true };
  }

  if (/^\/terms(?:@\w+)?(?:\s|$)/.test(text) && message?.chat?.id) {
    const reply = createPaymentSupportReply();
    await sendTelegramMessage(message.chat.id, reply.text, {
      ...options,
      replyMarkup: createTelegramInlineKeyboard(reply)
    });
    return { kind: 'payment_terms', answered: true };
  }

  const startMatch = text.match(/^\/start(?:@\w+)?(?:\s+(.+))?$/);
  if (startMatch && message?.chat?.id) {
    const startParam = startMatch[1] || 'play';
    const user = message.from || {};
    const result = await handleBotStartParam(startParam, {
      id: user.id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      language_code: user.language_code
    });
    await sendTelegramMessage(message.chat.id, result.text, options);
    return { kind: result.kind, answered: true };
  }

  const username = normalizeBotUsername(options.botUsername || env.TELEGRAM_BOT_USERNAME);
  if (username && text.includes(`@${username}`) && message?.chat?.id) {
    const reply = createMentionReply({
      botUsername: options.botUsername || env.TELEGRAM_BOT_USERNAME,
      chatType: message.chat.type || 'group'
    });
    await sendTelegramMessage(message.chat.id, reply.text, {
      ...options,
      replyMarkup: createTelegramInlineKeyboard(reply)
    });
    return { kind: 'mention_reply', answered: true };
  }

  return { kind: 'ignored', answered: false };
}

  return {
    normalizeBotUsername,
    miniAppName,
    gameShortName,
    buildMiniAppLink,
    buildDmStartLink,
    createMentionReply,
    createTelegramInlineKeyboard,
    createPaymentSupportReply,
    buildGameLaunchUrl,
    buildTelegramGameScorePayload,
    callTelegramBotApi,
    buildWebhookUrl,
    getTelegramWebhookInfo,
    setTelegramWebhook,
    ensureTelegramWebhook,
    answerTelegramGameCallback,
    reportTelegramGameScore,
    answerTelegramPreCheckoutQuery,
    sendTelegramMessage,
    createBrowserFallbackPayload,
    handleBotStartParam,
    handleTelegramWebhook
  };
}
