import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BackpackGameClientError,
  backpackClientQueryString,
  createBackpackGameClient,
  interpolateBackpackClientPath,
  joinBackpackClientPath
} from '@microwavedev/backpack-game-core/client';

function response(payload, options = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    statusText: options.statusText ?? 'OK',
    headers: {
      get(name) {
        return name.toLowerCase() === 'content-type' ? 'application/json' : null;
      }
    },
    async json() {
      return payload;
    },
    async text() {
      return JSON.stringify(payload);
    }
  };
}

test('[client] joins paths and serializes query values', () => {
  assert.equal(joinBackpackClientPath('https://game.example/api', '/packs'), 'https://game.example/api/packs');
  assert.equal(joinBackpackClientPath('', 'packs'), '/packs');
  assert.equal(backpackClientQueryString({ a: 1, b: ['x', 'y'], empty: null }), '?a=1&b=x&b=y');
  assert.equal(interpolateBackpackClientPath('/packs/:packId/roll', { packId: 'season 1' }), '/packs/season%201/roll');
});

test('[client] sends JSON requests through route adapters', async () => {
  const calls = [];
  const client = createBackpackGameClient({
    baseUrl: 'https://game.example',
    headers: { 'x-client': 'core-test' },
    getAuthHeaders: () => ({ authorization: 'Bearer token' }),
    routes: {
      rollPack: '/api/packs/:packId/roll'
    },
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return response({ ok: true, url, body: JSON.parse(init.body) });
    }
  });

  const result = await client.postRoute('rollPack', { packId: 'starter' }, { idempotencyKey: 'k1' }, {
    query: { preview: 1 }
  });

  assert.equal(result.url, 'https://game.example/api/packs/starter/roll?preview=1');
  assert.deepEqual(result.body, { idempotencyKey: 'k1' });
  assert.equal(calls[0].init.headers.authorization, 'Bearer token');
  assert.equal(calls[0].init.headers['content-type'], 'application/json');
});

test('[client] throws structured errors for failed responses', async () => {
  const client = createBackpackGameClient({
    fetchImpl: async () => response({ error: 'nope' }, { ok: false, status: 409, statusText: 'Conflict' })
  });

  await assert.rejects(
    client.get('/broken'),
    (error) => {
      assert.equal(error instanceof BackpackGameClientError, true);
      assert.equal(error.status, 409);
      assert.equal(error.payload.error, 'nope');
      return true;
    }
  );
});

test('[client] optionally unwraps success/data response envelopes', async () => {
  const client = createBackpackGameClient({
    unwrapDataEnvelope: true,
    fetchImpl: async () => response({
      success: true,
      data: { balance: 25 }
    })
  });

  assert.deepEqual(await client.get('/wallet'), { balance: 25 });
});

test('[client] treats success=false response envelopes as structured errors', async () => {
  const client = createBackpackGameClient({
    unwrapDataEnvelope: true,
    fetchImpl: async () => response({
      success: false,
      error: 'wallet closed'
    })
  });

  await assert.rejects(
    client.get('/wallet'),
    (error) => {
      assert.equal(error instanceof BackpackGameClientError, true);
      assert.equal(error.status, 200);
      assert.equal(error.message, 'wallet closed');
      assert.deepEqual(error.payload, { success: false, error: 'wallet closed' });
      return true;
    }
  );
});
