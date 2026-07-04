const DEFAULT_RARITIES = ['common', 'rare', 'epic', 'legendary', 'secret'];
const DEFAULT_PACK_STATUSES = ['active', 'future', 'expired', 'disabled'];
const DEFAULT_PITY_RESET_SCOPES = ['pack'];
const DEFAULT_DUPLICATE_POLICY_MODES = ['unowned_only', 'allow_duplicates'];
const DEFAULT_BURN_TARGET_DUPLICATE_POLICIES = ['allow_duplicates', 'unowned_first', 'unowned_only'];

export const DEFAULT_ASSET_GACHA_OPTIONS = Object.freeze({
  validRarities: DEFAULT_RARITIES,
  validPackStatuses: DEFAULT_PACK_STATUSES,
  supportedPityResetScopes: DEFAULT_PITY_RESET_SCOPES,
  supportedDuplicatePolicyModes: DEFAULT_DUPLICATE_POLICY_MODES,
  supportedBurnTargetDuplicatePolicies: DEFAULT_BURN_TARGET_DUPLICATE_POLICIES,
  minRollSize: 1,
  maxRollSize: 10,
  maxBurnTargetCount: 10,
  currencyCode: 'soft_coin'
});

function optionSet(options, key) {
  return new Set(options?.[key] || DEFAULT_ASSET_GACHA_OPTIONS[key]);
}

function optionValue(options, key) {
  return options?.[key] ?? DEFAULT_ASSET_GACHA_OPTIONS[key];
}

function optionalPositiveInteger(value) {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  return Number.isInteger(numeric) ? numeric : Number.NaN;
}

export function assetGachaValidationIssue(code, message, itemIndex = null) {
  return { code, message, itemIndex };
}

export function assetGachaPackRollSize(pack) {
  const rollSize = Number(pack?.rollSize ?? 1);
  return Number.isInteger(rollSize) ? rollSize : Number.NaN;
}

export function assetGachaRarityRank(rarity, options = {}) {
  const order = options.validRarities || DEFAULT_ASSET_GACHA_OPTIONS.validRarities;
  const index = order.indexOf(String(rarity || 'common'));
  return index >= 0 ? index : 0;
}

export function assetGachaRarityAtLeast(rarity, minRarity, options = {}) {
  return assetGachaRarityRank(rarity, options) >= assetGachaRarityRank(minRarity, options);
}

export function assetGachaRarityWeightEntries(rarityWeights) {
  if (!rarityWeights || typeof rarityWeights !== 'object' || Array.isArray(rarityWeights)) return [];
  return Object.entries(rarityWeights)
    .map(([rarity, weight]) => [rarity, Number(weight)])
    .filter(([, weight]) => Number.isFinite(weight) && weight > 0);
}

export function defaultAssetGachaRarityWeightsForItems(items = []) {
  return items.reduce((weights, item) => {
    const rarity = item.rarity || 'common';
    weights[rarity] = (weights[rarity] || 0) + Math.max(0, Number(item.dropWeight || 0));
    return weights;
  }, {});
}

function rawGuaranteeRules(pack) {
  if (Array.isArray(pack?.guarantees)) return pack.guarantees;
  if (Array.isArray(pack?.guaranteeRules)) return pack.guaranteeRules;
  return [];
}

export function normalizeAssetGachaGuaranteeRules(pack) {
  return rawGuaranteeRules(pack).map((rule, index) => {
    const minRarity = String(rule?.minRarity || rule?.rarity || 'rare');
    const count = Number(rule?.count || 1);
    return {
      id: String(rule?.id || `guarantee_${index + 1}_${minRarity}_plus`),
      type: 'min_rarity_count',
      source: 'guarantee',
      minRarity,
      count: Number.isInteger(count) ? count : Number.NaN,
      label: rule?.label || null
    };
  });
}

function rawPityRules(pack) {
  return Array.isArray(pack?.pityRules) ? pack.pityRules : [];
}

export function normalizeAssetGachaPityRules(pack) {
  return rawPityRules(pack).map((rule, index) => {
    const minRarity = String(rule?.minRarity || rule?.rarity || 'epic');
    const threshold = Number(rule?.threshold || rule?.opens || 0);
    const count = Number(rule?.count || 1);
    return {
      id: String(rule?.id || `pity_${index + 1}_${minRarity}_plus`),
      type: 'min_rarity_pity',
      source: 'pity',
      minRarity,
      threshold: Number.isInteger(threshold) ? threshold : Number.NaN,
      count: Number.isInteger(count) ? count : Number.NaN,
      resetScope: rule?.resetScope || 'pack',
      label: rule?.label || null
    };
  });
}

export function normalizeAssetGachaDuplicatePolicy(pack, options = {}) {
  const raw = pack?.duplicatePolicy;
  const supportedModes = optionSet(options, 'supportedDuplicatePolicyModes');
  const rawCopyLimit = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw.maxCopiesPerAsset ?? raw.maxCopies ?? raw.copyLimit ?? pack?.maxCopiesPerAsset
    : pack?.maxCopiesPerAsset;
  const maxCopiesPerAsset = optionalPositiveInteger(rawCopyLimit);
  if (raw === true || raw === 'allow_duplicates' || raw === 'copies') {
    return { mode: 'allow_duplicates', enabled: true, preserveFirstCopy: true, maxCopiesPerAsset };
  }
  if (typeof raw === 'string') {
    const mode = raw === 'copies' ? 'allow_duplicates' : raw;
    return {
      mode,
      enabled: mode === 'allow_duplicates',
      preserveFirstCopy: true,
      maxCopiesPerAsset
    };
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const configuredMode = raw.mode === 'copies' ? 'allow_duplicates' : raw.mode;
    const mode = supportedModes.has(configuredMode)
      ? configuredMode
      : String(configuredMode || 'unowned_only');
    return {
      mode,
      enabled: mode === 'allow_duplicates',
      preserveFirstCopy: raw.preserveFirstCopy !== false,
      maxCopiesPerAsset
    };
  }
  return { mode: 'unowned_only', enabled: false, preserveFirstCopy: true, maxCopiesPerAsset };
}

function rawItemCopyLimit(item) {
  return item?.maxCopiesPerPlayer ?? item?.maxCopies ?? item?.copyLimit;
}

