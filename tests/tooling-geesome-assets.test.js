import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  createGeesomeAssetProvider,
  geesomeServerUrls,
  hydrateGeesomeAssetManifest,
  publishGeesomeAssetManifest,
  readGeesomeAssetManifest
} from '../src/tooling/geesome-assets.js';

test('publishes, verifies, records, and hydrates configured Geesome assets', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'core-geesome-assets-'));
  const sourcePath = path.join(root, 'source.webp');
  const manifestPath = path.join(root, 'assets.json');
  const bytes = Buffer.from('verified-runtime-image');
  fs.writeFileSync(sourcePath, bytes);
  const requests = [];
  const fetchImpl = async (url, options = {}) => {
    requests.push({ url, options });
		if (url.endsWith('/.well-known/geesome')) {
			return new Response(JSON.stringify({
				apiBaseUrl: 'https://geesome.example/custom/v1',
				gatewayBaseUrl: 'https://geesome.example',
				capabilities: {assetUpload: true}
			}), {status: 200, headers: {'content-type': 'application/json'}});
		}
    if (options.method === 'POST') {
      assert.equal(options.headers.Authorization, 'Bearer secret');
			assert.match(options.headers['Idempotency-Key'], /^asset:[a-f0-9]{64}$/);
			assert.equal(options.body.get('logicalPath'), 'games/example/characters/public/characters/fighter/idle.webp');
			assert.equal(options.body.get('expectedSha256'), crypto.createHash('sha256').update(bytes).digest('hex'));
			assert.equal(options.body.get('previewPolicy'), 'none');
      return new Response(JSON.stringify({ storageId: 'bafkreiverifiedasset' }), {
			status: 201,
        headers: { 'content-type': 'application/json' }
      });
    }
    return new Response(bytes, { status: 200 });
  };

  try {
    const provider = createGeesomeAssetProvider({
      server: 'https://geesome.example/',
      apiKey: 'secret',
      remoteRoot: 'games/example/characters',
      fetchImpl
    });
    const manifest = await publishGeesomeAssetManifest({
      assets: [{
        id: 'runtime:fighter:idle',
        kind: 'runtime',
        filePath: sourcePath,
        targetPath: 'public/characters/fighter/idle.webp',
        mimeType: 'image/webp',
        metadata: { characterId: 'fighter' }
      }],
      provider,
      manifestPath,
      generatedAt: '2026-07-31T00:00:00.000Z'
    });
    assert.equal(manifest.gatewayUrl, 'https://geesome.example');
    assert.equal(readGeesomeAssetManifest({ manifestPath, required: true }).assets.length, 1);
		assert.equal(requests[0].url, 'https://geesome.example/.well-known/geesome');
		assert.equal(requests[1].url, 'https://geesome.example/custom/v1/assets');
		assert.equal(requests[2].url, 'https://geesome.example/ipfs/bafkreiverifiedasset');

    const hydrated = await hydrateGeesomeAssetManifest({
      repoRoot: root,
      manifest,
      kinds: ['runtime'],
      cacheDir: '.cache/geesome',
      fetchImpl
    });
    assert.equal(hydrated.fetchedCount, 1);
    assert.deepEqual(fs.readFileSync(path.join(root, 'public/characters/fighter/idle.webp')), bytes);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('normalizes public and API Geesome URLs and rejects unsafe remote paths', async () => {
  assert.deepEqual(geesomeServerUrls('https://geesome.example/'), {
    apiUrl: 'https://geesome.example/api',
    gatewayUrl: 'https://geesome.example'
  });
  assert.deepEqual(geesomeServerUrls('https://geesome.example/api'), {
    apiUrl: 'https://geesome.example/api',
    gatewayUrl: 'https://geesome.example'
  });
  assert.throws(() => geesomeServerUrls('file:///tmp/geesome'), /HTTP or HTTPS/);

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'core-geesome-path-'));
  const filePath = path.join(root, 'file.webp');
  fs.writeFileSync(filePath, 'data');
  try {
    const provider = createGeesomeAssetProvider({
      server: 'https://geesome.example',
      apiKey: 'secret',
      remoteRoot: '../escape',
      fetchImpl: async () => new Response('{}', { status: 200 })
    });
    await assert.rejects(provider.publishAsset({
      id: 'unsafe',
      filePath,
      targetPath: 'file.webp'
    }), /safe slash-delimited path/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('does not write a manifest when Geesome read-back verification fails', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'core-geesome-mismatch-'));
  const filePath = path.join(root, 'file.webp');
  const manifestPath = path.join(root, 'manifest.json');
  fs.writeFileSync(filePath, 'expected');
  try {
    await assert.rejects(publishGeesomeAssetManifest({
      assets: [{ id: 'runtime:file', kind: 'runtime', filePath, targetPath: 'public/file.webp' }],
      provider: {
        gatewayUrl: 'https://geesome.example',
        publishAsset: async () => ({ storageId: 'bafkreimismatch' }),
        fetchAsset: async () => Buffer.from('different')
      },
      manifestPath
    }), /verification failed/);
    assert.equal(fs.existsSync(manifestPath), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
