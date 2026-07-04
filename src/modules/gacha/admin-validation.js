export const DEFAULT_GACHA_ADMIN_FIXTURE_SCHEMA_VERSION = 'gacha-admin-fixture/v1';
export const DEFAULT_GACHA_ADMIN_CURRENCY_CODE = 'soft_coin';
export const DEFAULT_GACHA_ADMIN_PLAN_TARGET_PER_CHARACTER = 5;

function requiredText(value, label) {
  const normalized = String(value || '').trim();
  if (!normalized) throw new Error(`${label} is required`);
  return normalized;
}

function normalizeFixtureArray(value, label) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value;
}

function assertUniqueFixtureIds(rows, label) {
  const seen = new Set();
  for (const row of rows) {
    const id = requiredText(row?.id, `${label} id`);
    if (seen.has(id)) throw new Error(`${label} fixture contains duplicate id ${id}`);
    seen.add(id);
  }
}

function parseMetadata(value, fallback = {}) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
}

function parseSnapshotJson(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

function rowValue(row, camelKey, snakeKey = camelKey) {
  return row?.[camelKey] ?? row?.[snakeKey];
}

function rowJsonValue(row, camelKey, snakeKey = camelKey, fallback = null) {
  return parseSnapshotJson(rowValue(row, camelKey, snakeKey), fallback);
}

function rowNumberValue(row, camelKey, snakeKey = camelKey) {
  const value = rowValue(row, camelKey, snakeKey);
  if (value === undefined || value === null || value === '') return value;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}

function checklistIssue(code, message, severity = 'blocker', details = {}) {
  return { code, message, severity, ...details };
}

function hasLocalizedCopy(value) {
  if (!value) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).some((entry) => typeof entry === 'string' && entry.trim());
}

function disclosureCopy(metadata = {}) {
  if (!metadata || typeof metadata !== 'object') return null;
  return metadata.disclosure || metadata.oddsDisclosure || metadata.description || null;
}

function duplicatePolicyMode(policy) {
  if (policy === true || policy === 'allow_duplicates' || policy === 'copies') return 'allow_duplicates';
  if (policy && typeof policy === 'object' && !Array.isArray(policy)) return policy.mode || null;
  return null;
}

function duplicateCopyCap(policy) {
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) return null;
  return Number.isInteger(Number(policy.maxCopiesPerAsset)) ? Number(policy.maxCopiesPerAsset) : null;
}

