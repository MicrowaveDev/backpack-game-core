import {
  buildTelegramDmStartLink,
  buildTelegramGameScorePayload,
  buildTelegramMiniAppLink,
  createTelegramInlineKeyboard,
  normalizeTelegramBotUsername,
  parseTelegramCommand
} from '../../modules/telegram/index.js';
import { createTelegramBotApiClient } from './transport.js';

function requiredDependency(name) {
  return () => {
    throw new Error(`createTelegramBotRuntime requires ${name}`);
  };
}

function appendQuery(url, params) {
  const target = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') target.searchParams.set(key, String(value));
  }
  return target.toString();
}

export function createTelegramBotRuntime(options = {}) {
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
  const api = createTelegramBotApiClient({
    tokenProvider: () => env.TELEGRAM_BOT_TOKEN,
    fetchImpl: defaultFetch,
    sleep: options.sleep,
    maxRetries: options.maxRetries
  });

  const miniAppName = () => env.TELEGRAM_MINI_APP_NAME || defaultMiniAppName;
  const gameShortName = () => env.TELEGRAM_GAME_SHORT_NAME || defaultGameShortName;
  const buildMiniAppLink = (botUsername, startapp) => buildTelegramMiniAppLink({
    botUsername,
    miniAppName: miniAppName(),
    startParam: startapp
  });
  const buildDmStartLink = (botUsername, startParam) => buildTelegramDmStartLink({ botUsername, startParam });

  function createMentionReply({ botUsername, chatType = 'group' }) {
    return {
      text: copy.mentionText || 'Open the game and start playing.',
      ctas: [
        { label: 'Play', url: buildMiniAppLink(botUsername, `entry_${chatType}`) },
        { label: 'Start in DM', url: buildDmStartLink(botUsername, 'play') }
      ]
    };
  }

  function createPaymentSupportReply() {
    const { supportUrl, termsUrl } = getPaymentSupportLinks({ fallbackUrl: env.PUBLIC_GAME_URL || '' });
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

  function callTelegramBotApi(method, payload, callOptions = {}) {
    return api.call(method, payload, {
      token: callOptions.token,
      fetchImpl: callOptions.fetchImpl
    });
  }

  function buildWebhookUrl(baseUrl = env.PUBLIC_GAME_URL || env.TELEGRAM_GAME_URL || '') {
    return baseUrl ? new URL('/api/bot/webhook', baseUrl).toString() : '';
  }

  const getTelegramWebhookInfo = (callOptions = {}) => callTelegramBotApi('getWebhookInfo', {}, callOptions);

  async function setTelegramWebhook({ webhookUrl = buildWebhookUrl(), secretToken = env.TELEGRAM_WEBHOOK_SECRET } = {}, callOptions = {}) {
    if (!webhookUrl) throw new Error('PUBLIC_GAME_URL or TELEGRAM_GAME_URL is required to set Telegram webhook');
    if (!secretToken && env.NODE_ENV === 'production') {
      throw new Error('TELEGRAM_WEBHOOK_SECRET is required to set Telegram webhook in production');
    }
    return callTelegramBotApi('setWebhook', {
      url: webhookUrl,
      secret_token: secretToken || undefined,
      allowed_updates: ['message', 'callback_query', 'pre_checkout_query']
    }, callOptions);
  }

  async function ensureTelegramWebhook(callOptions = {}) {
    const webhookUrl = callOptions.webhookUrl || buildWebhookUrl();
    if (!env.TELEGRAM_BOT_TOKEN && !callOptions.token) return { skipped: true, reason: 'missing_token' };
    if (!webhookUrl) return { skipped: true, reason: 'missing_public_url' };
    const info = await getTelegramWebhookInfo(callOptions);
    if (info?.url === webhookUrl) return { changed: false, url: webhookUrl };
    await setTelegramWebhook({ webhookUrl, secretToken: callOptions.secretToken }, callOptions);
    return { changed: true, previousUrl: info?.url || '', url: webhookUrl };
  }

  async function answerTelegramGameCallback(callbackQuery, callOptions = {}) {
    const shortName = callOptions.shortName || gameShortName();
    if (!callbackQuery?.id) throw new Error('Callback query id is required');
    if (callbackQuery.game_short_name !== shortName) {
      return callTelegramBotApi('answerCallbackQuery', {
        callback_query_id: callbackQuery.id,
        text: 'Unknown game',
        show_alert: true
      }, callOptions);
    }
    return callTelegramBotApi('answerCallbackQuery', {
      callback_query_id: callbackQuery.id,
      url: buildGameLaunchUrl({
        botUsername: callOptions.botUsername || env.TELEGRAM_BOT_USERNAME,
        callbackQuery,
        shortName
      })
    }, callOptions);
  }

  const reportTelegramGameScore = (scoreInput, callOptions = {}) => (
    callTelegramBotApi('setGameScore', buildTelegramGameScorePayload(scoreInput), callOptions)
  );

  function answerTelegramPreCheckoutQuery(preCheckoutQueryId, ok, errorMessage = '', callOptions = {}) {
    if (!preCheckoutQueryId) throw new Error('Pre-checkout query id is required');
    return callTelegramBotApi('answerPreCheckoutQuery', {
      pre_checkout_query_id: preCheckoutQueryId,
      ok: Boolean(ok),
      error_message: ok ? undefined : errorMessage || 'Payment cannot be processed'
    }, callOptions);
  }

  function sendTelegramMessage(chatId, text, callOptions = {}) {
    return api.sendMessage(chatId, text, {
      ...callOptions,
      normalizeTarget: false,
      replyMarkup: callOptions.replyMarkup
    });
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
      return { kind: 'launch', text: copy.launchText || 'Open the Mini App to continue.' };
    }
    await confirmTelegramAuthCode(startParam.replace(/^auth-/, ''), telegramUser);
    return { kind: 'auth_confirmed', text: copy.authConfirmedText || 'Authentication confirmed. Return to the app.' };
  }

  async function handleTelegramWebhook(update, callOptions = {}) {
    const preCheckoutQuery = update?.pre_checkout_query;
    if (preCheckoutQuery?.id) {
      const validation = await validateTelegramPreCheckout(preCheckoutQuery);
      await answerTelegramPreCheckoutQuery(preCheckoutQuery.id, validation.ok, validation.errorMessage, callOptions);
      return { kind: 'wallet_pre_checkout', answered: true, ok: validation.ok };
    }
    const callbackQuery = update?.callback_query;
    if (callbackQuery?.game_short_name) {
      await answerTelegramGameCallback(callbackQuery, callOptions);
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
    const command = parseTelegramCommand(text);
    if ((command?.command === 'paysupport' || command?.command === 'terms') && message?.chat?.id) {
      const reply = createPaymentSupportReply();
      await sendTelegramMessage(message.chat.id, reply.text, {
        ...callOptions,
        replyMarkup: createTelegramInlineKeyboard(reply)
      });
      return { kind: command.command === 'terms' ? 'payment_terms' : 'payment_support', answered: true };
    }
    if (command?.command === 'start' && message?.chat?.id) {
      const user = message.from || {};
      const result = await handleBotStartParam(command.args || 'play', {
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        language_code: user.language_code
      });
      await sendTelegramMessage(message.chat.id, result.text, callOptions);
      return { kind: result.kind, answered: true };
    }
    const username = normalizeTelegramBotUsername(callOptions.botUsername || env.TELEGRAM_BOT_USERNAME);
    if (username && text.includes(`@${username}`) && message?.chat?.id) {
      const reply = createMentionReply({
        botUsername: callOptions.botUsername || env.TELEGRAM_BOT_USERNAME,
        chatType: message.chat.type || 'group'
      });
      await sendTelegramMessage(message.chat.id, reply.text, {
        ...callOptions,
        replyMarkup: createTelegramInlineKeyboard(reply)
      });
      return { kind: 'mention_reply', answered: true };
    }
    return { kind: 'ignored', answered: false };
  }

  return Object.freeze({
    normalizeBotUsername: normalizeTelegramBotUsername,
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
  });
}