export function assetGachaCopyLimitForPackItem(
  pack,
  item,
  duplicatePolicy = normalizeAssetGachaDuplicatePolicy(pack)
) {
  const itemLimit = optionalPositiveInteger(rawItemCopyLimit(item));
  return itemLimit === null ? duplicatePolicy.maxCopiesPerAsset : itemLimit;
}

export function assetGachaCopyLimitReached(copyCount, copyLimit) {
  return copyLimit !== null && Number.isInteger(copyLimit) && copyCount >= copyLimit;
}

function rawBurnRules(pack) {
  if (Array.isArray(pack?.burnRules)) return pack.burnRules;
  if (Array.isArray(pack?.duplicateBurnRules)) return pack.duplicateBurnRules;
  return [];
}

export function normalizeAssetGachaBurnRules(pack) {
  return rawBurnRules(pack).map((rule, index) => {
    const sourceRarity = String(rule?.sourceRarity || rule?.rarity || 'common');
    const sourceCount = Number(rule?.sourceCount ?? rule?.count ?? 5);
    const targetMinRarity = String(rule?.targetMinRarity || rule?.targetRarity || 'rare');
    const targetCount = Number(rule?.targetCount ?? 1);
    const targetDuplicatePolicy = String(rule?.targetDuplicatePolicy || rule?.targetPolicy || 'allow_duplicates');
    return {
      id: String(rule?.id || `burn_${sourceCount}_${sourceRarity}_to_${targetMinRarity}`),
      type: 'duplicate_burn_exchange',
      sourceRarity,
      sourceCount: Number.isInteger(sourceCount) ? sourceCount : Number.NaN,
      targetMinRarity,
      targetCount: Number.isInteger(targetCount) ? targetCount : Number.NaN,
      sourceScope: 'duplicate_copies',
      targetScope: 'pack',
      targetDuplicatePolicy,
      label: rule?.label || null,
      index
    };
  });
}

function validDateValue(value) {
  if (value === null || value === undefined || value === '') return true;
  return !Number.isNaN(new Date(value).getTime());
}

function guaranteeRuleEligibleCount(pack, minRarity, options = {}) {
  return (pack?.items || []).filter((item) => assetGachaRarityAtLeast(item.rarity, minRarity, options)).length;
}

function burnRuleTargetCount(pack, minRarity, options = {}) {
  return (pack?.items || []).filter((item) => assetGachaRarityAtLeast(item.rarity, minRarity, options)).length;
}

export function normalizeAssetGachaPackSlots(pack, options = {}) {
  const rollSize = assetGachaPackRollSize(pack);
  const minRollSize = optionValue(options, 'minRollSize');
  const maxRollSize = optionValue(options, 'maxRollSize');
  if (!Number.isInteger(rollSize) || rollSize < minRollSize || rollSize > maxRollSize) return [];
  const fallbackWeights = pack?.rarityWeights && typeof pack.rarityWeights === 'object'
    ? pack.rarityWeights
    : defaultAssetGachaRarityWeightsForItems(pack?.items || []);
  const configuredSlots = Array.isArray(pack?.slots) ? pack.slots : [];
  return Array.from({ length: rollSize }, (_, index) => {
    const slot = configuredSlots[index] && typeof configuredSlots[index] === 'object'
      ? configuredSlots[index]
      : {};
    return {
      slotIndex: index,
      rarityWeights: slot.rarityWeights && typeof slot.rarityWeights === 'object'
        ? slot.rarityWeights
        : fallbackWeights
    };
  });
}