export function createGachaAdminReleaseChecklist({
  runtimePack,
  validation,
  seasonRow = null,
  collectionRow = null,
  catalog = [],
  currencyCode = DEFAULT_GACHA_ADMIN_CURRENCY_CODE
} = {}) {
  const pack = runtimePack || {};
  const validationResult = validation || { ok: false, errors: [] };
  const blockers = [];
  const warnings = [];
  const passed = [];
  const metadata = pack.metadata || {};
  const catalogById = new Map((catalog || []).map((asset) => [asset.assetId, asset]));

  if (validationResult.ok) passed.push(checklistIssue('runtime_validation_ok', 'Runtime pack validation passes.', 'pass'));
  else blockers.push(checklistIssue(
    'runtime_validation_failed',
    'Runtime pack validation must pass before approval or publish.',
    'blocker',
    { errorCodes: (validationResult.errors || []).map((issue) => issue.code) }
  ));

  if (pack.startsAt) passed.push(checklistIssue('pack_starts_at_present', 'Pack start date is set.', 'pass'));
  else blockers.push(checklistIssue('pack_starts_at_missing', 'Pack start date is required for release.'));

  if (pack.endsAt) passed.push(checklistIssue('pack_ends_at_present', 'Pack end date is set.', 'pass'));
  else blockers.push(checklistIssue('pack_ends_at_missing', 'Pack end date is required for release.'));

  if (hasLocalizedCopy(disclosureCopy(metadata))) {
    passed.push(checklistIssue('disclosure_copy_present', 'Player-facing disclosure copy is present.', 'pass'));
  } else {
    blockers.push(checklistIssue(
      'disclosure_copy_missing',
      'Pack metadata must include disclosure, oddsDisclosure, or description copy before release.'
    ));
  }

  if (Number.isInteger(Number(pack.rollPriceAmount)) && Number(pack.rollPriceAmount) > 0) {
    passed.push(checklistIssue('price_present', 'Pack roll price is a positive wallet amount.', 'pass'));
  } else {
    blockers.push(checklistIssue('price_missing_or_invalid', 'Pack roll price must be a positive wallet amount.'));
  }
  if (pack.rollPriceCurrencyCode === currencyCode) {
    passed.push(checklistIssue('currency_ok', `Pack currency is ${currencyCode}.`, 'pass'));
  } else {
    blockers.push(checklistIssue('currency_unsupported', `Pack currency must be ${currencyCode}.`));
  }

  if (seasonRow && !['active', 'future'].includes(seasonRow.status)) {
    warnings.push(checklistIssue(
      'season_not_release_ready',
      `Season status is ${seasonRow.status}; active/future is expected before release.`,
      'warning'
    ));
  }
  if (collectionRow && !['active', 'future'].includes(collectionRow.status)) {
    warnings.push(checklistIssue(
      'collection_not_release_ready',
      `Collection status is ${collectionRow.status}; active/future is expected before release.`,
      'warning'
    ));
  }

  const policyMode = duplicatePolicyMode(pack.duplicatePolicy);
  if (policyMode === 'allow_duplicates') {
    const packCap = duplicateCopyCap(pack.duplicatePolicy);
    const uncappedItems = (pack.items || []).filter((item) =>
      item.copyLimit === undefined || item.copyLimit === null
    );
    if (!packCap && uncappedItems.length) {
      warnings.push(checklistIssue(
        'duplicate_copy_cap_missing',
        'Duplicate-enabled packs should define a pack copy cap or item copy caps.',
        'warning',
        { assetIds: uncappedItems.map((item) => item.assetId) }
      ));
    }
  }

  const policyRecommendations = [];
  for (const item of pack.items || []) {
    const asset = catalogById.get(item.assetId);
    if (!asset) continue;
    const alreadyMapped = asset.packId === pack.id &&
      (asset.acquisitionMode === 'gacha' || asset.acquisitionMode === 'both');
    if (!alreadyMapped) {
      policyRecommendations.push({
        assetId: item.assetId,
        current: {
          acquisitionMode: asset.acquisitionMode,
          packId: asset.packId
        },
        recommended: {
          acquisitionMode: 'gacha',
          packId: pack.id
        }
      });
    }
  }
  if (policyRecommendations.length) {
    warnings.push(checklistIssue(
      'asset_policy_mapping_recommended',
      'Some pack assets are not mapped to this DB pack in the asset acquisition policy.',
      'warning',
      {
        recommendations: policyRecommendations,
        recommendedPolicyJson: Object.fromEntries(policyRecommendations.map((entry) => [
          entry.assetId,
          entry.recommended
        ]))
      }
    ));
  } else if ((pack.items || []).length) {
    passed.push(checklistIssue('asset_policy_mapping_ok', 'Pack assets are mapped to this pack policy.', 'pass'));
  }

  return {
    ok: blockers.length === 0,
    blockers,
    warnings,
    passed
  };
}

export function gachaAdminAssetPolicyRecommendationsFromChecklist(releaseChecklist) {
  return (releaseChecklist?.warnings || [])
    .find((issue) => issue.code === 'asset_policy_mapping_recommended')
    ?.recommendations || [];
}

function gachaAdminPackItemSnapshot(item = {}) {
  const snapshot = {
    assetId: rowValue(item, 'assetId', 'asset_id'),
    rarity: rowValue(item, 'rarity'),
    dropWeight: rowNumberValue(item, 'dropWeight', 'drop_weight'),
    metadata: rowJsonValue(item, 'metadata', 'metadata_json', {})
  };
  const copyLimit = rowNumberValue(item, 'copyLimit', 'copy_limit');
  if (copyLimit !== undefined && copyLimit !== null && copyLimit !== '') snapshot.copyLimit = copyLimit;
  return snapshot;
}

export function gachaAdminPackSnapshot(pack = {}) {
  const items = Array.isArray(pack?.items) ? pack.items : [];
  return {
    id: rowValue(pack, 'id'),
    seasonId: rowValue(pack, 'seasonId', 'season_id'),
    collectionId: rowValue(pack, 'collectionId', 'collection_id'),
    name: rowJsonValue(pack, 'name', 'name_json', {}),
    status: rowValue(pack, 'status'),
    startsAt: rowValue(pack, 'startsAt', 'starts_at') || null,
    endsAt: rowValue(pack, 'endsAt', 'ends_at') || null,
    rollPriceCurrencyCode: rowValue(pack, 'rollPriceCurrencyCode', 'roll_price_currency_code'),
    rollPriceAmount: rowNumberValue(pack, 'rollPriceAmount', 'roll_price_amount'),
    rollSize: rowNumberValue(pack, 'rollSize', 'roll_size'),
    rarityWeights: rowJsonValue(pack, 'rarityWeights', 'rarity_weights_json', null),
    slots: rowJsonValue(pack, 'slots', 'slots_json', null),
    guarantees: rowJsonValue(pack, 'guarantees', 'guarantees_json', null),
    pityRules: rowJsonValue(pack, 'pityRules', 'pity_rules_json', null),
    duplicatePolicy: rowJsonValue(pack, 'duplicatePolicy', 'duplicate_policy_json', null),
    burnRules: rowJsonValue(pack, 'burnRules', 'burn_rules_json', null),
    metadata: rowJsonValue(pack, 'metadata', 'metadata_json', {}),
    items: items
      .map((item) => gachaAdminPackItemSnapshot(item))
      .sort((a, b) => String(a.assetId || '').localeCompare(String(b.assetId || '')))
  };
}

