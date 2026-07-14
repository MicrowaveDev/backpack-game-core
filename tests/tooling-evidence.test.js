import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  atomicWriteJson,
  buildEvidenceManifest,
  fileEvidence,
  verifyEvidenceManifest,
  writeEvidenceManifest,
  writeEvidenceBundle
} from '@microwavedev/backpack-game-core/tooling/evidence';
import { renderRasterReview } from '@microwavedev/backpack-game-core/tooling/image-review';
import { decodePngBuffer } from '@microwavedev/backpack-game-core/tooling/image';

test('[tooling/evidence] writes deterministic hash-bound output and manifest files', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'core-evidence-'));
  try {
    const outputPath = path.join(root, 'review', 'sheet.png');
    const manifestPath = path.join(root, 'review', 'sheet.manifest.json');
    const outputBuffer = Buffer.from('review-bytes');
    const manifest = writeEvidenceBundle({
      outputPath,
      outputBuffer,
      manifestPath,
      root,
      generatedAt: '2026-07-14T00:00:00.000Z',
      manifest: { schemaVersion: 1, entries: [{ id: 'one' }] }
    });

    assert.equal(fs.readFileSync(outputPath, 'utf8'), 'review-bytes');
    assert.equal(manifest.output, 'review/sheet.png');
    assert.match(manifest.outputHash, /^[a-f0-9]{64}$/);
    assert.equal(verifyEvidenceManifest(manifest).valid, true);
    assert.deepEqual(JSON.parse(fs.readFileSync(manifestPath, 'utf8')), manifest);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('[tooling/evidence] writes atomic mutable JSON and manifest-only evidence', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'core-evidence-json-'));
  try {
    const recordPath = path.join(root, 'record.json');
    atomicWriteJson(recordPath, { value: 1 });
    atomicWriteJson(recordPath, { value: 2 }, { trailingNewline: false });
    assert.equal(fs.readFileSync(recordPath, 'utf8'), '{\n  "value": 2\n}');
    const manifest = writeEvidenceManifest({
      manifestPath: path.join(root, 'manifest.json'),
      generatedAt: null,
      manifest: { schemaVersion: 1, entries: [] }
    });
    assert.equal(verifyEvidenceManifest(manifest).valid, true);
    assert.equal(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8').endsWith('\n'), true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('[tooling/evidence] binds files and detects manifest mutation', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'core-evidence-file-'));
  try {
    const inputPath = path.join(root, 'asset.png');
    fs.writeFileSync(inputPath, 'asset');
    assert.deepEqual(fileEvidence(inputPath, { root, id: 'asset' }), {
      id: 'asset',
      path: 'asset.png',
      size: 5,
      sha256: 'd59386e0ae435e292fbe0ebcdb954b75ed5fb3922091277cb19f798fc5d50718'
    });
    const manifest = buildEvidenceManifest({
      generatedAt: null,
      manifest: { schemaVersion: 1, entries: [] }
    });
    assert.equal(verifyEvidenceManifest(manifest).valid, true);
    manifest.entries.push({ id: 'changed' });
    assert.equal(verifyEvidenceManifest(manifest).valid, false);
    assert.equal(fileEvidence(path.join(root, 'missing'), { root, optional: true }), null);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('[tooling/image-review] renders raster evidence through the shared lifecycle', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'core-raster-review-'));
  try {
    const outputPath = path.join(root, 'sheet.png');
    const manifestPath = path.join(root, 'sheet.json');
    const result = renderRasterReview({
      root,
      outputPath,
      manifestPath,
      generatedAt: '2026-07-14T00:00:00.000Z',
      manifest: { schemaVersion: 1, status: 'preview' },
      render: () => ({ width: 1, height: 1, rgba: Buffer.from([1, 2, 3, 255]) })
    });
    assert.deepEqual(decodePngBuffer(result.outputBuffer), {
      width: 1,
      height: 1,
      rgba: Buffer.from([1, 2, 3, 255])
    });
    assert.equal(result.manifest.output, 'sheet.png');
    assert.equal(verifyEvidenceManifest(result.manifest).valid, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
