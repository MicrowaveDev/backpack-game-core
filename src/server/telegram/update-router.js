import { normalizeTelegramUpdate } from '../../modules/telegram/index.js';

export function createTelegramUpdateRouter({ handlers = {}, onIgnored } = {}) {
  return async function routeTelegramUpdate(update, context = {}) {
    const normalized = normalizeTelegramUpdate(update);
    const handler = handlers[normalized.kind];
    if (typeof handler === 'function') {
      return handler(normalized, context);
    }
    if (typeof onIgnored === 'function') return onIgnored(normalized, context);
    return { kind: normalized.kind, answered: false };
  };
}