function diffValues(before, after) {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  const changed = [];
  for (const key of keys) {
    const beforeValue = before?.[key];
    const afterValue = after?.[key];
    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      changed.push({ field: key, before: beforeValue ?? null, after: afterValue ?? null });
    }
  }
  return changed;
}

export function buildGachaAdminPackDraftDiff({
  basePack = null,
  draftPack = null,
  basePackId = null
} = {}) {
  const resolvedBasePackId = basePackId ||
    draftPack?.metadata?.basePackId ||
    draftPack?.metadata?.clonedFromPackId ||
    null;
  if (!resolvedBasePackId || resolvedBasePackId === draftPack?.id) return null;
  if (!basePack) {
    return {
      basePackId: resolvedBasePackId,
      missingBase: true,
      changedFields: [],
      addedItems: [],
      removedItems: [],
      changedItems: []
    };
  }

  const baseSnapshot = gachaAdminPackSnapshot(basePack);
  const draftSnapshot = gachaAdminPackSnapshot(draftPack || {});
  const baseItems = new Map(baseSnapshot.items.map((item) => [item.assetId, item]));
  const draftItems = new Map(draftSnapshot.items.map((item) => [item.assetId, item]));
  const addedItems = [...draftItems.keys()].filter((assetId) => !baseItems.has(assetId));
  const removedItems = [...baseItems.keys()].filter((assetId) => !draftItems.has(assetId));
  const changedItems = [...draftItems.keys()]
    .filter((assetId) => baseItems.has(assetId))
    .map((assetId) => ({
      assetId,
      changes: diffValues(baseItems.get(assetId), draftItems.get(assetId))
    }))
    .filter((entry) => entry.changes.length);
  const { items: _baseItems, ...baseFields } = baseSnapshot;
  const { items: _draftItems, ...draftFields } = draftSnapshot;
  return {
    basePackId: resolvedBasePackId,
    missingBase: false,
    changedFields: diffValues(baseFields, draftFields),
    addedItems,
    removedItems,
    changedItems
  };
}

export function summarizeGachaAdminFixtureOperations(operations = []) {
  const summary = {
    total: 0,
    create: 0,
    update: 0,
    replace: 0,
    noop: 0,
    byType: {}
  };
  for (const operation of Array.isArray(operations) ? operations : []) {
    const action = operation?.action;
    const type = operation?.type;
    summary.total += 1;
    if (action) summary[action] = (summary[action] || 0) + 1;
    if (type) summary.byType[type] = (summary.byType[type] || 0) + 1;
  }
  return summary;
}

export function normalizeGachaAdminFixture(input = {}, {
  schemaVersion = DEFAULT_GACHA_ADMIN_FIXTURE_SCHEMA_VERSION
} = {}) {
  const fixture = input.fixture && typeof input.fixture === 'object' ? input.fixture : input;
  if (!fixture || typeof fixture !== 'object' || Array.isArray(fixture)) {
    throw new Error('Gacha fixture must be an object');
  }
  const seasons = normalizeFixtureArray(fixture.seasons, 'Gacha fixture seasons');
  const collections = normalizeFixtureArray(fixture.collections, 'Gacha fixture collections');
  const planItems = normalizeFixtureArray(fixture.planItems, 'Gacha fixture planItems');
  const flatItems = normalizeFixtureArray(fixture.items, 'Gacha fixture items');
  const flatItemsByPack = new Map();
  for (const item of flatItems) {
    const packId = requiredText(item?.packId ?? item?.pack_id, 'Gacha fixture item packId');
    const rows = flatItemsByPack.get(packId) || [];
    rows.push(item);
    flatItemsByPack.set(packId, rows);
  }
  const packs = normalizeFixtureArray(fixture.packs, 'Gacha fixture packs').map((pack) => {
    const id = requiredText(pack?.id, 'Gacha fixture pack id');
    const nestedItems = pack.items === undefined
      ? flatItemsByPack.get(id) || []
      : normalizeFixtureArray(pack.items, `Gacha fixture pack ${id} items`);
    return { ...pack, items: nestedItems };
  });
  assertUniqueFixtureIds(seasons, 'Gacha season');
  assertUniqueFixtureIds(collections, 'Gacha collection');
  assertUniqueFixtureIds(planItems, 'Gacha plan item');
  assertUniqueFixtureIds(packs, 'Gacha pack');
  return {
    schemaVersion: fixture.schemaVersion || schemaVersion,
    seasons,
    collections,
    planItems,
    packs
  };
}

