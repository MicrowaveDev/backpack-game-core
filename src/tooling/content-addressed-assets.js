import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function resolveWithin(root, relativePath, label) {
  if (typeof relativePath !== 'string' || !relativePath) {
    throw new TypeError(`${label} must be a non-empty relative path`);
  }
  if (path.isAbsolute(relativePath)) throw new Error(`${label} must be relative`);
  const resolved = path.resolve(root, relativePath);
  const relative = path.relative(root, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`${label} escapes its root`);
  return resolved;
}

function validateEntry(entry) {
  if (!entry || typeof entry !== 'object') throw new TypeError('content-addressed asset entry must be an object');
  if (typeof entry.id !== 'string' || !entry.id) throw new TypeError('asset id must be a non-empty string');
  if (typeof entry.storageId !== 'string' || !/^[a-zA-Z0-9]+$/.test(entry.storageId)) {
    throw new TypeError(`${entry.id} storageId must contain only CID-safe characters`);
  }
  if (typeof entry.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(entry.sha256)) {
    throw new TypeError(`${entry.id} sha256 must be a lowercase SHA-256 hex digest`);
  }
  if (typeof entry.targetPath !== 'string' || !entry.targetPath) {
    throw new TypeError(`${entry.id} targetPath must be a non-empty repository-relative path`);
  }
  return entry;
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function writeAtomic(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  try {
    fs.writeFileSync(tempPath, data);
    fs.renameSync(tempPath, filePath);
  } finally {
    fs.rmSync(tempPath, { force: true });
  }
}

function readVerified(filePath, expectedSha256) {
  if (!fs.existsSync(filePath)) return null;
  const data = fs.readFileSync(filePath);
  if (sha256(data) === expectedSha256) return data;
  fs.rmSync(filePath, { force: true });
  return null;
}

function asBuffer(value, id) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  throw new TypeError(`${id} fetchAsset must return Buffer, Uint8Array, or ArrayBuffer`);
}

export async function hydrateContentAddressedAssets({
  repoRoot,
  entries,
  cacheDir = '.cache/game-assets',
  fetchAsset,
  offline = false
} = {}) {
  const root = path.resolve(repoRoot || process.cwd());
  const cacheRoot = resolveWithin(root, cacheDir, 'cacheDir');
  if (!Array.isArray(entries) || entries.length === 0) throw new Error('asset hydration requires at least one entry');
  if (!offline && typeof fetchAsset !== 'function') throw new TypeError('fetchAsset must be a function unless offline mode is enabled');

  const ids = new Set();
  const targets = new Set();
  const results = [];
  for (const rawEntry of entries) {
    const entry = validateEntry(rawEntry);
    if (ids.has(entry.id)) throw new Error(`duplicate asset id: ${entry.id}`);
    if (targets.has(entry.targetPath)) throw new Error(`duplicate asset targetPath: ${entry.targetPath}`);
    ids.add(entry.id);
    targets.add(entry.targetPath);

    const cachePath = resolveWithin(cacheRoot, entry.storageId, `${entry.id} cache path`);
    const targetPath = resolveWithin(root, entry.targetPath, `${entry.id} targetPath`);
    let data = readVerified(cachePath, entry.sha256);
    let cacheHit = Boolean(data);
    if (!data) {
      if (offline) throw new Error(`${entry.id} is not available in the verified offline cache`);
      data = asBuffer(await fetchAsset(entry), entry.id);
      const actualSha256 = sha256(data);
      if (actualSha256 !== entry.sha256) {
        throw new Error(`${entry.id} hash mismatch: expected ${entry.sha256}, received ${actualSha256}`);
      }
      writeAtomic(cachePath, data);
      cacheHit = false;
    }

    const existingTarget = readVerified(targetPath, entry.sha256);
    if (!existingTarget) writeAtomic(targetPath, data);
    results.push({
      id: entry.id,
      storageId: entry.storageId,
      sha256: entry.sha256,
      bytes: data.byteLength,
      targetPath: entry.targetPath,
      cacheHit,
      materialized: !existingTarget
    });
  }

  return {
    results,
    cacheHits: results.filter((entry) => entry.cacheHit).length,
    fetchedCount: results.filter((entry) => !entry.cacheHit).length,
    materializedCount: results.filter((entry) => entry.materialized).length
  };
}

export function contentAddressedAssetSha256(data) {
  return sha256(data);
}
