export const DEFAULT_PROFILE_ASSET_STATUS: 'active';

export interface ProfileAssetStateIssue {
  code: string;
  message: string;
}

export interface ProfileAssetInstance {
  id: string | null;
  playerId: string | null;
  assetId: string | null;
  acquisitionSource: string | null;
  acquisitionSourceId: string | null;
  status: string;
  acquiredAt: string | null;
  metadata: Record<string, unknown>;
}

export interface ProfileAssetEquipment {
  id: string | null;
  playerId: string | null;
  slot: string | null;
  targetType: string | null;
  targetId: string;
  assetInstanceId: string | null;
  assetId: string | null;
  equippedAt: string | null;
}

export interface ProfileAssetState {
  ownedAssetIds: Set<string>;
  instancesByAssetId: Map<string, ProfileAssetInstance>;
  activeInstancesByAssetId: Map<string, ProfileAssetInstance[]>;
  equippedByTarget: Map<string, {
    id: string | null;
    assetId: string | null;
    assetInstanceId: string | null;
    equippedAt: string | null;
  }>;
}

export interface ProfileAssetEquipmentValidation {
  ok: boolean;
  issue: ProfileAssetStateIssue | null;
  targetKey: string | null;
  instance: ProfileAssetInstance | Record<string, unknown> | null;
  assetInstanceId?: string | null;
}

export interface ProfileAssetPurchaseSpendMutation {
  playerId: string | null;
  currencyCode: string | null;
  amount: number;
  reason: 'asset_purchase';
  sourceType: 'asset';
  sourceId: string | null;
  idempotencyKey: string;
  metadata: {
    slot: string | null;
    targetType: string | null;
    targetId: string | null;
  };
}

export type ProfileAssetCatalog = Array<Record<string, unknown>> | Map<string, Record<string, unknown>>;

export type ProfileAssetRecord = Record<string, unknown> & {
  assetId: string | null;
  slot: string | null;
  targetType: string | null;
  targetId: string | null;
  variantId: string | null;
  price: unknown | null;
  currencyCode: string | null;
  acquisitionMode: string | null;
  packId: string | null;
  rarity: string | null;
  path: unknown | null;
  name: unknown | null;
};

export interface ProfileAssetInstanceSummary extends ProfileAssetInstance {
  asset: ProfileAssetRecord | null;
  slot: string | null;
  targetType: string | null;
  targetId: string | null;
  variantId: string | null;
  rarity: string | null;
  packId: string | null;
  path: unknown | null;
  name: unknown | null;
}

export interface ProfileAssetEquipmentSummary extends ProfileAssetEquipment {
  targetKey: string;
  asset: ProfileAssetRecord | null;
  variantId: string | null;
  rarity: string | null;
  packId: string | null;
  path: unknown | null;
  name: unknown | null;
}

export interface ProfileAssetPurchaseResult {
  assetId: string | null;
  asset: ProfileAssetRecord | null;
  instance: ProfileAssetInstanceSummary | null;
  transaction: unknown | null;
  alreadyOwned: boolean;
  owned: boolean;
  status: 'purchased' | 'already_owned';
}

export interface ProfileAssetEquipResult {
  assetId: string | null;
  slot: string | null;
  targetType: string | null;
  targetId: string | null;
  variantId: string | null;
  path: unknown | null;
  rarity: string | null;
  packId: string | null;
  targetKey: string;
  asset: ProfileAssetRecord | null;
  equipment: ProfileAssetEquipmentSummary | null;
  instance: ProfileAssetInstanceSummary | null;
}

