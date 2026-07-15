export const DEFAULT_PROFILE_ASSET_STATUS = 'active';

export function profileAssetStateIssue(code, message) {
  return { code, message };
}

function readField(value, camelKey, snakeKey = null) {
  if (!value || typeof value !== 'object') return null;
  if (value[camelKey] != null) return value[camelKey];
  if (snakeKey && value[snakeKey] != null) return value[snakeKey];
  return null;
}

function parseMetadata(value) {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function profileAssetTargetKey({
  slot,
  targetType,
  targetId = ''
} = {}) {
  return `${slot || ''}:${targetType || ''}:${targetId || ''}`;
}

export function normalizeProfileAssetInstanceRow(row = {}) {
  if (!row) return null;
  return {
    id: readField(row, 'id'),
    playerId: readField(row, 'playerId', 'player_id'),
    assetId: readField(row, 'assetId', 'asset_id'),
    acquisitionSource: readField(row, 'acquisitionSource', 'acquisition_source'),
    acquisitionSourceId: readField(row, 'acquisitionSourceId', 'acquisition_source_id'),
    status: readField(row, 'status') || DEFAULT_PROFILE_ASSET_STATUS,
    acquiredAt: readField(row, 'acquiredAt', 'acquired_at'),
    metadata: parseMetadata(readField(row, 'metadata', 'metadata_json'))
  };
}

export function normalizeProfileAssetEquipmentRow(row = {}) {
  if (!row) return null;
  return {
    id: readField(row, 'id'),
    playerId: readField(row, 'playerId', 'player_id'),
    slot: readField(row, 'slot'),
    targetType: readField(row, 'targetType', 'target_type'),
    targetId: readField(row, 'targetId', 'target_id') || '',
    assetInstanceId: readField(row, 'assetInstanceId', 'asset_instance_id'),
    assetId: readField(row, 'assetId', 'asset_id'),
    equippedAt: readField(row, 'equippedAt', 'equipped_at')
  };
}

export function createProfileAssetState({
  instances = [],
  equipped = []
} = {}) {
  const activeInstances = instances
    .map(normalizeProfileAssetInstanceRow)
    .filter((row) => row && row.assetId && row.status === DEFAULT_PROFILE_ASSET_STATUS);
  const ownedAssetIds = new Set(activeInstances.map((row) => row.assetId));
  const instancesByAssetId = new Map();
  const activeInstancesByAssetId = new Map();
  for (const row of activeInstances) {
    if (!instancesByAssetId.has(row.assetId)) instancesByAssetId.set(row.assetId, row);
    const rows = activeInstancesByAssetId.get(row.assetId) || [];
    rows.push(row);
    activeInstancesByAssetId.set(row.assetId, rows);
  }

  const equippedByTarget = new Map();
  for (const rawRow of equipped) {
    const row = normalizeProfileAssetEquipmentRow(rawRow);
    if (!row) continue;
    equippedByTarget.set(profileAssetTargetKey(row), {
      id: row.id,
      assetId: row.assetId,
      assetInstanceId: row.assetInstanceId || null,
      equippedAt: row.equippedAt
    });
  }

  return {
    ownedAssetIds,
    instancesByAssetId,
    activeInstancesByAssetId,
    equippedByTarget
  };
}

export function profileAssetIsFree(asset) {
  if (!asset || asset.price === null || asset.price === undefined) return false;
  return Number(asset.price) === 0;
}

export function profileAssetIsOwned(asset, state = {}) {
  if (!asset) return false;
  return profileAssetIsFree(asset) || Boolean(state.ownedAssetIds?.has?.(asset.assetId));
}

export function validateProfileAssetEquipment({
  asset,
  instance = null
} = {}) {
  if (!asset) {
    return {
      ok: false,
      issue: profileAssetStateIssue('asset_missing', 'Unknown asset'),
      targetKey: null,
      instance: null
    };
  }
  const targetKey = profileAssetTargetKey(asset);
  if (asset.slot !== 'portrait' || asset.targetType !== 'character') {
    return {
      ok: false,
      issue: profileAssetStateIssue('unsupported_equipment_slot', 'Unsupported asset equipment slot'),
      targetKey,
      instance: null
    };
  }
  const normalizedInstance = normalizeProfileAssetInstanceRow(instance);
  const instanceMatchesAsset = normalizedInstance &&
    normalizedInstance.status === DEFAULT_PROFILE_ASSET_STATUS &&
    normalizedInstance.assetId === asset.assetId;
  if (!profileAssetIsFree(asset) && !instanceMatchesAsset) {
    return {
      ok: false,
      issue: profileAssetStateIssue('asset_not_owned', 'Asset is not owned'),
      targetKey,
      instance: null
    };
  }
  const usableInstance = instanceMatchesAsset ? normalizedInstance : null;
  return {
    ok: true,
    issue: null,
    targetKey,
    instance: usableInstance,
    assetInstanceId: usableInstance?.id || null
  };
}

export function createProfileAssetInstanceDraft({
  id,
  playerId,
  assetId,
  acquisitionSource,
  acquisitionSourceId = null,
  acquiredAt,
  metadata = {},
  status = DEFAULT_PROFILE_ASSET_STATUS
} = {}) {
  return {
    id,
    playerId,
    assetId,
    acquisitionSource,
    acquisitionSourceId,
    status,
    acquiredAt,
    metadata: metadata && typeof metadata === 'object' ? metadata : {}
  };
}

export function profileAssetInstanceDraftToRow(draft = {}) {
  return {
    id: draft.id,
    player_id: draft.playerId,
    asset_id: draft.assetId,
    acquisition_source: draft.acquisitionSource,
    acquisition_source_id: draft.acquisitionSourceId || null,
    status: draft.status || DEFAULT_PROFILE_ASSET_STATUS,
    acquired_at: draft.acquiredAt,
    metadata_json: JSON.stringify(draft.metadata && typeof draft.metadata === 'object' ? draft.metadata : {})
  };
}

export function profileAssetAcquisitionSource(asset) {
  return profileAssetIsFree(asset) ? 'free' : 'direct_purchase';
}

export function createProfileAssetPurchaseSpendMutation(asset, {
  playerId,
  idempotencyKey = null
} = {}) {
  const scopedKey = idempotencyKey
    ? `asset_purchase:${asset?.assetId}:${idempotencyKey}`
    : `asset_purchase:${asset?.assetId}`;
  return {
    playerId,
    currencyCode: asset?.currencyCode,
    amount: Number(asset?.price || 0),
    reason: 'asset_purchase',
    sourceType: 'asset',
    sourceId: asset?.assetId,
    idempotencyKey: scopedKey,
    metadata: {
      slot: asset?.slot || null,
      targetType: asset?.targetType || null,
      targetId: asset?.targetId || null
    }
  };
}

export function shapeProfileAssetRecord(asset = null) {
  if (!asset || typeof asset !== 'object') return null;
  return {
    ...asset,
    assetId: asset.assetId ?? null,
    slot: asset.slot ?? null,
    targetType: asset.targetType ?? null,
    targetId: asset.targetId ?? null,
    variantId: asset.variantId ?? null,
    price: asset.price ?? null,
    currencyCode: asset.currencyCode ?? null,
    acquisitionMode: asset.acquisitionMode ?? null,
    packId: asset.packId ?? null,
    rarity: asset.rarity ?? null,
    path: asset.path ?? null,
    name: asset.name ?? null
  };
}

export function profileAssetCatalogLookup(catalog = [], assetId = null) {
  if (!assetId) return null;
  if (catalog instanceof Map) return catalog.get(assetId) || null;
  return (catalog || []).find((asset) => asset?.assetId === assetId) || null;
}

function profileAssetSummaryFields(asset = null) {
  return {
    slot: asset?.slot ?? null,
    targetType: asset?.targetType ?? null,
    targetId: asset?.targetId ?? null,
    variantId: asset?.variantId ?? null,
    rarity: asset?.rarity ?? null,
    packId: asset?.packId ?? null,
    path: asset?.path ?? null,
    name: asset?.name ?? null
  };
}

export function shapeProfileAssetInstanceSummary({
  instance = null,
  asset = null,
  catalog = []
} = {}) {
  const normalized = normalizeProfileAssetInstanceRow(instance);
  if (!normalized) return null;
  const shapedAsset = shapeProfileAssetRecord(asset || profileAssetCatalogLookup(catalog, normalized.assetId));
  return {
    ...normalized,
    asset: shapedAsset,
    ...profileAssetSummaryFields(shapedAsset)
  };
}

export function shapeProfileAssetEquipmentSummary({
  equipment = null,
  asset = null,
  catalog = []
} = {}) {
  const normalized = normalizeProfileAssetEquipmentRow(equipment);
  if (!normalized) return null;
  const shapedAsset = shapeProfileAssetRecord(asset || profileAssetCatalogLookup(catalog, normalized.assetId));
  return {
    ...normalized,
    targetKey: profileAssetTargetKey(normalized),
    asset: shapedAsset,
    ...profileAssetSummaryFields(shapedAsset)
  };
}

export function shapeProfileAssetPurchaseResult({
  asset = null,
  instance = null,
  transaction = null,
  alreadyOwned = false
} = {}) {
  const shapedAsset = shapeProfileAssetRecord(asset);
  const instanceSummary = shapeProfileAssetInstanceSummary({
    instance,
    asset: shapedAsset
  });
  return {
    assetId: shapedAsset?.assetId ?? instanceSummary?.assetId ?? null,
    asset: shapedAsset,
    instance: instanceSummary,
    transaction: transaction || null,
    alreadyOwned: Boolean(alreadyOwned),
    owned: Boolean(instanceSummary) || profileAssetIsFree(shapedAsset),
    status: alreadyOwned ? 'already_owned' : 'purchased'
  };
}

export function shapeProfileAssetEquipResult({
  asset = null,
  equipment = null,
  instance = null,
  validation = null
} = {}) {
  const shapedAsset = shapeProfileAssetRecord(asset);
  const usableInstance = instance || validation?.instance || null;
  const instanceSummary = shapeProfileAssetInstanceSummary({
    instance: usableInstance,
    asset: shapedAsset
  });
  const fallbackEquipment = shapedAsset
    ? {
        slot: shapedAsset.slot,
        targetType: shapedAsset.targetType,
        targetId: shapedAsset.targetId,
        assetId: shapedAsset.assetId,
        assetInstanceId: validation?.assetInstanceId ?? instanceSummary?.id ?? null
      }
    : null;
  const equipmentSummary = shapeProfileAssetEquipmentSummary({
    equipment: equipment || fallbackEquipment,
    asset: shapedAsset
  });
  const target = equipmentSummary || shapedAsset || {};
  return {
    assetId: shapedAsset?.assetId ?? equipmentSummary?.assetId ?? instanceSummary?.assetId ?? null,
    slot: shapedAsset?.slot ?? equipmentSummary?.slot ?? null,
    targetType: shapedAsset?.targetType ?? equipmentSummary?.targetType ?? null,
    targetId: shapedAsset?.targetId ?? equipmentSummary?.targetId ?? null,
    variantId: shapedAsset?.variantId ?? null,
    path: shapedAsset?.path ?? null,
    rarity: shapedAsset?.rarity ?? null,
    packId: shapedAsset?.packId ?? null,
    targetKey: validation?.targetKey || profileAssetTargetKey(target),
    asset: shapedAsset,
    equipment: equipmentSummary,
    instance: instanceSummary
  };
}

export function shapeProfileAssetGrantSummaries({
  instances = [],
  catalog = [],
  assetForInstance = null
} = {}) {
  return (instances || [])
    .map((instance) => shapeProfileAssetInstanceSummary({
      instance,
      asset: typeof assetForInstance === 'function' ? assetForInstance(instance) : null,
      catalog
    }))
    .filter(Boolean);
}

export function shapeProfileAssetVariant({
  variant,
  asset,
  owned = false,
  active = false,
  policy = {}
} = {}) {
  if (!variant || !asset) return null;
  return {
    ...variant,
    assetId: asset.assetId,
    price: asset.price,
    cost: asset.price,
    currencyCode: asset.currencyCode,
    owned,
    unlocked: owned,
    active,
    acquisitionMode: policy.acquisitionMode,
    purchaseAvailable: Boolean(policy.purchaseAvailable),
    rollAvailable: Boolean(policy.rollAvailable),
    packId: asset.packId,
    rarity: asset.rarity
  };
}

function defaultVariantAssetId(variant = {}) {
  return variant?.assetId || null;
}

export function shapeProfileAssetTargetVariants({
  variants = [],
  target = {},
  state = {},
  catalog = [],
  activeVariantId = null,
  assetIdForVariant = defaultVariantAssetId,
  policyForAsset = () => ({}),
  shapeVariant = shapeProfileAssetVariant
} = {}) {
  return (variants || [])
    .map((variant) => {
      const assetId = assetIdForVariant(variant, target);
      const asset = profileAssetCatalogLookup(catalog, assetId);
      if (!asset) return null;
      const owned = profileAssetIsOwned(asset, state);
      const policy = policyForAsset(asset, { variant, target, owned, state }) || {};
      return shapeVariant({
        variant,
        asset,
        owned,
        active: variant?.id === activeVariantId,
        policy
      });
    })
    .filter(Boolean);
}
