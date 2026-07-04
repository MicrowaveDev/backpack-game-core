import type { Rng } from './rng.js';

export type AssetGachaRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'secret' | string;
export type AssetGachaPackStatus = 'active' | 'future' | 'expired' | 'disabled' | string;
export type AssetGachaDuplicateMode = 'unowned_only' | 'allow_duplicates' | string;
export type AssetGachaBurnTargetPolicy = 'allow_duplicates' | 'unowned_first' | 'unowned_only' | string;

export interface AssetGachaOptions {
  validRarities?: readonly string[];
  validPackStatuses?: readonly string[];
  supportedPityResetScopes?: readonly string[];
  supportedDuplicatePolicyModes?: readonly string[];
  supportedBurnTargetDuplicatePolicies?: readonly string[];
  minRollSize?: number;
  maxRollSize?: number;
  maxBurnTargetCount?: number;
  currencyCode?: string;
}

export interface AssetGachaCatalogAsset {
  assetId: string;
  price?: number | null;
  rarity?: AssetGachaRarity | null;
  acquisitionMode?: 'direct' | 'gacha' | 'both' | string;
  packId?: string | null;
  active?: boolean;
  [key: string]: unknown;
}

export interface AssetGachaPackItem {
  assetId: string;
  rarity?: AssetGachaRarity | null;
  dropWeight?: number;
  maxCopiesPerPlayer?: number | null;
  maxCopies?: number | null;
  copyLimit?: number | null;
  [key: string]: unknown;
}

export interface AssetGachaPack {
  id?: string;
  seasonId?: string;
  collectionId?: string;
  name?: unknown;
  status?: AssetGachaPackStatus;
  startsAt?: string | null;
  endsAt?: string | null;
  rollPriceCurrencyCode?: string;
  rollPriceAmount?: number;
  rollSize?: number;
  rarityTableVersion?: string;
  rarityWeights?: Record<string, number>;
  slots?: Array<{ rarityWeights?: Record<string, number> }>;
  guarantees?: unknown[];
  guaranteeRules?: unknown[];
  pityRules?: unknown[];
  duplicatePolicy?: unknown;
  burnRules?: unknown[];
  duplicateBurnRules?: unknown[];
  maxCopiesPerAsset?: number | null;
  items?: AssetGachaPackItem[];
  active?: boolean;
  [key: string]: unknown;
}

export interface AssetGachaValidationIssue {
  code: string;
  message: string;
  itemIndex: number | null;
}

export interface AssetGachaValidationResult {
  ok: boolean;
  errors: AssetGachaValidationIssue[];
  warnings: AssetGachaValidationIssue[];
}

export interface AssetGachaDuplicatePolicy {
  mode: AssetGachaDuplicateMode;
  enabled: boolean;
  preserveFirstCopy: boolean;
  maxCopiesPerAsset: number | null;
}

export interface AssetGachaBurnRule {
  id: string;
  type: 'duplicate_burn_exchange';
  sourceRarity: AssetGachaRarity;
  sourceCount: number;
  targetMinRarity: AssetGachaRarity;
  targetCount: number;
  sourceScope: 'duplicate_copies';
  targetScope: 'pack';
  targetDuplicatePolicy: AssetGachaBurnTargetPolicy;
  label: unknown | null;
  index: number;
}

export interface AssetGachaGuaranteeRule {
  id: string;
  type: string;
  source: 'guarantee' | 'pity' | string;
  minRarity: AssetGachaRarity;
  count: number;
  label: unknown | null;
}

export interface AssetGachaPityRule extends AssetGachaGuaranteeRule {
  threshold: number;
  resetScope: string;
  currentMisses?: number;
  remaining?: number;
  active?: boolean;
}

