import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertRuntimeConfigValidation,
  formatRuntimeConfigValidationLines,
  shapeRuntimeConfigValidationResult
} from '../src/modules/config/index.js';

test('[config] shapes runtime config validation summaries', () => {
  const validation = shapeRuntimeConfigValidationResult({
    issues: ['missing token', '', null],
    config: {
      storeKind: 'sqlite',
      production: true
    },
    summaryFields: [
      { key: 'storeKind', label: 'store' },
      'production',
      { label: 'operators', value: 2 }
    ]
  });

  assert.deepEqual(validation, {
    ok: false,
    issues: ['missing token'],
    summary: {
      store: 'sqlite',
      production: true,
      operators: 2
    }
  });
  assert.deepEqual(formatRuntimeConfigValidationLines(validation, {
    notReadyMessage: 'Config not ready:'
  }), [
    'Config not ready:',
    '- missing token'
  ]);
  assert.throws(
    () => assertRuntimeConfigValidation(validation, { message: 'Invalid app config' }),
    /Invalid app config:\n- missing token/
  );
});

test('[config] formats ready runtime config summaries', () => {
  const validation = shapeRuntimeConfigValidationResult({
    config: {
      storeKind: 'json',
      production: false
    },
    summaryFields: [
      { key: 'storeKind', label: 'store' },
      'production'
    ]
  });

  assert.deepEqual(formatRuntimeConfigValidationLines(validation, {
    readyMessage: 'Config ready.'
  }), [
    'Config ready.',
    'store=json',
    'production=false'
  ]);
  assert.equal(assertRuntimeConfigValidation(validation), validation);
});
