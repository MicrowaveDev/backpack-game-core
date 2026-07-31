export interface PublishedImageInput {
  id: string;
  sourcePath: string;
  outputPath: string;
  width?: number;
  height?: number;
  fit?: string;
  format?: 'avif' | 'jpeg' | 'png' | 'webp';
  quality?: number;
  effort?: number;
  metadata?: Record<string, unknown>;
}

export interface PublishedImageManifestEntry {
  id: string;
  sourcePath: string;
  sourceSha256: string;
  outputPath: string;
  outputSha256: string;
  bytes: number;
  processingKey: string;
  metadata: Record<string, unknown>;
  image: { width: number | null; height: number | null; format: string } | null;
}

export function preparePublishedImages(options: {
  repoRoot: string;
  entries: PublishedImageInput[];
  manifestPath: string;
  defaults?: Partial<PublishedImageInput>;
  budgets?: { maxFileBytes?: number; maxTotalBytes?: number };
  prune?: boolean;
  pruneRoots?: string[];
  processImage?: (input: {
    sourcePath: string;
    outputPath: string;
    entry: PublishedImageInput;
  }) => Promise<{ width?: number; height?: number; format?: string }>;
}): Promise<{
  manifest: {
    schemaVersion: 1;
    totalBytes: number;
    budgets: { maxFileBytes: number | null; maxTotalBytes: number | null };
    entries: PublishedImageManifestEntry[];
  };
  processedCount: number;
  skippedCount: number;
  prunedCount: number;
}>;