export function gachaAdminPlanAssetId(characterId, itemId) {
  return `planned_portrait.${characterId}.${itemId}`;
}

export function resolveGachaAdminPlanItemAssetContract({
  beforeRow,
  fields = {},
  payload = {},
  hasPackLink = false,
  createPlanAssetId = gachaAdminPlanAssetId
} = {}) {
  const beforeCharacterId = rowValue(beforeRow, 'characterId', 'character_id');
  const beforeAssetId = rowValue(beforeRow, 'assetId', 'asset_id');
  const beforeId = rowValue(beforeRow, 'id', 'id');
  const nextFields = { ...fields };
  const nextCharacterId = rowValue(nextFields, 'characterId', 'character_id');
  const characterChanging = Boolean(nextCharacterId && nextCharacterId !== beforeCharacterId);
  const assetIdProvided = Object.prototype.hasOwnProperty.call(payload, 'assetId') ||
    Object.prototype.hasOwnProperty.call(payload, 'asset_id');
  const requestedAssetId = assetIdProvided
    ? requiredText(payload.assetId ?? payload.asset_id, 'Gacha plan item assetId')
    : null;
  const generatedBefore = createPlanAssetId(beforeCharacterId, beforeId);
  const generatedAfter = characterChanging ? createPlanAssetId(nextCharacterId, beforeId) : null;
  const canSyncGeneratedId = characterChanging && beforeAssetId === generatedBefore;

  if (characterChanging && hasPackLink) {
    throw new Error('Gacha plan item character cannot change after its asset is linked to a pack');
  }

  if (assetIdProvided) {
    const allowedGeneratedSync = canSyncGeneratedId && requestedAssetId === generatedAfter;
    if (requestedAssetId !== beforeAssetId && !allowedGeneratedSync) {
      throw new Error('Gacha plan item assetId is immutable after creation');
    }
    delete nextFields.asset_id;
    delete nextFields.assetId;
  }

  let assetIdToReserve = null;
  if (canSyncGeneratedId) {
    assetIdToReserve = generatedAfter;
    if (Object.prototype.hasOwnProperty.call(nextFields, 'characterId')) nextFields.assetId = generatedAfter;
    else nextFields.asset_id = generatedAfter;
  }

  return {
    fields: nextFields,
    assetIdToReserve,
    generatedBefore,
    generatedAfter,
    characterChanging,
    canSyncGeneratedId
  };
}

export function summarizeGachaAdminPlanItems(planItems = [], {
  characterOptions = [],
  targetPerCharacter = DEFAULT_GACHA_ADMIN_PLAN_TARGET_PER_CHARACTER
} = {}) {
  const target = Number.isInteger(Number(targetPerCharacter)) && Number(targetPerCharacter) > 0
    ? Number(targetPerCharacter)
    : DEFAULT_GACHA_ADMIN_PLAN_TARGET_PER_CHARACTER;
  const characters = Array.isArray(characterOptions) ? characterOptions : [];
  const bySeason = new Map();
  for (const item of planItems) {
    const seasonId = rowValue(item, 'seasonId', 'season_id');
    const characterId = rowValue(item, 'characterId', 'character_id');
    const season = bySeason.get(seasonId) || {
      seasonId,
      total: 0,
      totalWeight: 0,
      characters: Object.fromEntries(characters.map((character) => [
        character.id,
        {
          characterId: character.id,
          label: character.label,
          count: 0,
          readyCount: 0,
          target,
          missing: target,
          enough: false,
          totalWeight: 0
        }
      ]))
    };
    const row = season.characters[characterId] || {
      characterId,
      label: characterId,
      count: 0,
      readyCount: 0,
      target,
      missing: target,
      enough: false,
      totalWeight: 0
    };
    const dropWeight = Math.max(0, Number(rowValue(item, 'dropWeight', 'drop_weight') || 0));
    row.count += 1;
    if (item.status === 'ready') row.readyCount += 1;
    row.totalWeight += dropWeight;
    row.missing = Math.max(0, target - row.count);
    row.enough = row.count >= target;
    season.characters[characterId] = row;
    season.total += 1;
    season.totalWeight += dropWeight;
    bySeason.set(seasonId, season);
  }
  return {
    targetPerCharacter: target,
    seasons: [...bySeason.values()].map((season) => ({
      ...season,
      characters: Object.values(season.characters)
    }))
  };
}

