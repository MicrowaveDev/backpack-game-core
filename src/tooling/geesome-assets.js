import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  contentAddressedAssetSha256,
  hydrateContentAddressedAssets
} from './content-addressed-assets.js';

function requiredText(value, name) {
  const normalized = String(value || '').trim();
  if (!normalized) throw new Error(`${name} is required`);
  return normalized;
}

function responseError(response) {
  return response.text().then((text) => text || `${response.status} ${response.statusText}`);
}

function remoteAssetPath(remoteRoot, targetPath) {
  const root = requiredText(remoteRoot, 'remoteRoot').replace(/^\/+|\/+$/g, '');
  const target = requiredText(targetPath, 'targetPath').replace(/^\/+/, '');
  const segments = `${root}/${target}`.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..' || segment.includes('\\'))) {
    throw new Error('remoteRoot and targetPath must form a safe slash-delimited path');
  }
  return `/${segments.join('/')}`;
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  try {
    fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`);
    fs.renameSync(tempPath, filePath);
  } finally {
    fs.rmSync(tempPath, { force: true });
  }
}

export function geesomeServerUrls(value) {
  const normalized = requiredText(value, 'GEESOME_URL').replace(/\/+$/, '');
  const parsed = new URL(normalized);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('GEESOME_URL must use HTTP or HTTPS');
  const hasApiSuffix = parsed.pathname.replace(/\/+$/, '').endsWith('/api');
  return {
    apiUrl: hasApiSuffix ? normalized : `${normalized}/api`,
    gatewayUrl: hasApiSuffix ? normalized.slice(0, -4) : normalized
  };
}

export async function discoverGeesomeServer(value, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') throw new TypeError('A Fetch-compatible implementation is required');
  const { gatewayUrl } = geesomeServerUrls(value);
  const response = await fetchImpl(`${gatewayUrl}/.well-known/geesome`);
  if (!response.ok) throw new Error(`Geesome discovery failed: ${await responseError(response)}`);
  const discovery = await response.json();
  const apiBaseUrl = validatedAdvertisedUrl(discovery.apiBaseUrl, gatewayUrl, 'apiBaseUrl');
  const advertisedGatewayUrl = validatedAdvertisedUrl(discovery.gatewayBaseUrl, gatewayUrl, 'gatewayBaseUrl');
  if (discovery.capabilities?.assetUpload !== true) {
    throw new Error('Geesome discovery does not advertise assetUpload capability');
  }
  return {...discovery, apiBaseUrl, gatewayBaseUrl: advertisedGatewayUrl};
}

export function createGeesomeAssetProvider({
  server,
  apiKey,
  remoteRoot,
  fetchImpl = globalThis.fetch
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('A Fetch-compatible implementation is required');
  const { apiUrl, gatewayUrl } = geesomeServerUrls(server);
  let discoveryPromise;
	const discover = () => discoveryPromise ||= discoverGeesomeServer(gatewayUrl, fetchImpl);
  return {
    apiUrl,
    gatewayUrl,
    async fetchAsset(entry) {
      const response = await fetchImpl(`${gatewayUrl}/ipfs/${encodeURIComponent(entry.storageId)}`);
      if (!response.ok) throw new Error(`Geesome read failed for ${entry.id}: ${await responseError(response)}`);
      return Buffer.from(await response.arrayBuffer());
    },
    async publishAsset({ id, filePath, targetPath, mimeType = 'application/octet-stream' }) {
      const token = requiredText(apiKey, 'GEESOME_API_KEY');
      const data = fs.readFileSync(filePath);
		const sha256 = contentAddressedAssetSha256(data);
		const logicalPath = remoteAssetPath(remoteRoot, targetPath).replace(/^\/+/, '');
      const form = new FormData();
      form.append('file', new Blob([data], { type: mimeType }), path.basename(filePath));
		form.append('expectedSha256', sha256);
		form.append('logicalPath', logicalPath);
		form.append('previewPolicy', 'none');
		const discovery = await discover();
		const idempotencyKey = `asset:${crypto.createHash('sha256').update(`${id}:${logicalPath}:${sha256}`).digest('hex')}`;
      const response = await fetchImpl(`${discovery.apiBaseUrl}/assets`, {
        method: 'POST',
		headers: {Authorization: `Bearer ${token}`, 'Idempotency-Key': idempotencyKey},
        body: form
      });
      if (!response.ok) throw new Error(`Geesome upload failed for ${id}: ${await responseError(response)}`);
      const content = await response.json();
      if (content.asyncOperationId) {
        throw new Error(`Geesome upload for ${id} unexpectedly became asynchronous; publish with synchronous content limits`);
      }
      const storageId = content.storageId || content.result?.storageId;
      if (typeof storageId !== 'string' || !/^[a-zA-Z0-9]+$/.test(storageId)) {
        throw new Error(`Geesome upload for ${id} returned no valid storageId`);
      }
      return { storageId };
    }
  };
}

function validatedAdvertisedUrl(value, expectedOrigin, fieldName) {
  const url = new URL(requiredText(value, fieldName));
  const origin = new URL(expectedOrigin);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.origin !== origin.origin) {
    throw new Error(`Geesome discovery ${fieldName} must be a same-origin HTTP or HTTPS URL`);
  }
  return url.href.replace(/\/+$/, '');
}

export function readGeesomeAssetManifest({ manifestPath, required = false } = {}) {
  const selectedPath = requiredText(manifestPath, 'manifestPath');
  if (!fs.existsSync(selectedPath)) {
    if (required) throw new Error(`Geesome asset manifest is missing: ${selectedPath}`);
    return null;
  }
  const manifest = JSON.parse(fs.readFileSync(selectedPath, 'utf8'));
  if (manifest.schemaVersion !== 1 || manifest.provider !== 'geesome' || !Array.isArray(manifest.assets)) {
    throw new Error('Unsupported Geesome asset manifest');
  }
  return manifest;
}

export function createGeesomePublicationRecord(asset, storageId) {
  const data = fs.readFileSync(asset.filePath);
  return {
    id: asset.id,
    kind: asset.kind,
    storageId,
    sha256: contentAddressedAssetSha256(data),
    bytes: data.byteLength,
    mimeType: asset.mimeType,
    targetPath: asset.targetPath,
    metadata: asset.metadata
  };
}

export async function publishGeesomeAssetManifest({
  assets,
  provider,
  manifestPath,
  generatedAt = new Date().toISOString()
} = {}) {
  if (!Array.isArray(assets) || assets.length === 0) throw new Error('Geesome publication requires at least one asset');
  if (!provider || typeof provider.publishAsset !== 'function' || typeof provider.fetchAsset !== 'function') {
    throw new TypeError('Geesome publication requires a provider with publishAsset and fetchAsset');
  }
  const records = [];
  for (const asset of assets) {
    const { storageId } = await provider.publishAsset(asset);
    const record = createGeesomePublicationRecord(asset, storageId);
    const downloaded = await provider.fetchAsset(record);
    const downloadedSha256 = contentAddressedAssetSha256(downloaded);
    if (downloadedSha256 !== record.sha256) {
      throw new Error(`Geesome verification failed for ${record.id}: expected ${record.sha256}, received ${downloadedSha256}`);
    }
    records.push(record);
  }
  const manifest = {
    schemaVersion: 1,
    provider: 'geesome',
    gatewayUrl: provider.gatewayUrl,
    generatedAt,
    assets: records
  };
  writeJsonAtomic(requiredText(manifestPath, 'manifestPath'), manifest);
  return manifest;
}

export async function hydrateGeesomeAssetManifest({
  repoRoot,
  manifestPath,
  manifest = null,
  kinds = ['runtime'],
  cacheDir = '.cache/game-assets/geesome',
  server,
  offline = false,
  fetchImpl
} = {}) {
  const selectedManifest = manifest || readGeesomeAssetManifest({ manifestPath, required: true });
  const selectedKinds = new Set(kinds);
  const entries = selectedManifest.assets.filter((entry) => selectedKinds.has(entry.kind));
  if (entries.length === 0) {
    throw new Error(`Geesome asset manifest contains no ${[...selectedKinds].join('/')} assets`);
  }
  const provider = offline ? null : createGeesomeAssetProvider({
    server: server || selectedManifest.gatewayUrl,
    fetchImpl
  });
  return hydrateContentAddressedAssets({
    repoRoot,
    entries,
    cacheDir,
    fetchAsset: provider?.fetchAsset,
    offline
  });
}