export function validateAssetGachaPack(pack, {
  catalog = [],
  currencyCode = DEFAULT_ASSET_GACHA_OPTIONS.currencyCode,
  ...options
} = {}) {
  const errors = [];
  const warnings = [];
  const assetIds = new Set(catalog.map((asset) => asset.assetId));
  const seen = new Set();
  const validStatuses = optionSet(options, 'validPackStatuses');
  const validRarities = optionSet(options, 'validRarities');
  const supportedPityResetScopes = optionSet(options, 'supportedPityResetScopes');
  const supportedDuplicateModes = optionSet(options, 'supportedDuplicatePolicyModes');
  const supportedBurnTargetPolicies = optionSet(options, 'supportedBurnTargetDuplicatePolicies');
  const minRollSize = optionValue(options, 'minRollSize');
  const maxRollSize = optionValue(options, 'maxRollSize');
  const maxBurnTargetCount = optionValue(options, 'maxBurnTargetCount');

  if (!pack || typeof pack !== 'object') {
    return {
      ok: false,
      errors: [assetGachaValidationIssue('pack_missing', 'Asset pack definition is missing.')],
      warnings
    };
  }
  if (!pack.id) errors.push(assetGachaValidationIssue('pack_id_missing', 'Asset pack id is required.'));
  if (!pack.seasonId) errors.push(assetGachaValidationIssue('season_id_missing', 'Asset pack seasonId is required.'));
  if (!pack.collectionId) errors.push(assetGachaValidationIssue('collection_id_missing', 'Asset pack collectionId is required.'));
  if (!validStatuses.has(String(pack.status || ''))) {
    errors.push(assetGachaValidationIssue('status_invalid', `Asset pack ${pack.id || '(unknown)'} has invalid status.`));
  }
  if (!validDateValue(pack.startsAt)) {
    errors.push(assetGachaValidationIssue('starts_at_invalid', `Asset pack ${pack.id || '(unknown)'} has invalid startsAt.`));
  }
  if (!validDateValue(pack.endsAt)) {
    errors.push(assetGachaValidationIssue('ends_at_invalid', `Asset pack ${pack.id || '(unknown)'} has invalid endsAt.`));
  }
  if (validDateValue(pack.startsAt) && validDateValue(pack.endsAt) && pack.startsAt && pack.endsAt) {
    const startsAt = new Date(pack.startsAt).getTime();
    const endsAt = new Date(pack.endsAt).getTime();
    if (startsAt >= endsAt) {
      errors.push(assetGachaValidationIssue('date_window_invalid', `Asset pack ${pack.id || '(unknown)'} starts after it ends.`));
    }
  }
  if (pack.rollPriceCurrencyCode !== currencyCode) {
    errors.push(assetGachaValidationIssue('currency_invalid', `Asset pack ${pack.id || '(unknown)'} must use ${currencyCode}.`));
  }
  if (!Number.isInteger(Number(pack.rollPriceAmount)) || Number(pack.rollPriceAmount) <= 0) {
    errors.push(assetGachaValidationIssue('price_invalid', `Asset pack ${pack.id || '(unknown)'} needs a positive integer roll price.`));
  }
  const rollSize = assetGachaPackRollSize(pack);
  if (!Number.isInteger(rollSize) || rollSize < minRollSize || rollSize > maxRollSize) {
    errors.push(assetGachaValidationIssue('roll_size_invalid', `Asset pack ${pack.id || '(unknown)'} rollSize must be an integer from ${minRollSize} to ${maxRollSize}.`));
  }
  if (pack.rarityTableVersion !== undefined && typeof pack.rarityTableVersion !== 'string') {
    errors.push(assetGachaValidationIssue('rarity_table_version_invalid', `Asset pack ${pack.id || '(unknown)'} rarityTableVersion must be a string.`));
  }
  if (!Array.isArray(pack.items) || pack.items.length === 0) {
    errors.push(assetGachaValidationIssue('items_missing', `Asset pack ${pack.id || '(unknown)'} needs at least one item.`));
  }
  for (const [index, item] of (pack.items || []).entries()) {
    if (!item?.assetId) {
      errors.push(assetGachaValidationIssue('item_asset_missing', 'Pack item assetId is required.', index));
      continue;
    }
    if (seen.has(item.assetId)) {
      errors.push(assetGachaValidationIssue('item_asset_duplicate', `Pack item ${item.assetId} appears more than once.`, index));
    }
    seen.add(item.assetId);
    if (!assetIds.has(item.assetId)) {
      errors.push(assetGachaValidationIssue('item_asset_unknown', `Pack item ${item.assetId} is not in the asset catalog.`, index));
    }
    if (!validRarities.has(String(item.rarity || ''))) {
      errors.push(assetGachaValidationIssue('item_rarity_invalid', `Pack item ${item.assetId} has invalid rarity.`, index));
    }
    if (!Number.isFinite(Number(item.dropWeight)) || Number(item.dropWeight) <= 0) {
      errors.push(assetGachaValidationIssue('item_weight_invalid', `Pack item ${item.assetId} needs a positive dropWeight.`, index));
    }
  }
  if ((pack.items || []).length < 2) {
    warnings.push(assetGachaValidationIssue('small_pack', `Asset pack ${pack.id || '(unknown)'} has fewer than two items.`));
  }
  if (pack.slots !== undefined && !Array.isArray(pack.slots)) {
    errors.push(assetGachaValidationIssue('slots_invalid', `Asset pack ${pack.id || '(unknown)'} slots must be an array.`));
  }
  if (Array.isArray(pack.slots) && Number.isInteger(rollSize) && pack.slots.length !== rollSize) {
    errors.push(assetGachaValidationIssue('slots_length_invalid', `Asset pack ${pack.id || '(unknown)'} slots length must match rollSize.`));
  }
  if (Number.isInteger(rollSize) && rollSize > 1 && !Array.isArray(pack.slots) && !pack.rarityWeights) {
    warnings.push(assetGachaValidationIssue('slots_missing_for_multi_roll', `Asset pack ${pack.id || '(unknown)'} uses item rarity weights for every roll slot.`));
  }
  for (const [index, slot] of (Array.isArray(pack.slots) ? pack.slots : []).entries()) {
    const weights = assetGachaRarityWeightEntries(slot?.rarityWeights);
    if (!weights.length) {
      errors.push(assetGachaValidationIssue('slot_rarity_weights_missing', 'Pack roll slot needs positive rarityWeights.', index));
      continue;
    }
    for (const [rarity] of weights) {
      if (!validRarities.has(rarity)) {
        errors.push(assetGachaValidationIssue('slot_rarity_invalid', `Pack roll slot has invalid rarity ${rarity}.`, index));
      }
    }
  }
  if (pack.rarityWeights !== undefined) {
    const weights = assetGachaRarityWeightEntries(pack.rarityWeights);
    if (!weights.length) {
      errors.push(assetGachaValidationIssue('rarity_weights_missing', `Asset pack ${pack.id || '(unknown)'} rarityWeights must contain positive weights.`));
    }
    for (const [rarity] of weights) {
      if (!validRarities.has(rarity)) {
        errors.push(assetGachaValidationIssue('rarity_weights_invalid', `Asset pack ${pack.id || '(unknown)'} has invalid rarity weight ${rarity}.`));
      }
    }
  }
  const duplicatePolicy = normalizeAssetGachaDuplicatePolicy(pack, options);
  if (pack.duplicatePolicy !== undefined && !supportedDuplicateModes.has(duplicatePolicy.mode)) {
    errors.push(assetGachaValidationIssue('duplicate_policy_invalid', `Asset pack ${pack.id || '(unknown)'} has an invalid duplicatePolicy mode.`));
  }
  if (duplicatePolicy.maxCopiesPerAsset !== null && (!Number.isInteger(duplicatePolicy.maxCopiesPerAsset) || duplicatePolicy.maxCopiesPerAsset <= 0)) {
    errors.push(assetGachaValidationIssue('duplicate_copy_cap_invalid', `Asset pack ${pack.id || '(unknown)'} duplicate copy cap must be a positive integer.`));
  }
  for (const [index, item] of (pack.items || []).entries()) {
    const rawLimit = rawItemCopyLimit(item);
    if (rawLimit === undefined || rawLimit === null || rawLimit === '') continue;
    const copyLimit = optionalPositiveInteger(rawLimit);
    if (!Number.isInteger(copyLimit) || copyLimit <= 0) {
      errors.push(assetGachaValidationIssue('item_copy_cap_invalid', `Pack item ${item?.assetId || index} copy cap must be a positive integer.`, index));
    }
  }
  if (pack.guarantees !== undefined && !Array.isArray(pack.guarantees)) {
    errors.push(assetGachaValidationIssue('guarantees_invalid', `Asset pack ${pack.id || '(unknown)'} guarantees must be an array.`));
  }
  if (pack.guaranteeRules !== undefined && !Array.isArray(pack.guaranteeRules)) {
    errors.push(assetGachaValidationIssue('guarantee_rules_invalid', `Asset pack ${pack.id || '(unknown)'} guaranteeRules must be an array.`));
  }
  for (const [index, rule] of normalizeAssetGachaGuaranteeRules(pack).entries()) {
    if (!validRarities.has(rule.minRarity)) {
      errors.push(assetGachaValidationIssue('guarantee_rarity_invalid', `Asset pack ${pack.id || '(unknown)'} guarantee has invalid minRarity.`, index));
    }
    if (!Number.isInteger(rule.count) || rule.count <= 0) {
      errors.push(assetGachaValidationIssue('guarantee_count_invalid', `Asset pack ${pack.id || '(unknown)'} guarantee needs a positive count.`, index));
    }
    if (Number.isInteger(rule.count) && Number.isInteger(rollSize) && rule.count > rollSize) {
      errors.push(assetGachaValidationIssue('guarantee_count_exceeds_roll_size', `Asset pack ${pack.id || '(unknown)'} guarantee count exceeds rollSize.`, index));
    }
    if (validRarities.has(rule.minRarity) && Number.isInteger(rule.count) && guaranteeRuleEligibleCount(pack, rule.minRarity, options) < rule.count) {
      errors.push(assetGachaValidationIssue('guarantee_impossible', `Asset pack ${pack.id || '(unknown)'} does not contain enough ${rule.minRarity}+ items for its guarantee.`, index));
    }
  }
  if (pack.pityRules !== undefined && !Array.isArray(pack.pityRules)) {
    errors.push(assetGachaValidationIssue('pity_rules_invalid', `Asset pack ${pack.id || '(unknown)'} pityRules must be an array.`));
  }
  for (const [index, rule] of normalizeAssetGachaPityRules(pack).entries()) {
    if (!validRarities.has(rule.minRarity)) {
      errors.push(assetGachaValidationIssue('pity_rarity_invalid', `Asset pack ${pack.id || '(unknown)'} pity rule has invalid minRarity.`, index));
    }
    if (!Number.isInteger(rule.threshold) || rule.threshold <= 0) {
      errors.push(assetGachaValidationIssue('pity_threshold_invalid', `Asset pack ${pack.id || '(unknown)'} pity rule needs a positive threshold.`, index));
    }
    if (!Number.isInteger(rule.count) || rule.count <= 0) {
      errors.push(assetGachaValidationIssue('pity_count_invalid', `Asset pack ${pack.id || '(unknown)'} pity rule needs a positive count.`, index));
    }
    if (!supportedPityResetScopes.has(rule.resetScope)) {
      errors.push(assetGachaValidationIssue('pity_scope_invalid', `Asset pack ${pack.id || '(unknown)'} only supports pack-scoped pity in static config.`, index));
    }
    if (Number.isInteger(rule.count) && Number.isInteger(rollSize) && rule.count > rollSize) {
      errors.push(assetGachaValidationIssue('pity_count_exceeds_roll_size', `Asset pack ${pack.id || '(unknown)'} pity count exceeds rollSize.`, index));
    }
    if (validRarities.has(rule.minRarity) && Number.isInteger(rule.count) && guaranteeRuleEligibleCount(pack, rule.minRarity, options) < rule.count) {
      errors.push(assetGachaValidationIssue('pity_impossible', `Asset pack ${pack.id || '(unknown)'} does not contain enough ${rule.minRarity}+ items for its pity rule.`, index));
    }
  }
  if (pack.burnRules !== undefined && !Array.isArray(pack.burnRules)) {
    errors.push(assetGachaValidationIssue('burn_rules_invalid', `Asset pack ${pack.id || '(unknown)'} burnRules must be an array.`));
  }
  if (pack.duplicateBurnRules !== undefined && !Array.isArray(pack.duplicateBurnRules)) {
    errors.push(assetGachaValidationIssue('duplicate_burn_rules_invalid', `Asset pack ${pack.id || '(unknown)'} duplicateBurnRules must be an array.`));
  }
  for (const [index, rule] of normalizeAssetGachaBurnRules(pack).entries()) {
    if (!duplicatePolicy.enabled) {
      errors.push(assetGachaValidationIssue('burn_requires_duplicates', `Asset pack ${pack.id || '(unknown)'} burn rules require duplicatePolicy allow_duplicates.`, index));
    }
    if (!validRarities.has(rule.sourceRarity)) {
      errors.push(assetGachaValidationIssue('burn_source_rarity_invalid', `Asset pack ${pack.id || '(unknown)'} burn rule has invalid sourceRarity.`, index));
    }
    if (!validRarities.has(rule.targetMinRarity)) {
      errors.push(assetGachaValidationIssue('burn_target_rarity_invalid', `Asset pack ${pack.id || '(unknown)'} burn rule has invalid targetMinRarity.`, index));
    }
    if (!Number.isInteger(rule.sourceCount) || rule.sourceCount <= 0) {
      errors.push(assetGachaValidationIssue('burn_source_count_invalid', `Asset pack ${pack.id || '(unknown)'} burn rule needs a positive sourceCount.`, index));
    }
    if (!Number.isInteger(rule.targetCount) || rule.targetCount <= 0 || rule.targetCount > maxBurnTargetCount) {
      errors.push(assetGachaValidationIssue('burn_target_count_invalid', `Asset pack ${pack.id || '(unknown)'} burn rule targetCount must be 1-${maxBurnTargetCount}.`, index));
    }
    if (!supportedBurnTargetPolicies.has(rule.targetDuplicatePolicy)) {
      errors.push(assetGachaValidationIssue('burn_target_policy_invalid', `Asset pack ${pack.id || '(unknown)'} burn rule has invalid targetDuplicatePolicy.`, index));
    }
    if (validRarities.has(rule.sourceRarity) && (pack.items || []).filter((item) => item.rarity === rule.sourceRarity).length === 0) {
      errors.push(assetGachaValidationIssue('burn_source_impossible', `Asset pack ${pack.id || '(unknown)'} does not contain ${rule.sourceRarity} items to burn.`, index));
    }
    if (validRarities.has(rule.targetMinRarity) && Number.isInteger(rule.targetCount) && burnRuleTargetCount(pack, rule.targetMinRarity, options) < rule.targetCount) {
      errors.push(assetGachaValidationIssue('burn_target_impossible', `Asset pack ${pack.id || '(unknown)'} does not contain enough ${rule.targetMinRarity}+ target items.`, index));
    }
  }
  return {
    ok: errors.length === 0,
    errors,
    warnings
  };
}

