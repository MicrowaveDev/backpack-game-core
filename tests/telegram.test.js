import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, generateKeyPairSync, sign } from 'node:crypto';
import {
  buildTelegramDmStartLink,
  buildTelegramGameScorePayload,
  buildTelegramMiniAppLink,
  createTelegramInlineKeyboard,
  extractTelegramAuthCode,
  normalizeTelegramChatTarget,
  normalizeTelegramUpdate,
  parseTelegramCommand
} from '../src/modules/telegram/index.js';
import {
  createTelegramBotApiClient,
  buildTelegramOidcAuthorizationUrl,
  completeTelegramOidcAuthorization,
  createTelegramOidcTransaction,
  createTelegramUpdateRouter,
  parseTelegramInitData,
  telegramWebhookNeedsUpdate,
  verifyTelegramInitData
} from '../src/server/telegram/index.js';

function signedInitData({ botToken, authDate, user = { id: 42, first_name: 'Core' } }) {
  const params = new URLSearchParams({
    auth_date: String(authDate),
    query_id: 'query-test',
    user: JSON.stringify(user)
  });
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  params.set('hash', createHmac('sha256', secret).update(dataCheckString).digest('hex'));
  return params.toString();
}

test('[telegram/protocol] normalizes links, targets, keyboards, commands, and game scores', () => {
  assert.equal(normalizeTelegramChatTarget('game_channel'), '@game_channel');
  assert.equal(normalizeTelegramChatTarget('1234'), '-1001234');
  assert.equal(normalizeTelegramChatTarget('-42'), '-42');
  assert.equal(buildTelegramMiniAppLink({
    botUsername: '@game_bot',
    miniAppName: 'play',
    startParam: 'entry group'
  }), 'https://t.me/game_bot/play?startapp=entry%20group');
  assert.equal(buildTelegramDmStartLink({ botUsername: 'game_bot', startParam: 'play' }), 'https://t.me/game_bot?start=play');
  assert.deepEqual(createTelegramInlineKeyboard({ ctas: [{ label: 'Play', url: 'https://game.test' }] }), {
    inline_keyboard: [[{ text: 'Play', url: 'https://game.test' }]]
  });
  assert.deepEqual(parseTelegramCommand('/start@game_bot auth-CODE'), {
    command: 'start',
    botUsername: 'game_bot',
    args: 'auth-CODE'
  });
  assert.equal(extractTelegramAuthCode('/start auth-CODE1234', { pattern: /^[A-Z0-9]{8}$/ }), 'CODE1234');
  assert.equal(extractTelegramAuthCode('/auth CODE1234', { pattern: /^[A-Z0-9]{8}$/ }), 'CODE1234');
  assert.equal(extractTelegramAuthCode('auth-CODE1234', { pattern: /^[A-Z0-9]{8}$/ }), 'CODE1234');
  assert.equal(extractTelegramAuthCode('CODE1234', { pattern: /^[A-Z0-9]{8}$/ }), 'CODE1234');
  assert.equal(extractTelegramAuthCode('hello there', { pattern: /^[A-Z0-9]{8}$/ }), '');
  assert.deepEqual(buildTelegramGameScorePayload({
    telegramUserId: 42,
    score: 7.8,
    inlineMessageId: 'inline'
  }), {
    user_id: 42,
    score: 7,
    force: false,
    disable_edit_message: false,
    inline_message_id: 'inline'
  });
});

test('[telegram/oidc] builds PKCE authorization and verifies exchanged ID tokens', async () => {
  const transaction = createTelegramOidcTransaction();
  assert.match(transaction.codeVerifier, /^[A-Za-z0-9_-]+$/);
  assert.notEqual(transaction.codeChallenge, transaction.codeVerifier);
  const authorizationUrl = new URL(buildTelegramOidcAuthorizationUrl({
    clientId: '12345',
    redirectUri: 'https://game.test/api/auth/telegram/oidc/callback',
    ...transaction
  }));
  assert.equal(authorizationUrl.origin, 'https://oauth.telegram.org');
  assert.equal(authorizationUrl.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(authorizationUrl.searchParams.get('nonce'), transaction.nonce);

  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'test-key', typ: 'JWT' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({
    iss: 'https://oauth.telegram.org',
    aud: '12345',
    sub: 'telegram-user',
    id: 42,
    name: 'Test Player',
    nonce: transaction.nonce,
    iat: 1_700_000_000,
    exp: 1_700_000_600
  })).toString('base64url');
  const input = `${header}.${claims}`;
  const idToken = `${input}.${sign('RSA-SHA256', Buffer.from(input), privateKey).toString('base64url')}`;
  const requests = [];
  const result = await completeTelegramOidcAuthorization({
    code: 'authorization-code',
    clientId: '12345',
    clientSecret: 'client-secret',
    redirectUri: 'https://game.test/api/auth/telegram/oidc/callback',
    codeVerifier: transaction.codeVerifier,
    nonce: transaction.nonce,
    nowSeconds: 1_700_000_100,
    fetchImpl: async (url, options = {}) => {
      requests.push({ url, options });
      if (String(url).endsWith('/token')) {
        return { ok: true, status: 200, json: async () => ({ id_token: idToken, access_token: 'access' }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ keys: [{ ...publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'RS256' }] })
      };
    }
  });
  assert.equal(result.claims.id, 42);
  assert.equal(requests.length, 2);
  assert.match(requests[0].options.headers.authorization, /^Basic /);
  assert.match(requests[0].options.body, /code_verifier=/);
});

