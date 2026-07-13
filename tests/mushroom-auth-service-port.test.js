import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  createMushroomAuthServicePort,
  createTelegramBotGatewayPort,
  createWikiServicePort
} from '../src/server/ports/mushroom/platform/index.js';

function createPort(overrides = {}) {
  return createMushroomAuthServicePort({
    crypto,
    query: async () => ({ rowCount: 0, rows: [] }),
    withTransaction: async (callback) => callback({ query: async () => ({ rowCount: 0, rows: [] }) }),
    createId: (prefix) => `${prefix}_test`,
    createSessionKey: () => 'session_test',
    createShortCode: () => 'CODE1234',
    nowDate: () => new Date('2026-07-13T12:00:00.000Z'),
    ...overrides
  });
}

test('[mushroom-auth-port] verifies signed provider init data with an injected clock', () => {
  const botToken = 'test-token';
  const params = new URLSearchParams({
    auth_date: String(Date.parse('2026-07-13T11:59:00.000Z') / 1000),
    query_id: 'query-test',
    user: JSON.stringify({ id: 42, first_name: 'Core' })
  });
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  params.set('hash', crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex'));

  assert.equal(createPort().verifyTelegramInitData(params.toString(), botToken), true);
});

test('[mushroom-auth-port] exposes framework-compatible auth guard behavior', () => {
  const port = createPort();
  let statusCode = null;
  let payload = null;
  const response = {
    status(value) {
      statusCode = value;
      return this;
    },
    json(value) {
      payload = value;
      return value;
    }
  };

  port.requireAuth({ authenticated: false }, response, () => assert.fail('guard should reject'));
  assert.equal(statusCode, 401);
  assert.deepEqual(payload, { success: false, error: 'Authentication required' });
});

test('[telegram-bot-port] uses product configuration for links and visible copy', () => {
  const gateway = createTelegramBotGatewayPort({
    createTelegramAuthCode: async () => ({ publicCode: 'CODE' }),
    confirmTelegramAuthCode: async () => ({}),
    completeTelegramSuccessfulPayment: async () => ({}),
    getPaymentSupportLinks: () => ({ supportUrl: 'https://game.test/support' }),
    validateTelegramPreCheckout: async () => ({ ok: true }),
    env: {
      TELEGRAM_MINI_APP_NAME: 'meat',
      PUBLIC_GAME_URL: 'https://game.test'
    },
    defaultGameShortName: 'meat_master',
    copy: { mentionText: 'Open Meat Master.' }
  });

  assert.equal(gateway.buildMiniAppLink('@test_bot', 'entry'), 'https://t.me/test_bot/meat?startapp=entry');
  assert.equal(gateway.createMentionReply({ botUsername: 'test_bot' }).text, 'Open Meat Master.');
  assert.equal(gateway.buildWebhookUrl(), 'https://game.test/api/bot/webhook');
});

test('[wiki-port] indexes configured sections and gates tiered content by progress', async () => {
  const pages = {
    '/wiki/characters/hero/page.md': [
      '---',
      'title: Hero',
      'related: arena',
      '---',
      '<!-- tier:0 -->',
      'Visible',
      '<!-- tier:1 -->',
      'Secret'
    ].join('\n'),
    '/wiki/locations/arena/page.md': '---\ntitle: Arena\n---\nArena body'
  };
  const service = createWikiServicePort({
    rootDir: '/wiki',
    readFile: async (file) => pages[file],
    readDirectory: async (dir) => [{
      name: dir.endsWith('/characters') ? 'hero' : 'arena',
      isDirectory: () => true
    }],
    sections: ['characters', 'locations'],
    gatedSection: 'characters',
    tierThresholds: [0, 10],
    parseMarkdown: (markdown) => `<p>${markdown}</p>`,
    lexMarkdown: (markdown) => [{ type: 'paragraph', text: markdown, tokens: [] }],
    summarizeEntry: (entry) => ({ slug: entry.slug, title: entry.title })
  });

  assert.deepEqual(await service.getWikiHome(), {
    characters: [{ slug: 'hero', title: 'Hero' }],
    locations: [{ slug: 'arena', title: 'Arena' }]
  });
  const entry = await service.getWikiEntry('characters', 'hero', 0);
  assert.deepEqual(entry.sections.map(({ tier, locked }) => ({ tier, locked })), [
    { tier: 0, locked: false },
    { tier: 1, locked: true }
  ]);
  assert.deepEqual(entry.relatedEntries, [{ slug: 'arena', title: 'Arena' }]);
});