export function getAssetGachaPackAvailability(pack, {
  now = new Date(),
  catalog = [],
  activePackIds = null,
  gachaEnabled = false,
  ...options
} = {}) {
  const validation = validateAssetGachaPack(pack, { catalog, ...options });
  if (!validation.ok) return 'invalid';
  if (pack.status === 'disabled') return 'disabled';
  if (pack.status === 'future') return 'future';
  if (pack.status === 'expired') return 'expired';
  if (pack.startsAt && new Date(pack.startsAt) > now) return 'future';
  if (pack.endsAt && new Date(pack.endsAt) <= now) return 'expired';
  if (gachaEnabled && activePackIds && !activePackIds.includes(pack.id)) return 'disabled';
  return 'active';
}

function summarizePackRarities(items) {
  const totalWeight = items.reduce((sum, item) => sum + Math.max(0, Number(item.dropWeight || 0)), 0);
  const byRarity = new Map();
  for (const item of items) {
    const rarity = item.rarity || 'common';
    const current = byRarity.get(rarity) || { rarity, count: 0, dropWeight: 0, probability: 0 };
    current.count += 1;
    current.dropWeight += Math.max(0, Number(item.dropWeight || 0));
    byRarity.set(rarity, current);
  }
  return [...byRarity.values()]
    .map((entry) => ({
      ...entry,
      probability: totalWeight > 0 ? entry.dropWeight / totalWeight : 0
    }))
    .sort((a, b) => b.dropWeight - a.dropWeight || a.rarity.localeCompare(b.rarity));
}

