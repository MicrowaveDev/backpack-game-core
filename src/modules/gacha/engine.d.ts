import type { Rng } from '../../shared/rng.js';

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

export interface AssetGachaRollRow {
  id?: string;
  playerId?: string;
  player_id?: string;
  packId?: string;
  pack_id?: string;
  currencyCode?: string;
  currency_code?: string;
  priceAmount?: number;
  price_amount?: number;
  resultAssetIds?: string[];
  result_asset_ids_json?: string | string[];
  guaranteeState?: Record<string, unknown>;
  guarantee_state_json?: string | Record<string, unknown>;
  candidatePoolHash?: string | null;
  candidate_pool_hash?: string | null;
  selectedAssetId?: string | null;
  selected_asset_id?: string | null;
  resultInstanceId?: string | null;
  result_instance_id?: string | null;
  idempotencyKey?: string | null;
  idempotency_key?: string | null;
  metadata?: Record<string, unknown>;
  metadata_json?: string | Record<string, unknown>;
  createdAt?: string;
  created_at?: string;
}

export interface NormalizedAssetGachaRoll {
  id?: string;
  playerId?: string;
  packId?: string;
  currencyCode?: string;
  priceAmount: number;
  resultAssetIds: string[];
  guaranteeState: Record<string, unknown>;
  candidatePoolHash: string | null;
  selectedAssetId: string | null;
  resultInstanceId: string | null;
  idempotencyKey: string | null;
  metadata: Record<string, unknown>;
  createdAt?: string;
}

export interface AssetGachaBurnExchangeRow {
  id?: string;
  playerId?: string;
  player_id?: string;
  packId?: string;
  pack_id?: string;
  ruleId?: string;
  rule_id?: string;
  sourceAssetInstanceIds?: string[];
  source_asset_instance_ids_json?: string | string[];
  resultAssetIds?: string[];
  result_asset_ids_json?: string | string[];
  resultInstanceIds?: string[];
  result_instance_ids_json?: string | string[];
  idempotencyKey?: string | null;
  idempotency_key?: string | null;
  metadata?: Record<string, unknown>;
  metadata_json?: string | Record<string, unknown>;
  createdAt?: string;
  created_at?: string;
}

export interface NormalizedAssetGachaBurnExchange {
  id?: string;
  playerId?: string;
  packId?: string;
  ruleId?: string;
  sourceAssetInstanceIds: string[];
  resultAssetIds: string[];
  resultInstanceIds: string[];
  idempotencyKey: string | null;
  metadata: Record<string, unknown>;
  createdAt?: string;
}

export interface AssetGachaResultItem {
  slotIndex: number;
  assetId: string;
  assetName: unknown | null;
  assetPath: string | null;
  rarity: AssetGachaRarity | null;
  selectedRarity: AssetGachaRarity | null;
  duplicateCopy: boolean;
  resultInstanceId: string | null;
}

export interface AssetGachaRollResult {
  rollId?: string;
  packId?: string;
  packName: unknown;
  assetId: string | null;
  assetName: unknown | null;
  assetPath: string | null;
  rarity: AssetGachaRarity | null;
  resultInstanceId: string | null;
  count: number;
  guaranteesApplied: unknown[];
  pityBefore: unknown[];
  pityAfter: unknown[];
  items: AssetGachaResultItem[];
}

export interface AssetGachaBurnResult {
  exchangeId?: string;
  packId?: string;
  packName: unknown;
  ruleId?: string;
  assetId: string | null;
  assetName: unknown | null;
  assetPath: string | null;
  rarity: AssetGachaRarity | null;
  resultInstanceId: string | null;
  sourceAssetInstanceIds: string[];
  count: number;
  items: AssetGachaResultItem[];
}

export interface AssetGachaRollSettlementItem extends AssetGachaSelectedItem {
  duplicateCopy: boolean;
  guaranteeId?: string | null;
  guaranteeSource?: string | null;
  guaranteeMinRarity?: AssetGachaRarity | null;
  guaranteeReplacedAssetId?: string | null;
}

export interface AssetGachaRollSettlementPlan {
  type: 'asset_gacha_roll_settlement';
  packId: string | null;
  currencyCode?: string;
  priceAmount: number;
  rollSize: number;
  effectiveRollSize: number;
  rarityTableVersion: string;
  duplicatePolicy: AssetGachaDuplicatePolicy;
  candidatePoolHash: string;
  resultAssetIds: string[];
  duplicateAssetIds: string[];
  guaranteesApplied: unknown[];
  pityBefore: unknown[];
  pityAfter: unknown[];
  selectedItems: AssetGachaRollSettlementItem[];
  walletSpend: {
    currencyCode?: string;
    amount: number;
    reason: 'asset_pack_roll';
    sourceType: 'asset_pack';
    sourceId: string | null;
    metadata: Record<string, unknown>;
  };
  guaranteeState: Record<string, unknown>;
  rollMetadata: Record<string, unknown>;
}

export interface AssetGachaGrantDraft {
  assetId: string;
  acquisitionSource: string;
  acquisitionSourceId: string | null;
  allowDuplicate: boolean;
  metadata: Record<string, unknown>;
}

export interface AssetGachaBurnSourceRow {
  id: string;
  assetId: string;
  acquiredAt: string | null;
  metadata: Record<string, unknown>;
}

