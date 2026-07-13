import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createMushroomAuthServicePort } from '../src/server/ports/mushroom/platform/index.js';

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
