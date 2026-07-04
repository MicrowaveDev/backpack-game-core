import type {
  AssetGachaCatalogAsset,
  AssetGachaPack,
  AssetGachaValidationResult
} from '../../asset-gacha.js';

export const DEFAULT_GACHA_ADMIN_FIXTURE_SCHEMA_VERSION: 'gacha-admin-fixture/v1';
export const DEFAULT_GACHA_ADMIN_CURRENCY_CODE: 'soft_coin';
export const DEFAULT_GACHA_ADMIN_PLAN_TARGET_PER_CHARACTER: 5;

export interface GachaAdminChecklistIssue {
  code: string;
  message: string;
  severity: 'blocker' | 'warning' | 'pass' | string;
  [key: string]: unknown;
}

export interface GachaAdminReleaseChecklist {
  ok: boolean;
  blockers: GachaAdminChecklistIssue[];
  warnings: GachaAdminChecklistIssue[];
  passed: GachaAdminChecklistIssue[];
}

export interface GachaAdminFixture {
  schemaVersion?: string;
  seasons?: unknown[];
  collections?: unknown[];
  planItems?: unknown[];
  packs?: Array<Record<string, unknown> & { items?: unknown[] }>;
  items?: unknown[];
}

export interface NormalizedGachaAdminFixture {
  schemaVersion: string;
  seasons: unknown[];
  collections: unknown[];
  planItems: unknown[];
  packs: Array<Record<string, unknown> & { items: unknown[] }>;
}

export interface GachaAdminPlanItemAssetContractResult<TFields extends Record<string, unknown> = Record<string, unknown>> {
  fields: TFields;
  assetIdToReserve: string | null;
  generatedBefore: string;
  generatedAfter: string | null;
  characterChanging: boolean;
  canSyncGeneratedId: boolean;
}

export interface GachaAdminPlanSummaryCharacter {
  characterId: string;
  label: string;
  count: number;
  readyCount: number;
  target: number;
  missing: number;
  enough: boolean;
  totalWeight: number;
}

export interface GachaAdminPlanSummarySeason {
  seasonId: string;
  total: number;
  totalWeight: number;
  characters: GachaAdminPlanSummaryCharacter[];
}

export interface GachaAdminPlanSummary {
  targetPerCharacter: number;
  seasons: GachaAdminPlanSummarySeason[];
}

export interface GachaAdminPlanCatalogAsset extends AssetGachaCatalogAsset {
  assetId: string;
  slot: 'portrait';
  targetType: 'character';
  targetId: string;
  variantId: string;
  path: string;
  price: null;
  currencyCode: string;
  acquisitionMode: 'gacha';
  packId: string | null;
  packIds: string[];
  maxCopiesPerPlayer: 1;
  source: 'gacha_plan';
  planItemId: string;
  status: string;
}

export interface GachaAdminPackItemSnapshot {
  assetId?: string;
  rarity?: unknown;
  dropWeight?: unknown;
  copyLimit?: unknown;
  metadata?: unknown;
}

export interface GachaAdminPackSnapshot {
  id?: string;
  seasonId?: string;
  collectionId?: string;
  name?: unknown;
  status?: string;
  startsAt?: string | null;
  endsAt?: string | null;
  rollPriceCurrencyCode?: string;
  rollPriceAmount?: unknown;
  rollSize?: unknown;
  rarityWeights?: unknown;
  slots?: unknown;
  guarantees?: unknown;
  pityRules?: unknown;
  duplicatePolicy?: unknown;
  burnRules?: unknown;
  metadata?: unknown;
  items: GachaAdminPackItemSnapshot[];
}

export interface GachaAdminDraftFieldChange {
  field: string;
  before: unknown;
  after: unknown;
}

export interface GachaAdminDraftItemChange {
  assetId?: string;
  changes: GachaAdminDraftFieldChange[];
}

export interface GachaAdminPackDraftDiff {
  basePackId: string;
  missingBase: boolean;
  changedFields: GachaAdminDraftFieldChange[];
  addedItems: string[];
  removedItems: string[];
  changedItems: GachaAdminDraftItemChange[];
}

export function createGachaAdminReleaseChecklist(options?: {
  runtimePack?: AssetGachaPack;
  validation?: AssetGachaValidationResult;
  seasonRow?: { status?: string } | null;
  collectionRow?: { status?: string } | null;
  catalog?: readonly AssetGachaCatalogAsset[];
  currencyCode?: string;
}): GachaAdminReleaseChecklist;

export function gachaAdminAssetPolicyRecommendationsFromChecklist(releaseChecklist: GachaAdminReleaseChecklist): unknown[];

export function gachaAdminPackSnapshot(pack?: AssetGachaPack | Record<string, unknown>): GachaAdminPackSnapshot;

export function buildGachaAdminPackDraftDiff(options?: {
  basePack?: AssetGachaPack | Record<string, unknown> | null;
  draftPack?: AssetGachaPack | Record<string, unknown> | null;
  basePackId?: string | null;
}): GachaAdminPackDraftDiff | null;

export function normalizeGachaAdminFixture(input?: GachaAdminFixture | { fixture?: GachaAdminFixture }, options?: {
  schemaVersion?: string;
}): NormalizedGachaAdminFixture;

export function gachaAdminPlanAssetId(characterId: string, itemId: string): string;

export function resolveGachaAdminPlanItemAssetContract<TFields extends Record<string, unknown> = Record<string, unknown>>(options: {
  beforeRow: Record<string, unknown>;
  fields?: TFields;
  payload?: Record<string, unknown>;
  hasPackLink?: boolean;
  createPlanAssetId?: (characterId: string, itemId: string) => string;
}): GachaAdminPlanItemAssetContractResult<TFields>;

export function summarizeGachaAdminPlanItems(planItems?: readonly Record<string, unknown>[], options?: {
  characterOptions?: readonly { id: string; label: string }[];
  targetPerCharacter?: number;
}): GachaAdminPlanSummary;

export function gachaAdminPlanCatalogAssetFromRow(row: Record<string, unknown>, options?: {
  catalog?: readonly AssetGachaCatalogAsset[];
  currencyCode?: string;
}): GachaAdminPlanCatalogAsset | null;

export function catalogWithGachaAdminPlanRows(
  catalog?: readonly AssetGachaCatalogAsset[],
  planRows?: readonly Record<string, unknown>[],
  options?: { currencyCode?: string }
): Array<AssetGachaCatalogAsset | GachaAdminPlanCatalogAsset>;

export function normalizeGachaAdminPlanItemIds(value: unknown): string[];

export function gachaAdminPromotionPackItemMetadata(
  planRow: Record<string, unknown>,
  packRow: Record<string, unknown>,
  existingMetadata?: Record<string, unknown>
): Record<string, unknown>;

export function gachaAdminPromotedPlanMetadata(
  planRow: Record<string, unknown>,
  packItem: Record<string, unknown>,
  packRow: Record<string, unknown>,
  options?: { now?: string }
): Record<string, unknown>;
