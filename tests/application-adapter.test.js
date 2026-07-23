import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ApplicationError,
  isApplicationError,
  normalizeApplicationError,
  validateGameApplicationAdapter
} from '@microwavedev/backpack-game-core/client/application';

function adapterInput(overrides = {}) {
  return {
    id: 'sample-game',
    defaultLocale: 'en',
    locale: {
      getLocale: () => 'en',
      setLocale: () => {},
      translate: (key) => key
    },
    assets: {
      resolve: () => null
    },
    services: {
      session: { bootstrap: async () => ({}) }
    },
    capabilities: {
      authentication: true,
      social: false
    },
    serviceRequirements: {
      authentication: ['session'],
      social: ['social']
    },
    ...overrides
  };
}

test('[client/application] validates and normalizes a capability-aware adapter', () => {
  const adapter = validateGameApplicationAdapter(adapterInput());

  assert.equal(adapter.id, 'sample-game');
  assert.equal(adapter.services.getRequired('session').bootstrap instanceof Function, true);
  assert.equal(adapter.services.has('social'), false);
  assert.deepEqual(adapter.routeExtensions, []);
  assert.equal(Object.isFrozen(adapter), true);
  assert.equal(Object.isFrozen(adapter.capabilities), true);
});

test('[client/application] requires ports only for enabled capabilities', () => {
  assert.doesNotThrow(() => validateGameApplicationAdapter(adapterInput()));

  assert.throws(
    () => validateGameApplicationAdapter(adapterInput({
      capabilities: { authentication: true, social: true }
    })),
    (error) => error instanceof ApplicationError &&
      error.code === 'APPLICATION_SERVICE_MISSING' &&
      error.details.service === 'social'
  );
});

test('[client/application] rejects malformed adapter contracts', () => {
  assert.throws(
    () => validateGameApplicationAdapter(adapterInput({ id: '' })),
    /Adapter id/
  );
  assert.throws(
    () => validateGameApplicationAdapter(adapterInput({ locale: {} })),
    /getLocale, setLocale, and translate/
  );
  assert.throws(
    () => validateGameApplicationAdapter(adapterInput({
      capabilities: { social: 'yes' }
    })),
    /must be boolean/
  );
});

test('[client/application] normalizes unknown failures to a stable error shape', () => {
  const cause = new Error('offline');
  const error = normalizeApplicationError(cause, {
    code: 'REQUEST_FAILED',
    retriable: true,
    status: 503
  });

  assert.equal(isApplicationError(error), true);
  assert.equal(error.message, 'offline');
  assert.equal(error.code, 'REQUEST_FAILED');
  assert.equal(error.retriable, true);
  assert.equal(error.status, 503);
  assert.equal(error.cause, cause);
  assert.equal(normalizeApplicationError(error), error);
});
