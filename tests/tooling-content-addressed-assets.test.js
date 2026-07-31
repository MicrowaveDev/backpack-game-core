import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  contentAddressedAssetSha256,
  hydrateContentAddressedAssets
} from '../src/tooling/content-addressed-assets.js';

test('[tooling/content-addressed-assets] fetches, verifies, caches, and materializes assets', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'core-content-cache-'));
  const data = Buffer.from('immutable character image');
  const entry = {
    id: 'fighter:idle',
    storageId: 'bafkreifighteridle',
    sha256: contentAddressedAssetSha256(data),
    targetPath: 'public/fighter-idle.webp'
  };
  let fetches = 0;
  try {
    const first = await hydrateContentAddressedAssets({
      repoRoot: root,
      entries: [entry],
      fetchAsset: async () => {
        fetches += 1;
        return data;
      }
    });
    assert.equal(first.fetchedCount, 1);
    assert.equal(first.materializedCount, 1);
    assert.deepEqual(fs.readFileSync(path.join(root, entry.targetPath)), data);

    fs.rmSync(path.join(root, entry.targetPath));
    const second = await hydrateContentAddressedAssets({ repoRoot: root, entries: [entry], offline: true });
    assert.equal(second.cacheHits, 1);
    assert.equal(second.materializedCount, 1);
    assert.equal(fetches, 1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('[tooling/content-addressed-assets] rejects corrupt downloads and unsafe paths', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'core-content-cache-invalid-'));
  const data = Buffer.from('expected');
  const base = {
    id: 'fighter',
    storageId: 'bafkreifighter',
    sha256: contentAddressedAssetSha256(data),
    targetPath: 'public/fighter.webp'
  };
  try {
    await assert.rejects(hydrateContentAddressedAssets({
      repoRoot: root,
      entries: [base],
      fetchAsset: async () => Buffer.from('tampered')
    }), /hash mismatch/);
    await assert.rejects(hydrateContentAddressedAssets({
      repoRoot: root,
      entries: [{ ...base, targetPath: '../fighter.webp' }],
      fetchAsset: async () => data
    }), /escapes its root/);
    await assert.rejects(hydrateContentAddressedAssets({
      repoRoot: root,
      entries: [base],
      offline: true
    }), /verified offline cache/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
