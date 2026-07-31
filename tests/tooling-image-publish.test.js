import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { preparePublishedImages } from '../src/tooling/image-publish.js';

test('[tooling/image-publish] publishes atomically, records hashes, and skips unchanged inputs', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'core-image-publish-'));
  let calls = 0;
  const processImage = async ({ sourcePath, outputPath }) => {
    calls += 1;
    fs.writeFileSync(outputPath, Buffer.concat([Buffer.from('optimized:'), fs.readFileSync(sourcePath)]));
    return { width: 320, height: 480, format: 'webp' };
  };
  try {
    fs.mkdirSync(path.join(root, 'source'));
    fs.writeFileSync(path.join(root, 'source', 'fighter.png'), 'source-image');
    const options = {
      repoRoot: root,
      manifestPath: 'generated/runtime-images.json',
      entries: [{ id: 'fighter', sourcePath: 'source/fighter.png', outputPath: 'public/fighter.webp' }],
      defaults: { width: 320, height: 480, format: 'webp' },
      budgets: { maxFileBytes: 100, maxTotalBytes: 100 },
      processImage
    };
    const first = await preparePublishedImages(options);
    assert.equal(first.processedCount, 1);
    assert.equal(first.skippedCount, 0);
    assert.equal(first.manifest.entries[0].image.width, 320);
    assert.match(first.manifest.entries[0].sourceSha256, /^[a-f0-9]{64}$/);

    const second = await preparePublishedImages(options);
    assert.equal(second.processedCount, 0);
    assert.equal(second.skippedCount, 1);
    assert.equal(calls, 1);

    fs.writeFileSync(path.join(root, 'source', 'fighter.png'), 'changed-source-image');
    const third = await preparePublishedImages(options);
    assert.equal(third.processedCount, 1);
    assert.equal(calls, 2);

    const pruned = await preparePublishedImages({
      ...options,
      prune: true,
      pruneRoots: ['public'],
      entries: [{ id: 'replacement', sourcePath: 'source/fighter.png', outputPath: 'public/replacement.webp' }]
    });
    assert.equal(pruned.prunedCount, 1);
    assert.equal(fs.existsSync(path.join(root, 'public', 'fighter.webp')), false);
    await assert.rejects(preparePublishedImages({ ...options, prune: true }), /requires at least one pruneRoot/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('[tooling/image-publish] rejects unsafe paths, duplicates, and exceeded budgets', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'core-image-budget-'));
  const processImage = async ({ outputPath }) => {
    fs.writeFileSync(outputPath, Buffer.alloc(20));
    return { width: 1, height: 1, format: 'webp' };
  };
  try {
    fs.writeFileSync(path.join(root, 'source.png'), 'source');
    await assert.rejects(preparePublishedImages({
      repoRoot: root,
      manifestPath: 'manifest.json',
      entries: [{ id: 'one', sourcePath: 'source.png', outputPath: 'one.webp' }],
      budgets: { maxFileBytes: 10 },
      processImage
    }), /file budget exceeded/);
    await assert.rejects(preparePublishedImages({
      repoRoot: root,
      manifestPath: 'manifest.json',
      entries: [{ id: 'one', sourcePath: '../source.png', outputPath: 'one.webp' }],
      processImage
    }), /escapes the repository root/);
    await assert.rejects(preparePublishedImages({
      repoRoot: root,
      manifestPath: 'manifest.json',
      entries: [
        { id: 'one', sourcePath: 'source.png', outputPath: 'same.webp' },
        { id: 'two', sourcePath: 'source.png', outputPath: 'same.webp' }
      ],
      processImage
    }), /duplicate image publish output/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