export function profileAssetStateIssue(code: string, message: string): ProfileAssetStateIssue;
export function profileAssetTargetKey(input?: {
  slot?: string | null;
  targetType?: string | null;
  targetId?: string | null;
}): string;
export function normalizeProfileAssetInstanceRow(row?: Record<string, unknown> | null): ProfileAssetInstance | null;
export function normalizeProfileAssetEquipmentRow(row?: Record<string, unknown> | null): ProfileAssetEquipment | null;
export function createProfileAssetState(input?: {
  instances?: Array<Record<string, unknown>>;
  equipped?: Array<Record<string, unknown>>;
}): ProfileAssetState;
export function profileAssetIsFree(asset?: Record<string, unknown> | null): boolean;
export function profileAssetIsOwned(asset?: Record<string, unknown> | null, state?: ProfileAssetState): boolean;
export function validateProfileAssetEquipment(input?: {
  asset?: Record<string, unknown> | null;
  instance?: ProfileAssetInstance | Record<string, unknown> | null;
}): ProfileAssetEquipmentValidation;
export function createProfileAssetInstanceDraft(input?: {
  id?: string | null;
  playerId?: string | null;
  assetId?: string | null;
  acquisitionSource?: string | null;
  acquisitionSourceId?: string | null;
  acquiredAt?: string | null;
  metadata?: Record<string, unknown>;
  status?: string;
}): ProfileAssetInstance;
export function profileAssetInstanceDraftToRow(draft?: ProfileAssetInstance): Record<string, unknown>;
export function profileAssetAcquisitionSource(asset?: Record<string, unknown> | null): string;
export function createProfileAssetPurchaseSpendMutation(
  asset?: Record<string, unknown> | null,
  options?: { playerId?: string | null; idempotencyKey?: string | null }
): ProfileAssetPurchaseSpendMutation;
export function shapeProfileAssetRecord(asset?: Record<string, unknown> | null): ProfileAssetRecord | null;
export function profileAssetCatalogLookup(
  catalog?: ProfileAssetCatalog,
  assetId?: string | null
): Record<string, unknown> | null;
export function shapeProfileAssetInstanceSummary(input?: {
  instance?: ProfileAssetInstance | Record<string, unknown> | null;
  asset?: Record<string, unknown> | null;
  catalog?: ProfileAssetCatalog;
}): ProfileAssetInstanceSummary | null;
export function shapeProfileAssetEquipmentSummary(input?: {
  equipment?: ProfileAssetEquipment | Record<string, unknown> | null;
  asset?: Record<string, unknown> | null;
  catalog?: ProfileAssetCatalog;
}): ProfileAssetEquipmentSummary | null;
export function shapeProfileAssetPurchaseResult(input?: {
  asset?: Record<string, unknown> | null;
  instance?: ProfileAssetInstance | Record<string, unknown> | null;
  transaction?: unknown | null;
  alreadyOwned?: boolean;
}): ProfileAssetPurchaseResult;
export function shapeProfileAssetEquipResult(input?: {
  asset?: Record<string, unknown> | null;
  equipment?: ProfileAssetEquipment | Record<string, unknown> | null;
  instance?: ProfileAssetInstance | Record<string, unknown> | null;
  validation?: ProfileAssetEquipmentValidation | null;
}): ProfileAssetEquipResult;
export function shapeProfileAssetGrantSummaries(input?: {
  instances?: Array<ProfileAssetInstance | Record<string, unknown>>;
  catalog?: ProfileAssetCatalog;
  assetForInstance?: ((instance: ProfileAssetInstance | Record<string, unknown>) => Record<string, unknown> | null | undefined) | null;
}): ProfileAssetInstanceSummary[];
export function shapeProfileAssetVariant(input?: {
  variant?: Record<string, unknown> | null;
  asset?: Record<string, unknown> | null;
  owned?: boolean;
  active?: boolean;
  policy?: Record<string, unknown>;
}): Record<string, unknown> | null;
export function shapeProfileAssetTargetVariants(input?: {
  variants?: Array<Record<string, unknown>>;
  target?: Record<string, unknown>;
  state?: ProfileAssetState;
  catalog?: ProfileAssetCatalog;
  activeVariantId?: string | null;
  assetIdForVariant?: (variant: Record<string, unknown>, target: Record<string, unknown>) => string | null | undefined;
  policyForAsset?: (
    asset: Record<string, unknown>,
    context: {
      variant: Record<string, unknown>;
      target: Record<string, unknown>;
      owned: boolean;
      state: ProfileAssetState;
    }
  ) => Record<string, unknown> | null | undefined;
  shapeVariant?: (input: {
    variant?: Record<string, unknown> | null;
    asset?: Record<string, unknown> | null;
    owned?: boolean;
    active?: boolean;
    policy?: Record<string, unknown>;
  }) => Record<string, unknown> | null;
}): Array<Record<string, unknown>>;
