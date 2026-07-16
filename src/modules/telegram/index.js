export function normalizeTelegramBotUsername(value) {
  return String(value || '').trim().replace(/^@+/, '');
}

export function normalizeTelegramChatTarget(target) {
  if (target == null || String(target).trim() === '') {
    throw new Error('Telegram chat target is required');
  }
  const value = String(target).trim();
  if (value.startsWith('@') || /^-\d+$/.test(value)) return value;
  if (/^\d+$/.test(value)) return `-100${value}`;
  return `@${value.replace(/^https:\/\/t\.me\//, '').replace(/^@/, '')}`;
}

export function buildTelegramMiniAppLink({
  botUsername,
  miniAppName = 'app',
  startParam
} = {}) {
  const username = normalizeTelegramBotUsername(botUsername);
  if (!username) throw new Error('Telegram bot username is required');
  const appName = String(miniAppName || 'app').trim();
  const suffix = startParam
    ? `${appName}?startapp=${encodeURIComponent(startParam)}`
    : appName;
  return `https://t.me/${username}/${suffix}`;
}

export function buildTelegramDmStartLink({ botUsername, startParam } = {}) {
  const username = normalizeTelegramBotUsername(botUsername);
  if (!username) throw new Error('Telegram bot username is required');
  const query = startParam ? `?start=${encodeURIComponent(startParam)}` : '';
  return `https://t.me/${username}${query}`;
}

export function createTelegramInlineKeyboard(reply = {}) {
  const buttons = (reply.ctas || [])
    .filter((cta) => cta?.label && cta?.url)
    .map((cta) => ([{ text: String(cta.label), url: String(cta.url) }]));
  return buttons.length ? { inline_keyboard: buttons } : undefined;
}

export function buildTelegramGameScorePayload({
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
  const userId = Number(telegramUserId);
  if (!Number.isFinite(userId)) {
    throw new Error('Telegram user id is required for game scores');
  }
  const payload = {
    user_id: userId,
    score: normalizedScore,
    force: Boolean(force),
    disable_edit_message: Boolean(disableEditMessage)
  };
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

export function parseTelegramCommand(text) {
  const match = String(text || '').trim().match(/^\/([a-z0-9_]+)(?:@([a-z0-9_]+))?(?:\s+([\s\S]*))?$/i);
  if (!match) return null;
  return {
    command: match[1].toLowerCase(),
    botUsername: normalizeTelegramBotUsername(match[2]),
    args: String(match[3] || '').trim()
  };
}

export function normalizeTelegramUpdate(update = {}) {
  if (update.pre_checkout_query?.id) {
    return { kind: 'pre_checkout_query', value: update.pre_checkout_query, update };
  }
  if (update.callback_query?.id) {
    return { kind: 'callback_query', value: update.callback_query, update };
  }
  const message = update.message || update.edited_message;
  if (message?.successful_payment) {
    return { kind: 'successful_payment', value: message.successful_payment, message, update };
  }
  const command = parseTelegramCommand(message?.text);
  if (command) return { kind: 'command', value: command, message, update };
  if (message) return { kind: 'message', value: message, message, update };
  return { kind: 'ignored', value: null, update };
}
