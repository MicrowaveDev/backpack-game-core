import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APPLICATION_SERVICE_NAMES,
  ApplicationError,
  createApplicationServiceRegistry,
  isApplicationServiceRegistry
} from '@microwavedev/backpack-game-core/client/application';

test('[client/application] service registry exposes injected domain ports', () => {
  const run = { start: async () => ({ id: 'run-1' }) };
  const registry = createApplicationServiceRegistry({ run });

  assert.equal(isApplicationServiceRegistry(registry), true);
  assert.equal(registry.has('run'), true);
  assert.equal(registry.get('run'), run);
  assert.equal(registry.getRequired('run'), run);
  assert.deepEqual(registry.names, ['run']);
  assert.deepEqual(registry.toObject(), { run });
  assert.equal(APPLICATION_SERVICE_NAMES.includes('support'), true);
});

test('[client/application] service registry reports missing required ports', () => {
  const registry = createApplicationServiceRegistry({});

  assert.equal(registry.get('profile'), undefined);
  assert.throws(
    () => registry.getRequired('profile'),
    (error) => error instanceof ApplicationError &&
      error.code === 'APPLICATION_SERVICE_MISSING'
  );
  assert.throws(
    () => createApplicationServiceRegistry({}, { required: ['profile'] }),
    /Required application service/
  );
});

test('[client/application] service registry rejects accidental unknown ports by default', () => {
  assert.throws(
    () => createApplicationServiceRegistry({ typoPort: {} }),
    /Unknown application service/
  );

  const registry = createApplicationServiceRegistry(
    { extension: {} },
    { allowUnknown: true }
  );
  assert.equal(registry.has('extension'), true);
});
