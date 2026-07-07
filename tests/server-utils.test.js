import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHARACTER_XP_LEVEL_CURVE,
  computeCharacterLevel,
  computeProgressLevel,
  createRequestLogger,
  createRng,
  createSessionKey,
  createShortCode,
  createStructuredLogger,
  currencyFields,
  dayKey,
  hashToSeed,
  nextUtcReset,
  normalizeLanguage,
  parseJson,
  runCurrencyFields,
  startOfUtcDay
} from '@microwavedev/backpack-game-core/server';

test('[server-utils] exposes neutral time, JSON, language, and RNG helpers', () => {
  assert.equal(dayKey('2026-07-07T18:45:00.000Z'), '2026-07-07');
  assert.equal(startOfUtcDay('2026-07-07T18:45:00.000Z').toISOString(), '2026-07-07T00:00:00.000Z');
  assert.equal(nextUtcReset('2026-07-07T18:45:00.000Z').toISOString(), '2026-07-08T00:00:00.000Z');
  assert.deepEqual(parseJson('{"ok":true}', {}), { ok: true });
  assert.deepEqual(parseJson('{', { ok: false }), { ok: false });
  assert.equal(normalizeLanguage('ru-RU', { fallback: 'en', supportedLanguages: ['en', 'ru'] }), 'ru');
  assert.equal(normalizeLanguage('pt-BR', { fallback: 'en', supportedLanguages: ['en', 'ru'] }), 'en');
  assert.match(createShortCode(6), /^[a-f0-9]{6}$/);
  assert.match(createSessionKey({ prefix: 'token', bytes: 3 }), /^token_[a-f0-9]{6}$/);

  const rngA = createRng('same-seed');
  const rngB = createRng('same-seed');
  assert.equal(hashToSeed('same-seed'), hashToSeed('same-seed'));
  assert.equal(rngA(), rngB());
});

test('[server-utils] computes generic progression and run currency aliases', () => {
  assert.equal(CHARACTER_XP_LEVEL_CURVE.length, 19);
  assert.deepEqual(computeProgressLevel(0, { curve: [10, 30] }), { level: 1, current: 0, next: 10 });
  assert.deepEqual(computeProgressLevel(30, { curve: [10, 30] }), { level: 3, current: 0, next: null });
  assert.deepEqual(computeCharacterLevel(4000), { level: 20, current: 0, next: null });
  assert.deepEqual(runCurrencyFields(7), { coins: 7, runCurrency: 7, runCoins: 7 });
  assert.deepEqual(currencyFields(5, {
    primaryField: 'energy',
    aliasFields: ['energyPoints'],
    legacyField: null
  }), {
    energy: 5,
    energyPoints: 5
  });
});

test('[server-utils] structured logger and request logger are adapter-driven', () => {
  const infoLines = [];
  const errorLines = [];
  const logger = createStructuredLogger({
    disabled: false,
    now: () => '2026-07-07T00:00:00.000Z',
    writeInfo: (line) => infoLines.push(line),
    writeError: (line) => errorLines.push(line)
  });

  logger.info('hello');
  logger.error({ kind: 'boom' });

  assert.deepEqual(JSON.parse(infoLines[0]), {
    ts: '2026-07-07T00:00:00.000Z',
    level: 'info',
    message: 'hello'
  });
  assert.deepEqual(JSON.parse(errorLines[0]), {
    ts: '2026-07-07T00:00:00.000Z',
    level: 'error',
    kind: 'boom'
  });

  const records = [];
  const middleware = createRequestLogger({
    logger: { info: (record) => records.push(record) },
    createRequestId: () => 'req_test',
    nowHrtime: (() => {
      const values = [1000n, 2501000n];
      return () => values.shift() ?? 2501000n;
    })(),
    contextFromRequest: (req) => ({
      playerId: req.user?.id || null,
      gameRunId: req.params?.id || null
    })
  });
  let finish;
  const req = {
    headers: {},
    method: 'POST',
    path: '/api/run',
    user: { id: 'player_1' },
    params: { id: 'run_1' }
  };
  const res = {
    statusCode: 201,
    setHeader(name, value) {
      this[name.toLowerCase()] = value;
    },
    on(event, listener) {
      if (event === 'finish') finish = listener;
    }
  };
  let nextCalled = false;
  middleware(req, res, () => {
    nextCalled = true;
  });
  finish();

  assert.equal(nextCalled, true);
  assert.equal(req.requestId, 'req_test');
  assert.equal(res['x-request-id'], 'req_test');
  assert.equal(records[0].requestId, 'req_test');
  assert.equal(records[0].status, 201);
  assert.equal(records[0].outcome, 'ok');
  assert.equal(records[0].playerId, 'player_1');
  assert.equal(records[0].gameRunId, 'run_1');
});
