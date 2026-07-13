export interface MushroomWalletServicePortOptions {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }>;
  withTransaction: <T>(fn: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }> }) => Promise<T>) => Promise<T>;
  createId: (prefix: string) => string;
  nowIso: () => string;
  parseJson?: (value: unknown, fallback?: unknown) => unknown;
  env?: Record<string, string | undefined>;
  defaultFetch?: typeof fetch;
}

export interface MushroomAssetServicePortOptions {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }>;
  withTransaction: <T>(fn: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }> }) => Promise<T>) => Promise<T>;
  PORTRAIT_VARIANTS: Record<string, unknown[]>;
  portraitVariantsForResponse: (variants: unknown) => unknown;
  portraitUrl: (characterId: string, portraitId?: string) => string;
  createId: (prefix: string) => string;
  nowIso: () => string;
  parseJson?: (value: unknown, fallback?: unknown) => unknown;
  spendCurrency: (client: unknown, params: Record<string, unknown>) => Promise<unknown>;
  WALLET_CURRENCY_CODE?: string;
  withWalletMutationLock: <T>(playerId: string, work: () => Promise<T>) => Promise<T>;
  withMutationClaim: <T>(scope: string, key: string, work: () => Promise<T>) => Promise<T>;
  env?: Record<string, string | undefined>;
}

export interface MushroomGachaAdminServicePortOptions {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }>;
  withTransaction: <T>(fn: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }> }) => Promise<T>) => Promise<T>;
  characterVariants: Record<string, unknown[]>;
  createId: (prefix: string) => string;
  nowIso: () => string;
  parseJson?: (value: unknown, fallback?: unknown) => unknown;
  getAssetCatalog: () => unknown[];
  getRuntimeAssetCatalog: (options?: Record<string, unknown>) => Promise<unknown[]>;
  shapeAssetPack: (pack: unknown, options?: Record<string, unknown>) => unknown;
  validateAssetPack: (pack: unknown, options?: Record<string, unknown>) => unknown;
  walletCurrencyCode?: string;
  writePlanImage: (input: {
    seasonId: string;
    itemId: string;
    buffer: Uint8Array;
    mimeType: string;
    extension: string;
  }) => Promise<{ imagePath: string }>;
  deletePlanImage: (imagePath: string) => Promise<void>;
  env?: Record<string, string | undefined>;
}

export interface MushroomGachaAdminServicePort {
  listGachaAdminCatalog(): Promise<unknown>;
  exportGachaAdminFixture(): Promise<unknown>;
  importGachaAdminFixture(options?: Record<string, unknown>): Promise<unknown>;
  createGachaPlanItem(options?: Record<string, unknown>): Promise<unknown>;
  updateGachaPlanItem(options?: Record<string, unknown>): Promise<unknown>;
  deleteGachaPlanItem(options?: Record<string, unknown>): Promise<unknown>;
  createGachaSeason(options?: Record<string, unknown>): Promise<unknown>;
  updateGachaSeason(options?: Record<string, unknown>): Promise<unknown>;
  createGachaCollection(options?: Record<string, unknown>): Promise<unknown>;
  updateGachaCollection(options?: Record<string, unknown>): Promise<unknown>;
  createGachaPack(options?: Record<string, unknown>): Promise<unknown>;
  updateGachaPack(options?: Record<string, unknown>): Promise<unknown>;
  createGachaPackItem(options?: Record<string, unknown>): Promise<unknown>;
  updateGachaPackItem(options?: Record<string, unknown>): Promise<unknown>;
  deleteGachaPackItem(options?: Record<string, unknown>): Promise<unknown>;
  replaceGachaPackItems(options?: Record<string, unknown>): Promise<unknown>;
  promoteGachaPlanItemsToPack(options?: Record<string, unknown>): Promise<unknown>;
  validateGachaAdminPack(options?: Record<string, unknown>): Promise<unknown>;
  previewGachaAdminPack(options?: Record<string, unknown>): Promise<unknown>;
  transitionGachaPack(options?: Record<string, unknown>): Promise<unknown>;
}

