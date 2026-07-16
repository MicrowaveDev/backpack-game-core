import { normalizeTelegramChatTarget } from '../../modules/telegram/index.js';

function retryAfterSeconds(payload) {
  const direct = Number(payload?.parameters?.retry_after || 0);
  if (direct > 0) return direct;
  const match = String(payload?.description || '').match(/retry after (\d+)/i);
  return match ? Number(match[1]) : 0;
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createTelegramBotApiClient({
  token,
  tokenProvider,
  fetchImpl = globalThis.fetch,
  apiBaseUrl = 'https://api.telegram.org',
  sleep = defaultSleep,
  maxRetries = 3
} = {}) {
  async function call(method, payload = {}, options = {}, attempt = 0) {
    const selectedToken = options.token || (typeof tokenProvider === 'function' ? tokenProvider() : token);
    const selectedFetch = options.fetchImpl || fetchImpl;
    if (!selectedToken) throw new Error('Telegram bot token is required');
    if (typeof selectedFetch !== 'function') throw new Error('fetch is required');
    const body = options.body || JSON.stringify(payload || {});
    const response = await selectedFetch(`${apiBaseUrl}/bot${selectedToken}/${method}`, {
      method: 'POST',
      ...(options.body ? {} : { headers: { 'Content-Type': 'application/json' } }),
      body
    });
    const json = await response.json();
    const waitSeconds = retryAfterSeconds(json);
    if (waitSeconds > 0 && attempt < maxRetries) {
      await sleep((waitSeconds + 1) * 1000);
      return call(method, payload, options, attempt + 1);
    }
    if (response.ok === false || !json.ok) {
      const error = new Error(`Telegram Bot API ${method} failed: ${json.description || response.statusText || response.status}`);
      error.status = response.status;
      error.telegram = json;
      throw error;
    }
    return json.result;
  }

  function sendMessage(chatTarget, text, options = {}) {
    return call('sendMessage', {
      chat_id: options.normalizeTarget === false ? chatTarget : normalizeTelegramChatTarget(chatTarget),
      text,
      reply_markup: options.replyMarkup
    }, options);
  }

  async function editMessageText(chatTarget, messageId, text, options = {}) {
    try {
      return await call('editMessageText', {
        chat_id: options.normalizeTarget === false ? chatTarget : normalizeTelegramChatTarget(chatTarget),
        message_id: Number(messageId),
        text
      }, options);
    } catch (error) {
      if (String(error.message).includes('message is not modified')) return { message_id: Number(messageId) };
      throw error;
    }
  }

  async function deleteMessage(chatTarget, messageId, options = {}) {
    try {
      return Boolean(await call('deleteMessage', {
        chat_id: options.normalizeTarget === false ? chatTarget : normalizeTelegramChatTarget(chatTarget),
        message_id: Number(messageId)
      }, options));
    } catch (error) {
      if (String(error.message).includes('message to delete not found')) return false;
      throw error;
    }
  }

  function sendDocument(chatTarget, document, {
    caption = '',
    filename = 'document.bin',
    contentType = 'application/octet-stream',
    ...options
  } = {}) {
    const form = new FormData();
    form.set('chat_id', options.normalizeTarget === false ? String(chatTarget) : normalizeTelegramChatTarget(chatTarget));
    if (caption) form.set('caption', caption);
    const blob = document instanceof Blob ? document : new Blob([document], { type: contentType });
    form.set('document', blob, filename);
    return call('sendDocument', {}, { ...options, body: form });
  }

  return Object.freeze({
    call,
    sendMessage,
    editMessageText,
    deleteMessage,
    sendDocument
  });
}
