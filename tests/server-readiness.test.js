import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createKeyedAsyncMutex,
  createRunReadinessManager
} from '@microwavedev/backpack-game-core/server';

test('[server] run readiness manager tracks ready state and round clearing', () => {
  let clock = 1000;
  const manager = createRunReadinessManager({ now: () => clock });

  manager.setReady('run_1', 'player_a');
  assert.equal(manager.isReady('run_1', 'player_a'), true);
  assert.deepEqual(manager.readyStatus('run_1'), { ready: false, playerIds: null });

  clock = 1200;
  manager.setReady('run_1', 'player_b');
  assert.deepEqual(manager.readyStatus('run_1'), {
    ready: true,
    playerIds: ['player_a', 'player_b']
  });

  manager.clearRound('run_1');
  assert.equal(manager.isReady('run_1', 'player_a'), false);
  assert.equal(manager.isReady('run_1', 'player_b'), false);
  assert.deepEqual(manager.readyStatus('run_1'), { ready: false, playerIds: null });
});

test('[server] run readiness manager supports configurable ready counts and idle sweeps', () => {
  let clock = 0;
  const manager = createRunReadinessManager({
    now: () => clock,
    requiredReadyCount: 3
  });

  manager.setReady('run_1', 'a');
  manager.setReady('run_1', 'b');
  assert.deepEqual(manager.readyStatus('run_1'), { ready: false, playerIds: null });

  clock = 5000;
  manager.setReady('run_2', 'x');
  clock = 6000;
  manager.setReady('run_1', 'c');
  assert.deepEqual(manager.readyStatus('run_1'), {
    ready: true,
    playerIds: ['a', 'b', 'c']
  });

  clock = 9000;
  assert.deepEqual(manager.getIdleRunIds(3500), ['run_2']);
  manager.clearRun('run_2');
  assert.deepEqual(manager.getIdleRunIds(3500), []);
});

test('[server] keyed mutex serializes work by key and releases after errors', async () => {
  const mutex = createKeyedAsyncMutex();
  const events = [];

  const first = mutex.withLock('run_1', async () => {
    events.push('first:start');
    await new Promise((resolve) => setTimeout(resolve, 10));
    events.push('first:end');
    return 'first';
  });
  const second = mutex.withLock('run_1', async () => {
    events.push('second');
    return 'second';
  });
  const otherKey = mutex.withLock('run_2', async () => {
    events.push('other');
    return 'other';
  });

  assert.deepEqual(await Promise.all([first, second, otherKey]), ['first', 'second', 'other']);
  assert.deepEqual(events, ['first:start', 'other', 'first:end', 'second']);
  assert.equal(mutex.has('run_1'), false);

  await assert.rejects(
    () => mutex.withLock('run_1', async () => {
      throw new Error('boom');
    }),
    /boom/
  );
  assert.equal(mutex.has('run_1'), false);
  assert.equal(await mutex.withLock('run_1', () => 'after-error'), 'after-error');
});
