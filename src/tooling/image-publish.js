import fs from 'node:fs';
import path from 'node:path';
import { fileSha256 } from './image.js';

const SUPPORTED_FORMATS = new Set(['avif', 'jpeg', 'png', 'webp']);

function resolveWithin(repoRoot, relativePath, label) {
  if (typeof relativePath !== 'string' || !relativePath) {
    throw new TypeError(`${label} must be a non-empty repository-relative path`);
  }
  if (path.isAbsolute(relativePath)) throw new Error(`${label} must be repository-relative`);
  const absolutePath = path.resolve(repoRoot, relativePath);
  const relative = path.relative(repoRoot, absolutePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`${label} escapes the repository root`);
  }
  return absolutePath;
}

function positiveInteger(value, label, { optional = false } = {}) {
  if (optional && value == null) return undefined;
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new RangeError(`${label} must be a positive integer`);
  return number;
}

function normalizeEntry(entry, defaults) {
  if (!entry || typeof entry !== 'object') throw new TypeError('image publish entry must be an object');
  if (typeof entry.id !== 'string' || !entry.id) throw new TypeError('image publish entry id must be a non-empty string');
  const format = String(entry.format || defaults.format || 'webp').toLowerCase();
  if (!SUPPORTED_FORMATS.has(format)) throw new RangeError(`unsupported image publish format: ${format}`);
  return {
    id: entry.id,
    sourcePath: entry.sourcePath,
    outputPath: entry.outputPath,
    width: positiveInteger(entry.width ?? defaults.width, `${entry.id} width`, { optional: true }),
    height: positiveInteger(entry.height ?? defaults.height, `${entry.id} height`, { optional: true }),
    fit: entry.fit || defaults.fit || 'inside',
    format,
    quality: positiveInteger(entry.quality ?? defaults.quality ?? 82, `${entry.id} quality`),
    effort: positiveInteger(entry.effort ?? defaults.effort ?? 4, `${entry.id} effort`),
    metadata: entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : {}
  };
}

function processingKey(entry) {
  return JSON.stringify({
    width: entry.width || null,
    height: entry.height || null,
    fit: entry.fit,
    format: entry.format,
    quality: entry.quality,
    effort: entry.effort
  });
}

function readManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) return null;
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return manifest?.schemaVersion === 1 && Array.isArray(manifest.entries) ? manifest : null;
  } catch {
    return null;
  }
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(tempPath, filePath);
}

async function defaultSharpProcessor({ sourcePath, outputPath, entry }) {
  let sharp;
  try {
    ({ default: sharp } = await import('sharp'));
  } catch (error) {
    throw new Error(`image publishing requires the optional "sharp" package: ${error.message}`);
  }

  let pipeline = sharp(sourcePath, { failOn: 'error' }).rotate();
  if (entry.width || entry.height) {
    pipeline = pipeline.resize({
      width: entry.width,
      height: entry.height,
      fit: entry.fit,
      withoutEnlargement: true
    });
  }
  if (entry.format === 'webp') pipeline = pipeline.webp({ quality: entry.quality, alphaQuality: 100, effort: entry.effort, smartSubsample: true });
  else if (entry.format === 'avif') pipeline = pipeline.avif({ quality: entry.quality, effort: Math.min(entry.effort, 9) });
  else if (entry.format === 'jpeg') pipeline = pipeline.jpeg({ quality: entry.quality, mozjpeg: true });
  else pipeline = pipeline.png({ compressionLevel: 9, effort: Math.min(entry.effort, 10) });
  return pipeline.toFile(outputPath);
}

