import test from 'node:test';
import assert from 'node:assert/strict';
import { createRunRuntimeService } from '../src/modules/run/index.js';

test('[run-runtime] executes a complete neutral solo-run slice through atomic adapters', async () => {
  const calls = [];
  const hooks = [];
  const adapter = (operation, result) => async (payload) => {
    calls.push([operation, payload]);
    return typeof result === 'function' ? result(payload) : result;
  };
  const runtime = createRunRuntimeService({
    adapters: {
      startRun: adapter('startRun', ({ playerId, input }) => ({ id: 'run-1', playerId, characterId: input.characterId })),
      getRun: adapter('getRun', { id: 'run-1', status: 'active' }),
      refreshShop: adapter('refreshShop', { runId: 'run-1', runCurrency: 4 }),
      buyItem: adapter('buyItem', { assetId: 'blade', runCurrency: 2 }),
      resolveRound: adapter('resolveRound', { runId: 'run-1', status: 'completed' }),
      abandonRun: adapter('abandonRun', { runId: 'run-1', status: 'abandoned' })
    },
    hooks: {
      beforeOperation: ({ operation }) => hooks.push(`before:${operation}`),
      afterOperation: ({ operation }) => hooks.push(`after:${operation}`)
    }
  });

  assert.equal(runtime.contract, 'run-runtime/v1');
  assert.deepEqual(await runtime.startRun('player-1', { characterId: 'hero-1' }), {
    id: 'run-1',
    playerId: 'player-1',
    characterId: 'hero-1'
  });
  await runtime.getRun('player-1', 'run-1');
  await runtime.refreshShop('player-1', 'run-1');
  await runtime.buyItem('player-1', 'run-1', 'blade');
  await runtime.resolveRound('player-1', 'run-1');
  await runtime.abandonRun('player-1', 'run-1');

  assert.deepEqual(calls.map(([operation]) => operation), [
    'startRun',
    'getRun',
    'refreshShop',
    'buyItem',
    'resolveRound',
    'abandonRun'
  ]);
  assert.deepEqual(calls[3][1], {
    playerId: 'player-1',
    runId: 'run-1',
    assetId: 'blade',
    input: {}
  });
  assert.deepEqual(hooks, [
    'before:startRun', 'after:startRun',
    'before:getRun', 'after:getRun',
    'before:refreshShop', 'after:refreshShop',
    'before:buyItem', 'after:buyItem',
    'before:resolveRound', 'after:resolveRound',
    'before:abandonRun', 'after:abandonRun'
  ]);
});

test('[run-runtime] reports missing optional adapters only when invoked', async () => {
  const runtime = createRunRuntimeService();
  await assert.rejects(
    () => runtime.getActiveRun('player-1'),
    /Run runtime adapter "getActiveRun" is required/
  );
});