function summarizeSlotRarities(pack, items, options = {}) {
  const rollSize = assetGachaPackRollSize(pack);
  if (!Number.isInteger(rollSize) || rollSize < optionValue(options, 'minRollSize')) return [];
  const raritiesWithItems = new Set(items.map((item) => item.rarity || 'common'));
  const byRarity = new Map();
  for (const slot of normalizeAssetGachaPackSlots(pack, options)) {
    const weights = assetGachaRarityWeightEntries(slot.rarityWeights)
      .filter(([rarity]) => raritiesWithItems.has(rarity));
    const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
    if (total <= 0) continue;
    for (const [rarity, weight] of weights) {
      const current = byRarity.get(rarity) || {
        rarity,
        count: 0,
        dropWeight: 0,
        probability: 0,
        expectedPerOpen: 0
      };
      current.count = items.filter((item) => (item.rarity || 'common') === rarity).length;
      current.dropWeight += weight;
      current.expectedPerOpen += weight / total;
      current.probability = current.expectedPerOpen / rollSize;
      byRarity.set(rarity, current);
    }
  }
  return [...byRarity.values()]
    .sort((a, b) => b.expectedPerOpen - a.expectedPerOpen || a.rarity.localeCompare(b.rarity));
}

function normalizeAssetInstanceRows(rows = []) {
  return rows.map((row) => ({
    id: row.id,
    player_id: row.player_id,
    asset_id: row.asset_id || row.assetId,
    status: row.status,
    acquired_at: row.acquired_at || row.acquiredAt,
    metadata_json: row.metadata_json || (row.metadata ? JSON.stringify(row.metadata) : null)
  }));
}

export function activeAssetGachaCopyCounts(activeAssetRows = []) {
  const counts = new Map();
  for (const row of normalizeAssetInstanceRows(activeAssetRows)) {
    if (!row.asset_id) continue;
    counts.set(row.asset_id, (counts.get(row.asset_id) || 0) + 1);
  }
  return counts;
}

function normalizeCopyCountsInput({ activeAssetRows = [], copyCounts = null, ownedAssetIds = [] } = {}) {
  let counts = new Map();
  if (copyCounts instanceof Map) {
    counts = new Map(copyCounts);
  } else if (copyCounts && typeof copyCounts === 'object') {
    counts = new Map(Object.entries(copyCounts).map(([assetId, count]) => [assetId, Number(count || 0)]));
  } else if (activeAssetRows.length) {
    counts = activeAssetGachaCopyCounts(activeAssetRows);
  }
  const owned = ownedAssetIds instanceof Set ? ownedAssetIds : new Set(ownedAssetIds);
  for (const assetId of owned) {
    if (!counts.has(assetId)) counts.set(assetId, 1);
  }
  return counts;
}

export function assetGachaBurnableDuplicateRows(pack, activeAssetRows = [], rule, equippedInstanceIds = new Set()) {
  const packRarities = new Map((pack?.items || []).map((item) => [item.assetId, item.rarity || 'common']));
  const byAssetId = new Map();
  for (const row of normalizeAssetInstanceRows(activeAssetRows)) {
    const rarity = packRarities.get(row.asset_id);
    if (row.status !== 'active' || rarity !== rule.sourceRarity) continue;
    const rows = byAssetId.get(row.asset_id) || [];
    rows.push(row);
    byAssetId.set(row.asset_id, rows);
  }

  const burnable = [];
  for (const rows of byAssetId.values()) {
    rows.sort((a, b) => {
      const aTime = new Date(a.acquired_at || 0).getTime();
      const bTime = new Date(b.acquired_at || 0).getTime();
      return aTime - bTime || String(a.id).localeCompare(String(b.id));
    });
    const equipped = rows.find((row) => equippedInstanceIds.has(row.id));
    const retainedId = equipped?.id || rows[0]?.id || null;
    for (const row of rows) {
      if (row.id !== retainedId && !equippedInstanceIds.has(row.id)) burnable.push(row);
    }
  }
  return burnable;
}

function computePackBurnState(pack, { activeAssetRows = [], equippedInstanceIds = new Set() } = {}) {
  return normalizeAssetGachaBurnRules(pack).map((rule) => {
    const burnableCount = assetGachaBurnableDuplicateRows(pack, activeAssetRows, rule, equippedInstanceIds).length;
    return {
      ...rule,
      burnableCount,
      ready: burnableCount >= rule.sourceCount
    };
  });
}

