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
export function shapeProfileAssetVariant(input?: {
  variant?: Record<string, unknown> | null;
  asset?: Record<string, unknown> | null;
  owned?: boolean;
  active?: boolean;
  policy?: Record<string, unknown>;
}): Record<string, unknown> | null;