export function gachaAdminPlanCatalogAssetFromRow(row, {
  catalog = [],
  currencyCode = DEFAULT_GACHA_ADMIN_CURRENCY_CODE
} = {}) {
  if (!row || row.status !== 'ready') return null;
  const assetId = rowValue(row, 'assetId', 'asset_id');
  if ((catalog || []).some((asset) => asset.assetId === assetId)) return null;
  const metadata = parseMetadata(rowValue(row, 'metadata', 'metadata_json'), {});
  const promotedPackItemIds = metadata.promotedPackItemIds && typeof metadata.promotedPackItemIds === 'object'
    ? metadata.promotedPackItemIds
    : {};
  const packIds = Object.keys(promotedPackItemIds);
  const id = rowValue(row, 'id', 'id');
  const characterId = rowValue(row, 'characterId', 'character_id');
  const characterLabel = characterId
    ? characterId[0].toUpperCase() + characterId.slice(1)
    : 'Character';
  return {
    assetId,
    slot: 'portrait',
    targetType: 'character',
    targetId: characterId,
    variantId: `plan_${String(id || '').replace(/[^a-zA-Z0-9_-]/g, '_')}`,
    name: metadata.name || { en: `${characterLabel} season portrait`, ru: `${characterLabel} season portrait` },
    path: rowValue(row, 'imagePath', 'image_path'),
    price: null,
    currencyCode,
    acquisitionMode: 'gacha',
    packId: metadata.primaryPackId || metadata.lastPromotedPackId || packIds[0] || null,
    packIds,
    rarity: row.rarity || 'common',
    dropWeight: Number(rowValue(row, 'dropWeight', 'drop_weight') || 1),
    maxCopiesPerPlayer: 1,
    source: 'gacha_plan',
    planItemId: id,
    status: row.status
  };
}

export function catalogWithGachaAdminPlanRows(catalog = [], planRows = [], options = {}) {
  const merged = [...(catalog || [])];
  for (const row of planRows || []) {
    const asset = gachaAdminPlanCatalogAssetFromRow(row, { ...options, catalog: merged });
    if (asset) merged.push(asset);
  }
  return merged;
}

export function normalizeGachaAdminPlanItemIds(value) {
  if (value === undefined || value === null || value === '') return [];
  if (!Array.isArray(value)) throw new Error('Gacha plan item ids must be an array');
  return value.map((id) => requiredText(id, 'Gacha plan item id'));
}

export function gachaAdminPromotionPackItemMetadata(planRow, packRow, existingMetadata = {}) {
  return {
    ...existingMetadata,
    source: 'gacha_plan',
    sourcePlanItemId: rowValue(planRow, 'id', 'id'),
    sourceSeasonId: rowValue(planRow, 'seasonId', 'season_id'),
    characterId: rowValue(planRow, 'characterId', 'character_id'),
    imagePath: rowValue(planRow, 'imagePath', 'image_path'),
    fileName: rowValue(planRow, 'fileName', 'file_name') || null,
    mimeType: rowValue(planRow, 'mimeType', 'mime_type'),
    promotedToPackId: rowValue(packRow, 'id', 'id')
  };
}

export function gachaAdminPromotedPlanMetadata(planRow, packItem, packRow, {
  now = new Date().toISOString()
} = {}) {
  const metadata = parseMetadata(rowValue(planRow, 'metadata', 'metadata_json'), {});
  const packId = rowValue(packRow, 'id', 'id');
  const packItemId = rowValue(packItem, 'id', 'id');
  const promotedPackIds = Array.from(new Set([...(metadata.promotedPackIds || []), packId]));
  const promotedPackItemIds = {
    ...(metadata.promotedPackItemIds || {}),
    [packId]: packItemId
  };
  return {
    ...metadata,
    promotedPackIds,
    promotedPackItemIds,
    lastPromotedAt: now,
    lastPromotedPackId: packId,
    lastPromotedPackItemId: packItemId
  };
}
