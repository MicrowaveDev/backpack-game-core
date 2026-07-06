export interface SocialPreviewCacheRenderOptions {
  out?: string | null;
  [key: string]: unknown;
}

export interface SocialPreviewCacheServiceOptions {
  renderPreview: (options: SocialPreviewCacheRenderOptions) => unknown | Promise<unknown>;
  renderOptions?: SocialPreviewCacheRenderOptions;
  outputPath?: string | null;
  ensureOutputDirectory?: (input: {
    outputPath: string | null | undefined;
    renderOptions: SocialPreviewCacheRenderOptions;
  }) => unknown | Promise<unknown>;
  copyFallback?: (input: {
    error: unknown;
    outputPath: string | null | undefined;
    renderOptions: SocialPreviewCacheRenderOptions;
  }) => boolean | unknown | Promise<boolean | unknown>;
  logger?: {
    info?: (payload: Record<string, unknown>) => unknown;
    warn?: (payload: Record<string, unknown>) => unknown;
    [key: string]: unknown;
  } | null;
  relativePath?: ((outputPath: string) => string) | null;
  logKind?: string;
  throwOnFailure?: boolean;
}

export interface SocialPreviewCacheResult {
  ok: boolean;
  outcome: 'generated' | 'fallback' | 'failed';
  generated: boolean;
  fallback: boolean;
  path: string | null;
  result?: unknown;
  error?: unknown;
}

export interface SocialPreviewCacheService {
  ensureSocialPreviewCache(options?: SocialPreviewCacheRenderOptions): Promise<SocialPreviewCacheResult>;
  ensureCache(options?: SocialPreviewCacheRenderOptions): Promise<SocialPreviewCacheResult>;
}

export declare function createSocialPreviewCacheService(
  options?: SocialPreviewCacheServiceOptions
): SocialPreviewCacheService;
