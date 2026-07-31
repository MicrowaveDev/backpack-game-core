import type { ContentAddressedAssetEntry } from './content-addressed-assets.js';

export interface GeesomeAssetSource {
  id: string;
  kind: string;
  filePath: string;
  targetPath: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}

export interface GeesomeAssetManifest {
  schemaVersion: 1;
  provider: 'geesome';
  gatewayUrl: string;
  generatedAt: string;
  assets: Array<ContentAddressedAssetEntry & {
    kind: string;
    bytes: number;
    mimeType?: string;
    metadata?: Record<string, unknown>;
  }>;
}

export function geesomeServerUrls(server: string): { apiUrl: string; gatewayUrl: string };

export function createGeesomeAssetProvider(options: {
  server: string;
  apiKey?: string;
  remoteRoot?: string;
  fetchImpl?: typeof fetch;
}): {
  apiUrl: string;
  gatewayUrl: string;
  fetchAsset(entry: ContentAddressedAssetEntry): Promise<Buffer>;
  publishAsset(asset: GeesomeAssetSource): Promise<{ storageId: string }>;
};

export function readGeesomeAssetManifest(options: {
  manifestPath: string;
  required?: boolean;
}): GeesomeAssetManifest | null;

export function createGeesomePublicationRecord(asset: GeesomeAssetSource, storageId: string): GeesomeAssetManifest['assets'][number];

export function publishGeesomeAssetManifest(options: {
  assets: GeesomeAssetSource[];
  provider: ReturnType<typeof createGeesomeAssetProvider>;
  manifestPath: string;
  generatedAt?: string;
}): Promise<GeesomeAssetManifest>;

export function hydrateGeesomeAssetManifest(options: {
  repoRoot?: string;
  manifestPath?: string;
  manifest?: GeesomeAssetManifest;
  kinds?: string[];
  cacheDir?: string;
  server?: string;
  offline?: boolean;
  fetchImpl?: typeof fetch;
}): ReturnType<typeof import('./content-addressed-assets.js').hydrateContentAddressedAssets>;
