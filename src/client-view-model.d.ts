export interface LoadoutProjectionRow {
  id?: string | number;
  artifactId: string;
  x?: number | string | null;
  y?: number | string | null;
  width?: number | string | null;
  height?: number | string | null;
  active?: boolean | number;
  rotated?: boolean | number;
  freshPurchase?: boolean;
  [key: string]: unknown;
}

export interface ProjectedBuilderItem {
  id?: string | number;
  artifactId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProjectedContainerItem {
  id?: string | number;
  artifactId: string;
}

export interface ProjectedActiveBag {
  id?: string | number;
  artifactId: string;
  anchorX: number;
  anchorY: number;
}

export interface ProjectedRotatedBag {
  id?: string | number;
  artifactId: string;
  rotation: number;
}

export interface LoadoutProjection {
  builderItems: ProjectedBuilderItem[];
  containerItems: ProjectedContainerItem[];
  activeBags: ProjectedActiveBag[];
  rotatedBags: ProjectedRotatedBag[];
  freshPurchases: string[];
}

export interface GridBagRow {
  bagId?: string | number;
  row: number;
  color: string;
  artifactId: string;
  rotation: number;
  enabledCells: number[];
  bboxStart: number;
  bboxEnd: number;
}

export interface GridPropsProjection {
  items: ProjectedBuilderItem[];
  bagRows: GridBagRow[];
  totalRows: number;
}

export interface GridPropsOptions {
  columns?: number;
  minRows?: number;
}

export interface AssetPackSummaryLabels {
  invalid?: string;
  disabled?: string;
  unavailable?: string;
  future?: string;
  expired?: string;
  guaranteeTemplate?: string;
  pityTemplate?: string;
  pityReadyTemplate?: string;
  duplicateTemplate?: string;
}

export interface AssetPackPortraitProjection {
  assetId?: string | null;
  packId?: string | null;
  unlocked?: boolean;
  rollAvailable?: boolean;
  [key: string]: unknown;
}

export interface AssetPackSummaryInput {
  id?: string;
  name?: unknown;
  availability?: string;
  status?: string;
  active?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  rollPriceAmount?: number;
  totalItems?: number;
  ownedCount?: number;
  remainingCount?: number;
  rollableCount?: number;
  complete?: boolean;
  uniqueComplete?: boolean;
  copyComplete?: boolean;
  duplicateCopies?: number;
  rollSize?: number;
  nextRollItemCount?: number;
  duplicatePolicy?: { enabled?: boolean; [key: string]: unknown };
  raritySummary?: Array<{ rarity?: string | null; probability?: number; [key: string]: unknown }>;
  guarantees?: { rules?: Array<{ count?: number; minRarity?: string | null; [key: string]: unknown }> };
  pity?: { rules?: Array<{ threshold?: number; remaining?: number; active?: boolean; minRarity?: string | null; [key: string]: unknown }> };
  burn?: { rules?: Array<{ id?: string; ready?: boolean; sourceCount?: number; sourceRarity?: string | null; [key: string]: unknown }> };
  items?: Array<{ assetId?: string | null; rarity?: string | null; dropWeight?: number; [key: string]: unknown }>;
  [key: string]: unknown;
}

export interface AssetRollPackSummary {
  id?: string;
  name: unknown;
  total: number;
  owned: number;
  left: number;
  rollSize: number;
  nextRollItemCount: number;
  active: boolean;
  availabilityLabel: string;
  price: number;
  complete: boolean;
  duplicateEnabled: boolean;
  uniqueComplete: boolean;
  copyComplete: boolean;
  duplicateCopies: number;
  canRoll: boolean;
  canBurn: boolean;
  burnRuleId: string | null;
  burnCost: number;
  burnRarity: string;
  odds: string;
  guaranteeText: string;
  pityText: string;
  duplicateText: string;
}

export interface WalletBundleInput {
  id?: string;
  provider?: string;
  priceAmount?: number;
  priceCurrency?: string;
  [key: string]: unknown;
}

export interface WalletSupportConfig {
  supportUrl?: string;
  termsUrl?: string;
  [key: string]: unknown;
}

export interface WalletSupportLabels {
  support?: string;
  terms?: string;
}

export interface WalletPurchaseSurfaceLabels extends WalletSupportLabels {
  status?: Record<string, string>;
}

export interface WalletPurchaseSurfaceSummary {
  balance: unknown;
  bundles: WalletBundleInput[];
  statusText: string;
  supportEntries: Array<{ label: string; url: string }>;
}

export interface AssetRollResultItemInput {
  assetName?: unknown;
  assetId?: string | null;
  rarity?: string | null;
  [key: string]: unknown;
}

export interface AssetRollResultInput {
  assetName?: unknown;
  assetId?: string | null;
  rarity?: string | null;
  count?: number;
  items?: readonly AssetRollResultItemInput[];
  [key: string]: unknown;
}

export interface AssetRollFeedbackLabels {
  openingTitle?: string;
  openingText?: string;
  burnOpeningTitle?: string;
  burnOpeningText?: string;
  multiResultTitleTemplate?: string;
  resultTitle?: string;
  resultTemplate?: string;
  burnResultTitle?: string;
  burnResultTemplate?: string;
  problemTitle?: string;
  errors?: Record<string, string>;
}

export interface AssetRollFeedbackSummary {
  status: string;
  title: string;
  text: string;
}

export function projectLoadoutItems(
  loadoutItems?: readonly LoadoutProjectionRow[],
  bagArtifactIds?: Iterable<string>,
  getArtifact?: ((artifactId: string) => unknown) | Map<string, unknown> | null
): LoadoutProjection;

export function prepareGridProps(
  loadoutItems?: readonly LoadoutProjectionRow[],
  bagArtifactIds?: Iterable<string>,
  getArtifact?: ((artifactId: string) => unknown) | Map<string, unknown> | null,
  options?: GridPropsOptions
): GridPropsProjection;

export function formatAssetPackRarityOdds(
  pack: AssetPackSummaryInput | null | undefined,
  options?: { rarityLabel?: (rarity: unknown) => string }
): string;

export function formatAssetPackGuaranteeText(
  pack: AssetPackSummaryInput | null | undefined,
  options?: { rarityLabel?: (rarity: unknown) => string; template?: string }
): string;

export function formatAssetPackPityText(
  pack: AssetPackSummaryInput | null | undefined,
  options?: { rarityLabel?: (rarity: unknown) => string; template?: string; readyTemplate?: string }
): string;

export function formatAssetPackDuplicateText(
  pack: AssetPackSummaryInput | null | undefined,
  options?: { template?: string }
): string;

export function assetPackIsActive(
  pack: AssetPackSummaryInput | null | undefined,
  options?: { now?: number | string | Date }
): boolean;

export function assetPackAvailabilityLabel(
  pack: AssetPackSummaryInput | null | undefined,
  options?: { now?: number | string | Date; labels?: AssetPackSummaryLabels }
): string;

export function summarizeAssetRollPacks(input?: {
  portraits?: readonly AssetPackPortraitProjection[];
  packs?: readonly AssetPackSummaryInput[];
  ownedAssetIds?: Iterable<string>;
  now?: number | string | Date;
  packName?: (pack: AssetPackSummaryInput) => unknown;
  rarityLabel?: (rarity: unknown) => string;
  labels?: AssetPackSummaryLabels;
}): AssetRollPackSummary[];

export function resolveWalletBalance(input?: {
  wallet?: { balances?: Record<string, unknown> } | null;
  player?: Record<string, unknown> | null;
  currencyCode?: string;
  legacyField?: string;
  fallback?: unknown;
}): unknown;

export function selectWalletBundles(input?: {
  bundles?: readonly WalletBundleInput[];
  bundleSurface?: string | null;
  surface?: string | null;
}): WalletBundleInput[];

export function formatWalletBundlePrice(
  bundle: WalletBundleInput | null | undefined,
  options?: {
    minorUnitCurrencyDecimals?: Record<string, number>;
    currencySymbols?: Record<string, string>;
  }
): string;

export function walletPurchaseStatusText(
  status: string | null | undefined,
  options?: { labels?: Record<string, string> }
): string;

export function walletSupportEntries(input?: {
  support?: WalletSupportConfig;
  labels?: WalletSupportLabels;
}): Array<{ label: string; url: string }>;

export function summarizeWalletPurchaseSurface(input?: {
  wallet?: { balances?: Record<string, unknown> } | null;
  player?: Record<string, unknown> | null;
  currencyCode?: string;
  legacyField?: string;
  fallbackBalance?: unknown;
  bundles?: readonly WalletBundleInput[];
  bundleSurface?: string | null;
  surface?: string | null;
  status?: string;
  support?: WalletSupportConfig;
  labels?: WalletPurchaseSurfaceLabels;
}): WalletPurchaseSurfaceSummary;

export function formatAssetRollResultName(
  result: AssetRollResultInput | null | undefined,
  options?: { localizeName?: (value: unknown) => string }
): string;

export function formatAssetRollResultItemsText(
  result: AssetRollResultInput | null | undefined,
  options?: {
    localizeName?: (value: unknown) => string;
    rarityLabel?: (rarity: unknown) => string;
    itemSeparator?: string;
    resultSeparator?: string;
    limit?: number;
  }
): string;

export function summarizeAssetRollFeedback(input?: {
  status?: string;
  result?: AssetRollResultInput | null;
  errorMessage?: string;
  labels?: AssetRollFeedbackLabels;
  localizeName?: (value: unknown) => string;
  rarityLabel?: (rarity: unknown) => string;
}): AssetRollFeedbackSummary | null;
