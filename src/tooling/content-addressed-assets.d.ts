export interface ContentAddressedAssetEntry {
  id: string;
  storageId: string;
  sha256: string;
  targetPath: string;
  [key: string]: unknown;
}

export interface HydratedContentAddressedAsset extends ContentAddressedAssetEntry {
  bytes: number;
  cacheHit: boolean;
  materialized: boolean;
}

export function hydrateContentAddressedAssets(options: {
  repoRoot?: string;
  entries: ContentAddressedAssetEntry[];
  cacheDir?: string;
  fetchAsset?: (entry: ContentAddressedAssetEntry) => Promise<Buffer | Uint8Array | ArrayBuffer>;
  offline?: boolean;
}): Promise<{
  results: HydratedContentAddressedAsset[];
  cacheHits: number;
  fetchedCount: number;
  materializedCount: number;
}>;

export function contentAddressedAssetSha256(data: Buffer | Uint8Array | ArrayBuffer): string;