export async function preparePublishedImages({
  repoRoot,
  entries,
  manifestPath,
  defaults = {},
  budgets = {},
  prune = false,
  pruneRoots = [],
  processImage = defaultSharpProcessor
} = {}) {
  const root = path.resolve(repoRoot || process.cwd());
  if (!Array.isArray(entries) || entries.length === 0) throw new Error('image publishing requires at least one entry');
  if (typeof processImage !== 'function') throw new TypeError('processImage must be a function');
  const absoluteManifestPath = resolveWithin(root, manifestPath, 'manifestPath');
  const normalized = entries.map((entry) => normalizeEntry(entry, defaults));
  const ids = new Set();
  const outputs = new Set();
  for (const entry of normalized) {
    if (ids.has(entry.id)) throw new Error(`duplicate image publish id: ${entry.id}`);
    if (outputs.has(entry.outputPath)) throw new Error(`duplicate image publish output: ${entry.outputPath}`);
    ids.add(entry.id);
    outputs.add(entry.outputPath);
  }

  const previous = readManifest(absoluteManifestPath);
  const previousById = new Map((previous?.entries || []).map((entry) => [entry.id, entry]));
  const absolutePruneRoots = pruneRoots.map((pruneRoot) => resolveWithin(root, pruneRoot, 'pruneRoot'));
  if (prune && absolutePruneRoots.length === 0) throw new Error('prune requires at least one pruneRoot');
  const published = [];
  let processedCount = 0;

  for (const entry of normalized) {
    const sourcePath = resolveWithin(root, entry.sourcePath, `${entry.id} sourcePath`);
    const outputPath = resolveWithin(root, entry.outputPath, `${entry.id} outputPath`);
    if (sourcePath === outputPath) throw new Error(`${entry.id} source and output paths must differ`);
    if (!fs.existsSync(sourcePath)) throw new Error(`${entry.id} source does not exist: ${entry.sourcePath}`);
    const sourceSha256 = fileSha256(sourcePath);
    const key = processingKey(entry);
    const old = previousById.get(entry.id);
    const currentOutputSha = fs.existsSync(outputPath) ? fileSha256(outputPath) : null;
    let imageInfo = old?.image || null;
    const unchanged = old
      && old.sourceSha256 === sourceSha256
      && old.processingKey === key
      && old.outputSha256 === currentOutputSha;

    if (!unchanged) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      const tempPath = `${outputPath}.${process.pid}.tmp`;
      try {
        imageInfo = await processImage({ sourcePath, outputPath: tempPath, entry });
        fs.renameSync(tempPath, outputPath);
      } finally {
        fs.rmSync(tempPath, { force: true });
      }
      processedCount += 1;
    }

    const stat = fs.statSync(outputPath);
    published.push({
      id: entry.id,
      sourcePath: entry.sourcePath,
      sourceSha256,
      outputPath: entry.outputPath,
      outputSha256: fileSha256(outputPath),
      bytes: stat.size,
      processingKey: key,
      metadata: entry.metadata,
      image: imageInfo ? {
        width: imageInfo.width ?? null,
        height: imageInfo.height ?? null,
        format: imageInfo.format || entry.format
      } : null
    });
  }

  published.sort((a, b) => a.id.localeCompare(b.id));
  const totalBytes = published.reduce((sum, entry) => sum + entry.bytes, 0);
  const maxFileBytes = positiveInteger(budgets.maxFileBytes, 'maxFileBytes', { optional: true });
  const maxTotalBytes = positiveInteger(budgets.maxTotalBytes, 'maxTotalBytes', { optional: true });
  const oversized = maxFileBytes ? published.filter((entry) => entry.bytes > maxFileBytes) : [];
  if (oversized.length) {
    throw new Error(`image publish file budget exceeded: ${oversized.map((entry) => `${entry.id}=${entry.bytes}`).join(', ')}`);
  }
  if (maxTotalBytes && totalBytes > maxTotalBytes) {
    throw new Error(`image publish total budget exceeded: ${totalBytes} > ${maxTotalBytes}`);
  }

  let prunedCount = 0;
  if (prune) {
    for (const oldEntry of previous?.entries || []) {
      if (outputs.has(oldEntry.outputPath)) continue;
      const stalePath = resolveWithin(root, oldEntry.outputPath, `${oldEntry.id} stale outputPath`);
      const canPrune = absolutePruneRoots.some((pruneRoot) => {
        const relative = path.relative(pruneRoot, stalePath);
        return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
      });
      if (!canPrune) throw new Error(`refusing to prune outside configured roots: ${oldEntry.outputPath}`);
      if (fs.existsSync(stalePath)) {
        fs.rmSync(stalePath);
        prunedCount += 1;
      }
    }
  }

  const manifest = {
    schemaVersion: 1,
    totalBytes,
    budgets: { maxFileBytes: maxFileBytes || null, maxTotalBytes: maxTotalBytes || null },
    entries: published
  };
  writeJsonAtomic(absoluteManifestPath, manifest);
  return { manifest, processedCount, skippedCount: published.length - processedCount, prunedCount };
}