test('[telegram/init-data] verifies signatures and rejects stale or future auth dates', () => {
  const botToken = 'secret-token';
  const initData = signedInitData({ botToken, authDate: 1_700_000_000 });
  assert.equal(parseTelegramInitData(initData).user.id, 42);
  assert.deepEqual(verifyTelegramInitData(initData, {
    botToken,
    nowSeconds: 1_700_000_060,
    maxAgeSeconds: 120
  }), {
    ok: true,
    user: { id: 42, first_name: 'Core' },
    issue: null,
    authDate: 1_700_000_000
  });
  assert.equal(verifyTelegramInitData(initData, {
    botToken,
    nowSeconds: 1_700_001_000,
    maxAgeSeconds: 120
  }).issue, 'stale_auth_date');
  assert.equal(verifyTelegramInitData(initData, {
    botToken,
    nowSeconds: 1_699_999_999,
    maxAgeSeconds: 120
  }).issue, 'stale_auth_date');
  assert.equal(verifyTelegramInitData(initData, {
    botToken: 'wrong',
    nowSeconds: 1_700_000_060
  }).issue, 'invalid_hash');
});

test('[telegram/transport] retries rate limits and supports JSON plus multipart calls', async () => {
  const calls = [];
  const sleeps = [];
  const responses = [
    { ok: false, description: 'Too Many Requests: retry after 2', parameters: { retry_after: 2 } },
    { ok: true, result: { message_id: 10 } },
    { ok: true, result: { message_id: 11 } }
  ];
  const client = createTelegramBotApiClient({
    token: 'token',
    sleep: async (ms) => sleeps.push(ms),
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      const payload = responses.shift();
      return {
        ok: payload.ok,
        status: payload.ok ? 200 : 429,
        statusText: payload.ok ? 'OK' : 'Too Many Requests',
        json: async () => payload
      };
    }
  });
  assert.deepEqual(await client.sendMessage('@game', 'hello'), { message_id: 10 });
  assert.deepEqual(sleeps, [3000]);
  assert.equal(JSON.parse(calls[0].options.body).chat_id, '@game');
  assert.deepEqual(await client.sendDocument('@game', Buffer.from('pdf'), {
    filename: 'guide.pdf',
    contentType: 'application/pdf'
  }), { message_id: 11 });
  assert.equal(calls[2].options.body instanceof FormData, true);
  assert.equal(calls[2].options.body.get('document').name, 'guide.pdf');
});

test('[telegram/router] normalizes updates and dispatches configured handlers', async () => {
  assert.equal(normalizeTelegramUpdate({ message: { text: '/start play' } }).kind, 'command');
  assert.equal(normalizeTelegramUpdate({ callback_query: { id: 'cb' } }).kind, 'callback_query');
  const routed = [];
  const route = createTelegramUpdateRouter({
    handlers: {
      command: async (event, context) => {
        routed.push([event.value.command, context.product]);
        return { kind: 'command', answered: true };
      }
    }
  });
  assert.deepEqual(await route({ message: { text: '/start play' } }, { product: 'meat' }), {
    kind: 'command',
    answered: true
  });
  assert.deepEqual(routed, [['start', 'meat']]);
  assert.deepEqual(await route({ update_id: 1 }), { kind: 'ignored', answered: false });
});

test('[telegram/webhook] reconciles URL, delivery errors, and allowed updates', () => {
  const options = {
    webhookUrl: 'https://game.test/api/bot/webhook',
    allowedUpdates: ['message', 'callback_query']
  };
  assert.equal(telegramWebhookNeedsUpdate({
    url: options.webhookUrl,
    allowed_updates: options.allowedUpdates
  }, options), false);
  assert.equal(telegramWebhookNeedsUpdate({
    url: options.webhookUrl,
    allowed_updates: options.allowedUpdates,
    last_error_message: 'certificate verify failed'
  }, options), true);
  assert.equal(telegramWebhookNeedsUpdate({
    url: 'https://old.test/api/bot/webhook',
    allowed_updates: options.allowedUpdates
  }, options), true);
  assert.equal(telegramWebhookNeedsUpdate({
    url: options.webhookUrl,
    allowed_updates: ['message']
  }, options), true);
});
