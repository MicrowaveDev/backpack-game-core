import { createHmac, timingSafeEqual } from 'node:crypto';

export function parseTelegramInitData(initData) {
  const params = new URLSearchParams(String(initData || ''));
  const hash = params.get('hash') || '';
  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  let user = null;
  try {
    user = params.get('user') ? JSON.parse(params.get('user')) : null;
  } catch {
    user = null;
  }
  return {
    hash,
    dataCheckString,
    authDate: Number(params.get('auth_date') || 0),
    user,
    queryId: params.get('query_id') || ''
  };
}

export function verifyTelegramInitData(initData, {
  botToken,
  maxAgeSeconds = 86400,
  futureSkewSeconds = 0,
  nowSeconds = Math.floor(Date.now() / 1000)
} = {}) {
  const parsed = parseTelegramInitData(initData);
  if (!parsed.hash || !parsed.dataCheckString || !botToken) {
    return { ok: false, user: parsed.user, issue: 'missing_signature_or_bot_token', authDate: parsed.authDate };
  }
  if (
    !parsed.authDate ||
    parsed.authDate > nowSeconds + futureSkewSeconds ||
    nowSeconds - parsed.authDate > maxAgeSeconds
  ) {
    return { ok: false, user: parsed.user, issue: 'stale_auth_date', authDate: parsed.authDate };
  }
  const secret = createHmac('sha256', 'WebAppData').update(String(botToken)).digest();
  const expected = createHmac('sha256', secret).update(parsed.dataCheckString).digest();
  let actual;
  try {
    actual = Buffer.from(parsed.hash, 'hex');
  } catch {
    actual = Buffer.alloc(0);
  }
  const ok = actual.length === expected.length && timingSafeEqual(actual, expected);
  return {
    ok,
    user: parsed.user,
    issue: ok ? null : 'invalid_hash',
    authDate: parsed.authDate
  };
}