export function shapeAssetGachaPack(pack, {
  ownedAssetIds = [],
  includeAssets = false,
  now = new Date(),
  rollHistory = [],
  activeAssetRows = [],
  equippedAssetInstanceIds = [],
  catalog = [],
  activePackIds = null,
  gachaEnabled = false,
  ...options
} = {}) {
  const catalogById = new Map(catalog.map((asset) => [asset.assetId, asset]));
  const owned = ownedAssetIds instanceof Set ? ownedAssetIds : new Set(ownedAssetIds);
  const equippedIds = equippedAssetInstanceIds instanceof Set
    ? equippedAssetInstanceIds
    : new Set(equippedAssetInstanceIds);
  const copyCounts = activeAssetGachaCopyCounts(activeAssetRows);
  const validation = validateAssetGachaPack(pack, { catalog, ...options });
  const availability = getAssetGachaPackAvailability(pack, {
    now,
    catalog,
    activePackIds,
    gachaEnabled,
    ...options
  });
  const duplicatePolicy = normalizeAssetGachaDuplicatePolicy(pack, options);
  const totalWeight = (pack.items || []).reduce((sum, item) => sum + Math.max(0, Number(item.dropWeight || 0)), 0);
  const items = (pack.items || []).map((item) => {
    const ownedCopies = copyCounts.get(item.assetId) || (owned.has(item.assetId) ? 1 : 0);
    const copyLimit = assetGachaCopyLimitForPackItem(pack, item, duplicatePolicy);
    return {
      ...item,
      ownedCopies,
      duplicateCopies: Math.max(0, ownedCopies - 1),
      copyLimit,
      copyCapped: assetGachaCopyLimitReached(ownedCopies, copyLimit),
      probability: totalWeight > 0 ? Math.max(0, Number(item.dropWeight || 0)) / totalWeight : 0,
      ...(includeAssets ? { asset: catalogById.get(item.assetId) || null } : {})
    };
  });
  const rollSize = assetGachaPackRollSize(pack);
  const normalizedRollSize = Number.isInteger(rollSize) ? rollSize : pack.rollSize;
  const ownedCount = items.filter((item) => owned.has(item.assetId)).length;
  const remainingCount = Math.max(0, items.length - ownedCount);
  const rollableCount = duplicatePolicy.enabled
    ? items.filter((item) => !item.copyCapped).length
    : remainingCount;
  const copyComplete = items.length > 0 && rollableCount === 0;
  const raritySummary = Number(normalizedRollSize) > 1
    ? summarizeSlotRarities(pack, items, options)
    : summarizePackRarities(items);
  return {
    ...pack,
    rollSize: normalizedRollSize,
    rarityTableVersion: pack.rarityTableVersion || `${pack.id || 'asset_pack'}:v1`,
    slots: normalizeAssetGachaPackSlots(pack, options),
    active: availability === 'active',
    availability,
    validation,
    totalItems: items.length,
    ownedCount,
    remainingCount,
    uniqueComplete: items.length > 0 && ownedCount >= items.length,
    copyComplete,
    duplicatePolicy,
    duplicateCopies: items.reduce((sum, item) => sum + Number(item.duplicateCopies || 0), 0),
    rollableCount,
    nextRollItemCount: Math.min(Math.max(0, Number(normalizedRollSize) || 0), rollableCount),
    complete: duplicatePolicy.enabled ? copyComplete : items.length > 0 && ownedCount >= items.length,
    totalWeight,
    raritySummary,
    guarantees: {
      rules: normalizeAssetGachaGuaranteeRules(pack)
    },
    pity: {
      resetScope: 'pack',
      rules: computeAssetGachaPackPityState(pack, { rolls: rollHistory, ...options })
    },
    burn: {
      rules: computePackBurnState(pack, { activeAssetRows, equippedInstanceIds: equippedIds })
    },
    items
  };
}

function assetRarityForPack(pack, assetId, metadataItem = null, catalog = []) {
  if (metadataItem?.rarity) return metadataItem.rarity;
  const packItem = (pack?.items || []).find((item) => item.assetId === assetId);
  if (packItem?.rarity) return packItem.rarity;
  return (catalog || []).find((asset) => asset.assetId === assetId)?.rarity || 'common';
}

function rowResultAssetIds(row) {
  if (Array.isArray(row?.resultAssetIds)) return row.resultAssetIds;
  if (Array.isArray(row?.result_asset_ids_json)) return row.result_asset_ids_json;
  if (typeof row?.result_asset_ids_json === 'string') {
    try {
      return JSON.parse(row.result_asset_ids_json);
    } catch {
      return [];
    }
  }
  return [];
}

function rowMetadata(row) {
  if (row?.metadata && typeof row.metadata === 'object') return row.metadata;
  if (row?.metadata_json && typeof row.metadata_json === 'object') return row.metadata_json;
  if (typeof row?.metadata_json === 'string') {
    try {
      return JSON.parse(row.metadata_json);
    } catch {
      return {};
    }
  }
  return {};
}

function rollHasMinimumRarity(pack, row, minRarity, count = 1, options = {}) {
  const metadata = rowMetadata(row);
  const metadataItems = Array.isArray(metadata.results) ? metadata.results : [];
  const matches = rowResultAssetIds(row).filter((assetId, index) => {
    const metadataItem = metadataItems.find((entry) => entry.assetId === assetId) || metadataItems[index] || null;
    return assetGachaRarityAtLeast(assetRarityForPack(pack, assetId, metadataItem, options.catalog || []), minRarity, options);
  });
  return matches.length >= count;
}

