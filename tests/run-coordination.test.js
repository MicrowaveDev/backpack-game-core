import test from 'node:test';
import assert from 'node:assert/strict';
import { startOrResumeRun, runWithPendingStart, resolveRequestedActiveRun } from '../src/modules/run/index.js';

test('start-or-resume reuses the transaction-scoped active run or creates one', async () => {
  const active = { id: 'active' };
  let created = 0;
  const createRun = () => { created += 1; return { id: 'new' }; };
  assert.equal(await startOrResumeRun({ getActiveRun: () => active, createRun }), active);
  assert.equal(created, 0);
  assert.deepEqual(await startOrResumeRun({ getActiveRun: async () => null, createRun }), { id: 'new' });
  assert.equal(created, 1);
  await assert.rejects(startOrResumeRun({ getActiveRun: () => { throw new Error('read failed'); }, createRun }), /read failed/);
  assert.equal(created, 1);
});

test('pending starts suppress duplicate calls until product completion finishes', async () => {
  const state = {};
  let release;
  let calls = 0;
  const pending = new Promise((resolve) => { release = resolve; });
  const options = { state, start: () => { calls += 1; return { id: 'new' }; }, onStarted: () => pending };
  const first = runWithPendingStart(options);
  assert.equal(state.startingRun, true);
  assert.equal(await runWithPendingStart(options), null);
  assert.equal(calls, 1);
  release();
  assert.deepEqual(await first, { id: 'new' });
  assert.equal(state.startingRun, false);
  await runWithPendingStart(options);
  assert.equal(calls, 2);
});

test('pending state is released after start or product completion fails', async () => {
  for (const failingStep of ['start', 'onStarted']) {
    const state = {};
    const options = { state, start: () => ({ id: 'new' }), onStarted: () => {} };
    options[failingStep] = async () => { throw new Error('failed'); };
    await assert.rejects(runWithPendingStart(options), /failed/);
    assert.equal(state.startingRun, false);
    assert.deepEqual(await runWithPendingStart({ state, start: () => ({ id: 'retry' }) }), { id: 'retry' });
  }
});

test('requested run restoration keeps identity and active status without mutating the fallback', async () => {
  const fallback = { id: 'older', status: 'active' };
  const requested = { id: 'requested', status: 'active' };
  const options = { activeRun: fallback, requestedRunId: requested.id, loadRun: async () => requested };
  assert.equal(await resolveRequestedActiveRun(options), requested);
  for (const response of [null, { id: 'different', status: 'active' }, { id: requested.id, status: 'completed' }]) {
    assert.equal(await resolveRequestedActiveRun({ ...options, loadRun: () => response }), fallback);
  }
  assert.equal(fallback.id, 'older');
  const unexpectedLoad = () => { throw new Error('unexpected load'); };
  assert.equal(await resolveRequestedActiveRun({ activeRun: fallback, requestedRunId: fallback.id, loadRun: unexpectedLoad }), fallback);
  assert.equal(await resolveRequestedActiveRun({ activeRun: fallback, loadRun: unexpectedLoad }), fallback);
});

test('restoration uses consumer identity/status adapters and unavailable-error policy', async () => {
  const requested = { key: 7, phase: 'preparation' };
  assert.equal(await resolveRequestedActiveRun({
    requestedRunId: 7, loadRun: () => requested,
    getRunId: (run) => run?.key, isActiveRun: (run) => run?.phase === 'preparation'
  }), requested);
  const options = {
    requestedRunId: 'missing', loadRun: () => { throw Object.assign(new Error('unavailable'), { status: 404 }); },
    isUnavailableError: (error) => error.status === 404
  };
  assert.equal(await resolveRequestedActiveRun(options), null);
  await assert.rejects(resolveRequestedActiveRun({ ...options, isUnavailableError: () => false }), /unavailable/);
  await assert.rejects(resolveRequestedActiveRun({ ...options, loadRun: () => { throw new Error('network failed'); } }), /network failed/);
});
