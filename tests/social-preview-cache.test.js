import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSocialPreviewCacheService
} from '@microwavedev/backpack-game-core/modules/social-preview';

test('[social-preview] renders and reports a generated cache result', async () => {
  const calls = [];
  const logs = [];
  const service = createSocialPreviewCacheService({
    outputPath: '/game/web/dist/marketing/social-preview.jpg',
    renderPreview: async (options) => {
      calls.push(['render', options]);
      return { bytes: 123 };
    },
    ensureOutputDirectory: async ({ outputPath }) => {
      calls.push(['mkdir', outputPath]);
    },
    logger: {
      info: (payload) => logs.push(['info', payload]),
      warn: (payload) => logs.push(['warn', payload])
    },
    relativePath: (target) => target.replace('/game/', '')
  });

  const result = await service.ensureSocialPreviewCache({
    title: 'Shared Game',
    out: '/game/web/dist/marketing/social-preview.jpg'
  });

  assert.deepEqual(calls, [
    ['mkdir', '/game/web/dist/marketing/social-preview.jpg'],
    ['render', { title: 'Shared Game', out: '/game/web/dist/marketing/social-preview.jpg' }]
  ]);
  assert.deepEqual(result, {
    ok: true,
    outcome: 'generated',
    generated: true,
    fallback: false,
    path: 'web/dist/marketing/social-preview.jpg',
    result: { bytes: 123 }
  });
  assert.equal(logs.length, 1);
  assert.equal(logs[0][0], 'info');
  assert.equal(logs[0][1].outcome, 'generated');
});

test('[social-preview] copies a fallback when rendering fails', async () => {
  const logs = [];
  const service = createSocialPreviewCacheService({
    outputPath: '/game/web/dist/marketing/social-preview.jpg',
    renderPreview: async () => {
      throw new Error('renderer offline');
    },
    copyFallback: async ({ outputPath }) => outputPath.endsWith('social-preview.jpg'),
    logger: {
      warn: (payload) => logs.push(payload)
    },
    relativePath: (target) => target.replace('/game/', '')
  });

  const result = await service.ensureSocialPreviewCache();

  assert.equal(result.ok, true);
  assert.equal(result.outcome, 'fallback');
  assert.equal(result.generated, false);
  assert.equal(result.fallback, true);
  assert.equal(result.path, 'web/dist/marketing/social-preview.jpg');
  assert.equal(result.error.message, 'renderer offline');
  assert.deepEqual(logs, [{
    kind: 'social_preview_cache',
    outcome: 'fallback',
    path: 'web/dist/marketing/social-preview.jpg',
    message: 'renderer offline'
  }]);
});

test('[social-preview] can fail softly or rethrow when fallback is unavailable', async () => {
  const softService = createSocialPreviewCacheService({
    renderPreview: async () => {
      throw new Error('render failed');
    }
  });

  const softResult = await softService.ensureSocialPreviewCache();
  assert.equal(softResult.ok, false);
  assert.equal(softResult.outcome, 'failed');
  assert.equal(softResult.error.message, 'render failed');

  const strictService = createSocialPreviewCacheService({
    renderPreview: async () => {
      throw new Error('render failed');
    },
    throwOnFailure: true
  });

  await assert.rejects(
    () => strictService.ensureSocialPreviewCache(),
    /render failed/
  );
});