function sortedRollHistory(rolls = []) {
  return [...rolls].sort((a, b) => {
    const aTime = new Date(a.created_at || a.createdAt || 0).getTime();
    const bTime = new Date(b.created_at || b.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

export function computeAssetGachaPackPityState(pack, {
  rolls = [],
  ...options
} = {}) {
  const history = sortedRollHistory(rolls);
  return normalizeAssetGachaPityRules(pack).map((rule) => {
    let currentMisses = 0;
    for (const roll of history) {
      if (rollHasMinimumRarity(pack, roll, rule.minRarity, rule.count, options)) break;
      currentMisses += 1;
    }
    const remaining = Math.max(1, rule.threshold - currentMisses);
    return {
      ...rule,
      currentMisses,
      remaining,
      active: remaining <= 1
    };
  });
}

export function advanceAssetGachaPackPityState(pityBefore, selectedItems, options = {}) {
  return (pityBefore || []).map((rule) => {
    const hitCount = selectedItems.filter((item) => assetGachaRarityAtLeast(item.rarity, rule.minRarity, options)).length;
    const currentMisses = hitCount >= rule.count ? 0 : rule.currentMisses + 1;
    return {
      ...rule,
      currentMisses,
      remaining: Math.max(1, rule.threshold - currentMisses),
      active: Math.max(1, rule.threshold - currentMisses) <= 1
    };
  });
}

export function chooseWeightedAssetGachaCandidate(candidates, rng) {
  const total = candidates.reduce((sum, candidate) => sum + Math.max(0, Number(candidate.dropWeight || 0)), 0);
  if (total <= 0) throw new Error('Gacha pack has no weighted candidates');
  let target = rng() * total;
  for (const candidate of candidates) {
    target -= Math.max(0, Number(candidate.dropWeight || 0));
    if (target < 0) return candidate;
  }
  return candidates[candidates.length - 1];
}

function chooseWeightedRarity(rarityWeights, candidates, rng) {
  const raritiesWithCandidates = new Set(candidates.map((candidate) => candidate.rarity || 'common'));
  const entries = assetGachaRarityWeightEntries(rarityWeights)
    .filter(([rarity]) => raritiesWithCandidates.has(rarity));
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (total <= 0) return null;
  let target = rng() * total;
  for (const [rarity, weight] of entries) {
    target -= weight;
    if (target < 0) return rarity;
  }
  return entries[entries.length - 1]?.[0] || null;
}

function activeRollGuaranteeRules(pack, pityState = []) {
  const activePityRules = (pityState || [])
    .filter((rule) => rule.active)
    .map((rule) => ({
      id: rule.id,
      type: 'min_rarity_count',
      source: 'pity',
      minRarity: rule.minRarity,
      count: rule.count,
      label: rule.label || null
    }));
  return [
    ...normalizeAssetGachaGuaranteeRules(pack),
    ...activePityRules
  ];
}

function lowestReplaceableSelectionIndex(selected, minRarity, options = {}) {
  let replaceIndex = -1;
  let lowestRank = Number.POSITIVE_INFINITY;
  for (const [index, item] of selected.entries()) {
    const rank = assetGachaRarityRank(item.rarity, options);
    if (rank < assetGachaRarityRank(minRarity, options) && rank < lowestRank) {
      lowestRank = rank;
      replaceIndex = index;
    }
  }
  return replaceIndex;
}

function applyGuaranteeRules(selectedItems, candidates, rules, rng, options = {}) {
  const selected = selectedItems.map((item) => ({ ...item }));
  const applications = [];
  for (const rule of rules) {
    let matchingCount = selected.filter((item) => assetGachaRarityAtLeast(item.rarity, rule.minRarity, options)).length;
    const maxEligibleCount = candidates.filter((candidate) => assetGachaRarityAtLeast(candidate.rarity, rule.minRarity, options)).length;
    const targetCount = Math.min(rule.count, maxEligibleCount, selected.length);
    while (matchingCount < targetCount) {
      const selectedAssetIds = new Set(selected.map((item) => item.assetId));
      const eligibleCandidates = candidates.filter((candidate) =>
        !selectedAssetIds.has(candidate.assetId) && assetGachaRarityAtLeast(candidate.rarity, rule.minRarity, options)
      );
      if (!eligibleCandidates.length) break;
      const replaceIndex = lowestReplaceableSelectionIndex(selected, rule.minRarity, options);
      if (replaceIndex < 0) break;
      const replaced = selected[replaceIndex];
      const selectedCandidate = chooseWeightedAssetGachaCandidate(eligibleCandidates, rng);
      selected[replaceIndex] = {
        ...selectedCandidate,
        slotIndex: replaced.slotIndex,
        selectedRarity: selectedCandidate.rarity || rule.minRarity,
        asset: selectedCandidate.asset,
        guaranteeId: rule.id,
        guaranteeSource: rule.source,
        guaranteeMinRarity: rule.minRarity,
        guaranteeReplacedAssetId: replaced.assetId,
        slotRarityWeights: replaced.slotRarityWeights,
        candidatePoolHash: hashAssetGachaCandidatePool(candidates)
      };
      applications.push({
        id: rule.id,
        source: rule.source,
        minRarity: rule.minRarity,
        count: rule.count,
        slotIndex: replaced.slotIndex,
        replacedAssetId: replaced.assetId,
        selectedAssetId: selectedCandidate.assetId
      });
      matchingCount += 1;
    }
  }
  selected.sort((a, b) => a.slotIndex - b.slotIndex);
  Object.defineProperty(selected, 'guaranteeApplications', {
    enumerable: false,
    configurable: true,
    value: applications
  });
  return selected;
}

export function selectAssetGachaRollResults(candidates, pack, {
  rng,
  pityState = [],
  ...options
} = {}) {
  if (typeof rng !== 'function') throw new Error('Asset gacha roll requires an RNG function');
  const rollSize = assetGachaPackRollSize(pack);
  const minRollSize = optionValue(options, 'minRollSize');
  const maxRollSize = optionValue(options, 'maxRollSize');
  if (!Number.isInteger(rollSize) || rollSize < minRollSize || rollSize > maxRollSize) {
    throw new Error('Asset pack rollSize is invalid');
  }
  const remaining = [...candidates];
  const slots = normalizeAssetGachaPackSlots(pack, options);
  const selected = [];
  for (let slotIndex = 0; slotIndex < rollSize && remaining.length; slotIndex += 1) {
    const slot = slots[slotIndex] || { slotIndex, rarityWeights: defaultAssetGachaRarityWeightsForItems(remaining) };
    const selectedRarity = chooseWeightedRarity(slot.rarityWeights, remaining, rng);
    const slotCandidates = selectedRarity
      ? remaining.filter((candidate) => (candidate.rarity || 'common') === selectedRarity)
      : remaining;
    const selectedItem = chooseWeightedAssetGachaCandidate(slotCandidates.length ? slotCandidates : remaining, rng);
    selected.push({
      slotIndex,
      selectedRarity: selectedRarity || selectedItem.rarity || null,
      assetId: selectedItem.assetId,
      rarity: selectedItem.rarity || selectedItem.asset?.rarity || null,
      dropWeight: selectedItem.dropWeight,
      asset: selectedItem.asset,
      slotRarityWeights: slot.rarityWeights,
      candidatePoolHash: hashAssetGachaCandidatePool(remaining)
    });
    const selectedIndex = remaining.findIndex((candidate) => candidate.assetId === selectedItem.assetId);
    if (selectedIndex >= 0) remaining.splice(selectedIndex, 1);
  }
  return applyGuaranteeRules(selected, candidates, activeRollGuaranteeRules(pack, pityState), rng, options);
}

export function resolveAssetGachaRollCandidates(pack, {
  ownedAssetIds = [],
  activeAssetRows = [],
  copyCounts = null,
  includeOwned = normalizeAssetGachaDuplicatePolicy(pack).enabled,
  catalog = [],
  ...options
} = {}) {
  const catalogById = new Map(catalog.map((asset) => [asset.assetId, asset]));
  const owned = ownedAssetIds instanceof Set ? ownedAssetIds : new Set(ownedAssetIds);
  const duplicatePolicy = normalizeAssetGachaDuplicatePolicy(pack, options);
  const activeCounts = normalizeCopyCountsInput({ activeAssetRows, copyCounts, ownedAssetIds: owned });
  return (pack?.items || [])
    .map((item) => {
      const ownedCopies = activeCounts.get(item.assetId) || 0;
      const copyLimit = assetGachaCopyLimitForPackItem(pack, item, duplicatePolicy);
      return {
        ...item,
        ownedCopies,
        copyLimit,
        copyCapped: assetGachaCopyLimitReached(ownedCopies, copyLimit),
        asset: catalogById.get(item.assetId) || null
      };
    })
    .filter((item) => {
      if (!item.asset) return false;
      if (!duplicatePolicy.enabled) return !owned.has(item.assetId);
      if (!includeOwned && owned.has(item.assetId)) return false;
      return !item.copyCapped;
    });
}

export function hashAssetGachaCandidatePool(candidates) {
  const payload = JSON.stringify(candidates.map((candidate) => ({
    assetId: candidate.asset?.assetId || candidate.assetId,
    dropWeight: candidate.dropWeight,
    rarity: candidate.rarity
  })));
  let hash = 0x811c9dc5;
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function burnTargetCandidates(pack, rule, {
  ownedAssetIds = new Set(),
  copyCounts = new Map(),
  selectedAssetIds = new Set(),
  catalog = [],
  ...options
} = {}) {
  const catalogById = new Map(catalog.map((asset) => [asset.assetId, asset]));
  const duplicatePolicy = normalizeAssetGachaDuplicatePolicy(pack, options);
  return (pack?.items || [])
    .filter((item) => assetGachaRarityAtLeast(item.rarity, rule.targetMinRarity, options))
    .filter((item) => !selectedAssetIds.has(item.assetId))
    .map((item) => {
      const ownedCopies = copyCounts.get(item.assetId) || (ownedAssetIds.has(item.assetId) ? 1 : 0);
      const copyLimit = assetGachaCopyLimitForPackItem(pack, item, duplicatePolicy);
      return {
        ...item,
        ownedCopies,
        copyLimit,
        copyCapped: assetGachaCopyLimitReached(ownedCopies, copyLimit),
        asset: catalogById.get(item.assetId) || null
      };
    })
    .filter((item) => item.asset && !item.copyCapped);
}

export function selectAssetGachaBurnTargets(pack, rule, {
  rng,
  ownedAssetIds = [],
  activeAssetRows = [],
  copyCounts = null,
  catalog = [],
  ...options
} = {}) {
  if (typeof rng !== 'function') throw new Error('Asset gacha burn target selection requires an RNG function');
  const selected = [];
  const owned = ownedAssetIds instanceof Set ? new Set(ownedAssetIds) : new Set(ownedAssetIds);
  const activeCounts = normalizeCopyCountsInput({ activeAssetRows, copyCounts, ownedAssetIds: owned });
  const selectedAssetIds = new Set();
  for (let index = 0; index < rule.targetCount; index += 1) {
    const candidates = burnTargetCandidates(pack, rule, {
      ownedAssetIds: owned,
      copyCounts: activeCounts,
      selectedAssetIds,
      catalog,
      ...options
    });
    const unownedCandidates = candidates.filter((candidate) => !owned.has(candidate.assetId));
    const pool = rule.targetDuplicatePolicy === 'unowned_only'
      ? unownedCandidates
      : (rule.targetDuplicatePolicy === 'unowned_first' && unownedCandidates.length
        ? unownedCandidates
        : candidates);
    if (!pool.length) break;
    const selectedItem = chooseWeightedAssetGachaCandidate(pool, rng);
    selected.push({
      slotIndex: index,
      selectedRarity: selectedItem.rarity || rule.targetMinRarity,
      assetId: selectedItem.assetId,
      rarity: selectedItem.rarity || selectedItem.asset?.rarity || null,
      dropWeight: selectedItem.dropWeight,
      asset: selectedItem.asset,
      candidatePoolHash: hashAssetGachaCandidatePool(pool)
    });
    selectedAssetIds.add(selectedItem.assetId);
    owned.add(selectedItem.assetId);
    activeCounts.set(selectedItem.assetId, (activeCounts.get(selectedItem.assetId) || 0) + 1);
  }
  return selected;
}

export function evaluateAssetAcquisitionPolicy(asset, {
  gachaEnabled = false,
  directBuyPolicy = 'allow',
  pack = null,
  packAvailability = null
} = {}) {
  if (!asset) return null;
  const activePack = packAvailability === 'active' || Boolean(pack?.active);
  const directBase = asset.acquisitionMode === 'direct' || asset.acquisitionMode === 'both';
  const blockedByGacha = gachaEnabled &&
    directBuyPolicy === 'block_gacha_assets' &&
    activePack &&
    (asset.acquisitionMode === 'gacha' || asset.acquisitionMode === 'both');
  return {
    acquisitionMode: asset.acquisitionMode,
    purchaseAvailable: directBase && !blockedByGacha,
    rollAvailable: gachaEnabled && activePack && (asset.acquisitionMode === 'gacha' || asset.acquisitionMode === 'both'),
    gachaEnabled,
    directBuyPolicy,
    activePackId: activePack ? pack?.id || asset.packId || null : null
  };
}