export interface AssetGachaBurnSettlementPlan {
  type: 'asset_gacha_burn_settlement';
  packId: string | null;
  ruleId: string | null;
  rule: AssetGachaBurnRule | null;
  sourceRows: AssetGachaBurnSourceRow[];
  sourceAssetInstanceIds: string[];
  sourceAssetIds: string[];
  targetItems: AssetGachaRollSettlementItem[];
  resultAssetIds: string[];
  duplicateAssetIds: string[];
  exchangeMetadata: Record<string, unknown>;
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
export function selectAssetGachaBurnSourceRows(
  pack: AssetGachaPack,
  activeAssetRows: readonly AssetGachaInstanceRow[],
  rule: AssetGachaBurnRule,
  options?: { equippedInstanceIds?: Iterable<string> | Set<string> }
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
export function normalizeAssetGachaRollRow(row?: AssetGachaRollRow | NormalizedAssetGachaRoll): NormalizedAssetGachaRoll;
export function normalizeAssetGachaBurnExchangeRow(row?: AssetGachaBurnExchangeRow | NormalizedAssetGachaBurnExchange): NormalizedAssetGachaBurnExchange;
export function shapeAssetGachaRollResult(roll: AssetGachaRollRow | NormalizedAssetGachaRoll, options?: {
  asset?: AssetGachaCatalogAsset | null;
  pack?: AssetGachaPack | null;
  instance?: { id?: string | null; [key: string]: unknown } | null;
  rarity?: AssetGachaRarity | null;
  items?: readonly AssetGachaResultItem[] | null;
  catalog?: readonly AssetGachaCatalogAsset[] | Map<string, AssetGachaCatalogAsset>;
  localizeName?: (name: unknown) => unknown;
}): AssetGachaRollResult;
export function shapeAssetGachaBurnResult(exchange: AssetGachaBurnExchangeRow | NormalizedAssetGachaBurnExchange, options?: {
  pack?: AssetGachaPack | null;
  items?: readonly AssetGachaResultItem[] | null;
  catalog?: readonly AssetGachaCatalogAsset[] | Map<string, AssetGachaCatalogAsset>;
  localizeName?: (name: unknown) => unknown;
}): AssetGachaBurnResult;
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
export function createAssetGachaRollSettlementPlan(input?: {
  pack?: AssetGachaPack;
  candidates?: readonly AssetGachaCandidate[];
  selectedItems?: readonly AssetGachaSelectedItem[] & { guaranteeApplications?: unknown[] };
  ownedAssetIds?: Iterable<string>;
  duplicatePolicy?: AssetGachaDuplicatePolicy;
  pityBefore?: unknown[];
  pityAfter?: unknown[] | null;
  candidatePoolHash?: string | null;
  rarityTableVersion?: string | null;
  gachaEnabled?: boolean | null;
  directBuyPolicy?: string | null;
  activePackIds?: readonly string[] | null;
  randomSource?: string | null;
}): AssetGachaRollSettlementPlan;
export function createAssetGachaRollGrantDrafts(
  plan: AssetGachaRollSettlementPlan,
  options?: { rollId?: string | null; transactionId?: string | null }
): AssetGachaGrantDraft[];
export function shapeAssetGachaRollSettlementItems(
  plan: AssetGachaRollSettlementPlan,
  options?: { grantedItems?: readonly ({ id?: string | null; instance?: { id?: string | null } } & Record<string, unknown>)[] }
): { resultItems: AssetGachaResultItem[]; evidenceItems: Record<string, unknown>[]; resultInstanceIds: Array<string | null> };
export function selectAssetGachaBurnTargets(pack: AssetGachaPack, rule: AssetGachaBurnRule, options: AssetGachaOptions & {
  rng: Rng;
  ownedAssetIds?: Iterable<string>;
  activeAssetRows?: readonly AssetGachaInstanceRow[];
  copyCounts?: Map<string, number> | Record<string, number> | null;
  catalog?: readonly AssetGachaCatalogAsset[];
}): AssetGachaSelectedItem[];
export function createAssetGachaBurnSettlementPlan(input?: {
  pack?: AssetGachaPack;
  rule?: AssetGachaBurnRule;
  sourceRows?: readonly AssetGachaInstanceRow[];
  targetItems?: readonly AssetGachaSelectedItem[];
  ownedAssetIdsAfterBurn?: Iterable<string>;
  randomSource?: string | null;
}): AssetGachaBurnSettlementPlan;
export function createAssetGachaBurnSourceMetadata(
  row: AssetGachaInstanceRow,
  plan: AssetGachaBurnSettlementPlan,
  options?: { exchangeId?: string | null; now?: string | null }
): Record<string, unknown>;
export function createAssetGachaBurnGrantDrafts(
  plan: AssetGachaBurnSettlementPlan,
  options?: { exchangeId?: string | null }
): AssetGachaGrantDraft[];
export function shapeAssetGachaBurnSettlementItems(
  plan: AssetGachaBurnSettlementPlan,
  options?: { grantedItems?: readonly ({ id?: string | null; instance?: { id?: string | null } } & Record<string, unknown>)[] }
): { resultItems: AssetGachaResultItem[]; resultInstanceIds: Array<string | null> };
export function evaluateAssetAcquisitionPolicy(asset: AssetGachaCatalogAsset | null | undefined, options?: {
  gachaEnabled?: boolean;
  directBuyPolicy?: string;
  pack?: AssetGachaPack | null;
  packAvailability?: string | null;
}): AssetGachaPolicyResult | null;