export interface AssetGachaInstanceRow {
  id: string;
  asset_id?: string;
  assetId?: string;
  player_id?: string;
  status?: string;
  acquired_at?: string;
  acquiredAt?: string;
  metadata_json?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AssetGachaCandidate extends AssetGachaPackItem {
  ownedCopies: number;
  copyLimit: number | null;
  copyCapped: boolean;
  asset: AssetGachaCatalogAsset | null;
}

export interface AssetGachaSelectedItem extends AssetGachaPackItem {
  slotIndex: number;
  selectedRarity: AssetGachaRarity | null;
  assetId: string;
  rarity: AssetGachaRarity | null;
  asset: AssetGachaCatalogAsset | null;
  slotRarityWeights?: Record<string, number>;
  candidatePoolHash: string;
  guaranteeId?: string | null;
  guaranteeSource?: string | null;
  guaranteeMinRarity?: AssetGachaRarity | null;
  guaranteeReplacedAssetId?: string | null;
}

export interface AssetGachaPolicyResult {
  acquisitionMode: string | undefined;
  purchaseAvailable: boolean;
  rollAvailable: boolean;
  gachaEnabled: boolean;
  directBuyPolicy: string;
  activePackId: string | null;
}

export interface AssetCatalogAcquisitionPolicy {
  acquisitionMode: string;
  packId: string | null;
}

export const DEFAULT_ASSET_GACHA_OPTIONS: Readonly<Required<AssetGachaOptions>>;

export function assetGachaValidationIssue(code: string, message: string, itemIndex?: number | null): AssetGachaValidationIssue;
export function assetGachaPackRollSize(pack: AssetGachaPack | null | undefined): number;
export function assetGachaRarityRank(rarity: unknown, options?: AssetGachaOptions): number;
export function assetGachaRarityAtLeast(rarity: unknown, minRarity: unknown, options?: AssetGachaOptions): boolean;
export function assetGachaRarityWeightEntries(rarityWeights: unknown): Array<[string, number]>;
export function defaultAssetGachaRarityWeightsForItems(items?: readonly AssetGachaPackItem[]): Record<string, number>;
export function normalizeAssetGachaGuaranteeRules(pack: AssetGachaPack): AssetGachaGuaranteeRule[];
export function normalizeAssetGachaPityRules(pack: AssetGachaPack): AssetGachaPityRule[];
export function normalizeAssetGachaDuplicatePolicy(pack: AssetGachaPack, options?: AssetGachaOptions): AssetGachaDuplicatePolicy;
export function assetGachaCopyLimitForPackItem(pack: AssetGachaPack, item: AssetGachaPackItem, duplicatePolicy?: AssetGachaDuplicatePolicy): number | null;
export function assetGachaCopyLimitReached(copyCount: number, copyLimit: number | null): boolean;
export function normalizeAssetGachaBurnRules(pack: AssetGachaPack): AssetGachaBurnRule[];
export function normalizeAssetGachaPackSlots(pack: AssetGachaPack, options?: AssetGachaOptions): Array<{ slotIndex: number; rarityWeights: Record<string, number> }>;
export function validateAssetGachaPack(pack: AssetGachaPack, options?: AssetGachaOptions & { catalog?: readonly AssetGachaCatalogAsset[] }): AssetGachaValidationResult;
export function getAssetGachaPackAvailability(pack: AssetGachaPack, options?: AssetGachaOptions & {
  now?: Date;
  catalog?: readonly AssetGachaCatalogAsset[];
  activePackIds?: readonly string[] | null;
  gachaEnabled?: boolean;
}): string;
export function resolveAssetCatalogAcquisitionPolicy(asset: AssetGachaCatalogAsset | null | undefined, options?: {
  overrides?: Record<string, { acquisitionMode?: string; packId?: string | null; [key: string]: unknown }>;
  defaultPaidMode?: string | null;
  defaultPackId?: string | null;
  validAcquisitionModes?: readonly string[];
}): AssetCatalogAcquisitionPolicy | null;
export function activeAssetGachaCopyCounts(activeAssetRows?: readonly AssetGachaInstanceRow[]): Map<string, number>;
export function assetGachaBurnableDuplicateRows(
  pack: AssetGachaPack,
  activeAssetRows: readonly AssetGachaInstanceRow[],
  rule: AssetGachaBurnRule,
  equippedInstanceIds?: Set<string>
): AssetGachaInstanceRow[];
export function shapeAssetGachaPack(pack: AssetGachaPack, options?: AssetGachaOptions & {
  ownedAssetIds?: Iterable<string>;
  includeAssets?: boolean;
  now?: Date;
  rollHistory?: readonly unknown[];
  activeAssetRows?: readonly AssetGachaInstanceRow[];
  equippedAssetInstanceIds?: Iterable<string>;
  catalog?: readonly AssetGachaCatalogAsset[];
  activePackIds?: readonly string[] | null;
  gachaEnabled?: boolean;
}): AssetGachaPack & Record<string, unknown>;
export function computeAssetGachaPackPityState(pack: AssetGachaPack, options?: AssetGachaOptions & {
  rolls?: readonly unknown[];
  catalog?: readonly AssetGachaCatalogAsset[];
}): AssetGachaPityRule[];
export function advanceAssetGachaPackPityState(
  pityBefore: readonly AssetGachaPityRule[],
  selectedItems: readonly AssetGachaSelectedItem[],
  options?: AssetGachaOptions
): AssetGachaPityRule[];
export function chooseWeightedAssetGachaCandidate<T extends { dropWeight?: number }>(candidates: readonly T[], rng: Rng): T;
export function selectAssetGachaRollResults(
  candidates: readonly AssetGachaCandidate[],
  pack: AssetGachaPack,
  options: AssetGachaOptions & { rng: Rng; pityState?: readonly AssetGachaPityRule[] }
): AssetGachaSelectedItem[] & { guaranteeApplications?: unknown[] };
export function resolveAssetGachaRollCandidates(pack: AssetGachaPack, options?: AssetGachaOptions & {
  ownedAssetIds?: Iterable<string>;
  activeAssetRows?: readonly AssetGachaInstanceRow[];
  copyCounts?: Map<string, number> | Record<string, number> | null;
  includeOwned?: boolean;
  catalog?: readonly AssetGachaCatalogAsset[];
}): AssetGachaCandidate[];
export function hashAssetGachaCandidatePool(candidates: readonly AssetGachaCandidate[]): string;
export function selectAssetGachaBurnTargets(pack: AssetGachaPack, rule: AssetGachaBurnRule, options: AssetGachaOptions & {
  rng: Rng;
  ownedAssetIds?: Iterable<string>;
  activeAssetRows?: readonly AssetGachaInstanceRow[];
  copyCounts?: Map<string, number> | Record<string, number> | null;
  catalog?: readonly AssetGachaCatalogAsset[];
}): AssetGachaSelectedItem[];
export function evaluateAssetAcquisitionPolicy(asset: AssetGachaCatalogAsset | null | undefined, options?: {
  gachaEnabled?: boolean;
  directBuyPolicy?: string;
  pack?: AssetGachaPack | null;
  packAvailability?: string | null;
}): AssetGachaPolicyResult | null;