export interface MushroomAssetServicePort {
  activeGachaPackIds(): string[];
  assetGachaDbPacksEnabled(): boolean;
  assetPolicy(asset: unknown): unknown;
  burnAssetPackDuplicates(playerId: string, packId: string, options?: Record<string, unknown>): Promise<unknown>;
  chooseWeightedAssetCandidate(candidates: unknown[], rng: () => number): unknown;
  computePackPityState(pack: unknown, options?: Record<string, unknown>): unknown;
  directBuyPolicy(): string;
  equipAsset(playerId: string, assetId: string): Promise<unknown>;
  equipPortrait(playerId: string, characterId: string, portraitId: string): Promise<unknown>;
  getAssetById(assetId: string): unknown;
  getAssetCatalog(): unknown[];
  getAssetPack(packId: string): unknown;
  getAssetPacks(): unknown[];
  getAssetPacksForPlayer(playerId: string): Promise<unknown[]>;
  getDatabaseAssetPacks(options?: Record<string, unknown>): Promise<unknown[]>;
  getPackOdds(packId: string): unknown;
  getPackOddsForRuntime(packId: string): Promise<unknown>;
  getPlayerCosmeticState(playerId: string): Promise<unknown>;
  getRuntimeAssetById(assetId: string, options?: Record<string, unknown>): Promise<unknown>;
  getRuntimeAssetCatalog(options?: Record<string, unknown>): Promise<unknown[]>;
  getRuntimeAssetPack(packId: string, options?: Record<string, unknown>): Promise<unknown>;
  getRuntimeAssetPacks(options?: Record<string, unknown>): Promise<unknown[]>;
  getRuntimePortraitVariantsForResponse(options?: Record<string, unknown>): Promise<unknown>;
  isAssetGachaEnabled(): boolean;
  parsePortraitAssetId(assetId: string): unknown;
  portraitAssetId(characterId: string, portraitId?: string): string;
  purchaseAsset(playerId: string, assetId: string, options?: Record<string, unknown>): Promise<unknown>;
  resolveAssetPackRollCandidates(pack: unknown, options?: Record<string, unknown>): unknown[];
  resolveEquippedPortraitId(client: unknown, playerId: string, characterId: string): Promise<string>;
  rollAssetPack(playerId: string, packId: string, options?: Record<string, unknown>): Promise<unknown>;
  selectAssetPackRollResults(candidates: unknown[], pack: unknown, options?: Record<string, unknown>): unknown[];
  shapeAssetPack(pack: unknown, options?: Record<string, unknown>): unknown;
  shapePortraitVariant(options: Record<string, unknown>): unknown;
  shapePortraitVariantsForCharacter(options: Record<string, unknown>): unknown[];
  validateAssetPack(pack: unknown, options?: Record<string, unknown>): unknown;
}

export interface MushroomWalletServicePort {
  auditWalletMirror(options?: Record<string, unknown>): Promise<unknown>;
  backfillMissingWalletBalancesFromPlayers(options?: Record<string, unknown>): Promise<unknown>;
  completeProviderWebhook(provider: string, payload?: unknown, options?: Record<string, unknown>): Promise<unknown>;
  completePurchaseIntent(options?: Record<string, unknown>): Promise<unknown>;
  completeTelegramSuccessfulPayment(successfulPayment: unknown): Promise<unknown>;
  createPurchaseIntent(playerId: string, options?: Record<string, unknown>): Promise<unknown>;
  expireStalePurchaseIntents(options?: Record<string, unknown>): Promise<unknown>;
  getPaymentSupportLinks(options?: Record<string, unknown>): unknown;
  getWalletBundles(provider?: string | null, options?: Record<string, unknown>): unknown[];
  getWalletPurchaseProviders(surface?: string): string[];
  getWalletState(playerId: string, options?: Record<string, unknown>): Promise<unknown>;
  grantCurrency(client: unknown, params: Record<string, unknown>): Promise<unknown>;
  grantCurrencyForPlayer(params: Record<string, unknown>): Promise<unknown>;
  normalizePaymentSurface(surface?: string): string;
  processProviderWebhookEvent(provider: string, payload?: unknown, options?: Record<string, unknown>): Promise<unknown>;
  reconcileWalletPayments(options?: Record<string, unknown>): Promise<unknown>;
  spendCurrency(client: unknown, params: Record<string, unknown>): Promise<unknown>;
  spendCurrencyForPlayer(params: Record<string, unknown>): Promise<unknown>;
  validateTelegramPreCheckout(preCheckoutQuery: unknown): Promise<unknown>;
  withWalletMutationLock<T>(playerId: string, work: () => Promise<T>): Promise<T>;
}

export declare const WALLET_CURRENCY_CODE: string;
export declare const WALLET_PAYMENT_SURFACES: Record<string, string[]>;
export declare const WALLET_PURCHASE_PROVIDERS: Set<string>;
export declare const WALLET_PURCHASE_STATUSES: Set<string>;

export declare function createMushroomAssetServicePort(options?: MushroomAssetServicePortOptions): MushroomAssetServicePort;
export declare function createMushroomGachaAdminServicePort(options?: MushroomGachaAdminServicePortOptions): MushroomGachaAdminServicePort;
export declare function createMushroomWalletServicePort(options?: MushroomWalletServicePortOptions): MushroomWalletServicePort;
