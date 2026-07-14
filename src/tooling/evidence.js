import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function jsonBuffer(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function temporaryPath(filePath) {
  return path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`
  );
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function atomicWriteFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = temporaryPath(filePath);
  try {
    fs.writeFileSync(tempPath, value);
    fs.renameSync(tempPath, filePath);
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}

export function atomicWriteJson(filePath, value, { space = 2, trailingNewline = true } = {}) {
  if (!Number.isInteger(space) || space < 0 || space > 10) throw new RangeError('JSON space must be an integer in [0, 10]');
  const encoded = JSON.stringify(value, null, space) + (trailingNewline ? '\n' : '');
  atomicWriteFile(filePath, encoded);
}

export function fileEvidence(filePath, { root = process.cwd(), id, optional = false } = {}) {
  if (!fs.existsSync(filePath)) {
    if (optional) return null;
    throw new Error(`Missing evidence input: ${path.relative(root, filePath) || filePath}`);
  }
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) throw new Error(`Evidence input is not a file: ${path.relative(root, filePath) || filePath}`);
  return {
    ...(id === undefined ? {} : { id }),
    path: path.relative(root, filePath) || path.basename(filePath),
    size: stat.size,
    sha256: sha256(fs.readFileSync(filePath))
  };
}

export function buildEvidenceManifest({
  manifest = {},
  generatedAt = new Date().toISOString(),
  outputBuffer,
  outputPath,
  root = process.cwd(),
  hashField = 'manifestSha256'
} = {}) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('manifest must be an object');
  }
  const result = { ...manifest };
  if (generatedAt !== null && result.generatedAt === undefined) result.generatedAt = generatedAt;
  if (outputBuffer !== undefined) {
    if (!Buffer.isBuffer(outputBuffer)) throw new Error('outputBuffer must be a Buffer');
    result.outputHash = sha256(outputBuffer);
    if (outputPath) result.output = path.relative(root, outputPath) || path.basename(outputPath);
  }
  delete result[hashField];
  result[hashField] = sha256(jsonBuffer(result));
  return result;
}

export function writeEvidenceBundle({
  outputPath,
  outputBuffer,
  manifestPath,
  manifest,
  generatedAt,
  root,
  hashField
}) {
  if (!outputPath || !manifestPath) throw new Error('outputPath and manifestPath are required');
  if (!Buffer.isBuffer(outputBuffer)) throw new Error('outputBuffer must be a Buffer');
  const built = buildEvidenceManifest({
    manifest,
    generatedAt,
    outputBuffer,
    outputPath,
    root,
    hashField
  });
  atomicWriteFile(outputPath, outputBuffer);
  atomicWriteFile(manifestPath, jsonBuffer(built));
  return built;
}

export function writeEvidenceManifest({ manifestPath, manifest, generatedAt, hashField }) {
  if (!manifestPath) throw new Error('manifestPath is required');
  const built = buildEvidenceManifest({ manifest, generatedAt, hashField });
  atomicWriteJson(manifestPath, built);
  return built;
}

export function verifyEvidenceManifest(manifest, { hashField = 'manifestSha256' } = {}) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return { valid: false, expected: null, actual: null };
  }
  const actual = manifest[hashField];
  const unsigned = { ...manifest };
  delete unsigned[hashField];
  const expected = sha256(jsonBuffer(unsigned));
  return { valid: actual === expected, expected, actual: actual || null };
}
