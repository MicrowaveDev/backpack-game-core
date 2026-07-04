import {
  chooseWeightedAssetGachaCandidate,
  normalizeAssetGachaDuplicatePolicy,
  resolveAssetGachaRollCandidates,
  selectAssetGachaRollResults
} from '../../asset-gacha.js';
import { createSeededRng } from '../../rng.js';

export const DEFAULT_ASSET_GACHA_SIMULATION_TRIALS = 10_000;
export const DEFAULT_ASSET_GACHA_SIMULATION_MAX_TRIALS = 1_000_000;

function simulationError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

export function normalizeAssetGachaSimulationTrials(value, {
  defaultTrials = DEFAULT_ASSET_GACHA_SIMULATION_TRIALS,
  maxTrials = DEFAULT_ASSET_GACHA_SIMULATION_MAX_TRIALS
} = {}) {
  const trials = Number(value || defaultTrials);
  if (!Number.isInteger(trials) || trials <= 0) {
    throw simulationError('Simulation trials must be a positive integer', 400);
  }
  if (trials > maxTrials) {
    throw simulationError(`Simulation trials cannot exceed ${maxTrials}`, 400);
  }
  return trials;
}

export function hashAssetGachaSimulationSeed(seedInput = 'asset-pack-simulation') {
  const value = String(seedInput || 'asset-pack-simulation');
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash || 1;
}

export function createAssetGachaSimulationRng(seedInput) {
  return createSeededRng(hashAssetGachaSimulationSeed(seedInput));
}

function warning(code, message, details = {}) {
  return { code, message, ...details };
}

function candidateWeight(candidate) {
  const weight = Number(candidate?.dropWeight || 0);
  return Number.isFinite(weight) ? Math.max(0, weight) : 0;
}

function configuredGuarantees(pack) {
  if (Array.isArray(pack?.guarantees)) return pack.guarantees;
  if (Array.isArray(pack?.guaranteeRules)) return pack.guaranteeRules;
  return [];
}

function configuredPityRules(pack) {
  return Array.isArray(pack?.pityRules) ? pack.pityRules : [];
}

function duplicatePolicyEnabled(pack, options = {}) {
  return normalizeAssetGachaDuplicatePolicy(pack, options).enabled;
}

function summarizeRarities(items, trials) {
  const byRarity = new Map();
  for (const item of items) {
    const rarity = item.rarity || 'unknown';
    const current = byRarity.get(rarity) || {
      rarity,
      candidateCount: 0,
      expectedProbability: 0,
      observedProbability: 0,
      observedPerRoll: 0,
      observedCount: 0
    };
    current.candidateCount += 1;
    current.expectedProbability += item.expectedProbability || 0;
    current.observedCount += item.observedCount;
    current.observedProbability = current.observedCount / trials;
    current.observedPerRoll = current.observedProbability;
    byRarity.set(rarity, current);
  }
  return Array.from(byRarity.values());
}

function assetByIdFromCatalog(catalog, assetId) {
  return (catalog || []).find((asset) => asset.assetId === assetId) || null;
}

function shapedAssetForSimulation(asset) {
  if (!asset) return null;
  return {
    slot: asset.slot,
    targetType: asset.targetType,
    targetId: asset.targetId,
    variantId: asset.variantId,
    name: asset.name,
    price: asset.price,
    currencyCode: asset.currencyCode
  };
}

export function simulateAssetGachaPackOdds(pack, {
  catalog = [],
  odds = {},
  trials = DEFAULT_ASSET_GACHA_SIMULATION_TRIALS,
  seed = null,
  rng = null,
  ownedAssetIds = [],
  ownedCopyCounts = null,
  pityState = [],
  source = 'static',
  ...options
} = {}) {
  if (!pack) throw simulationError('Asset gacha simulation requires a pack', 400);
  const trialCount = normalizeAssetGachaSimulationTrials(trials, options);
  const seedValue = seed || `${pack.id}:${trialCount}`;
  const random = rng || createAssetGachaSimulationRng(seedValue);
  const owned = ownedAssetIds instanceof Set ? ownedAssetIds : new Set(ownedAssetIds);
  const warnings = [];

  const missingAssetIds = (pack.items || [])
    .filter((item) => !assetByIdFromCatalog(catalog, item.assetId))
    .map((item) => item.assetId);
  if (missingAssetIds.length) {
    warnings.push(warning(
      'missing_asset_items',
      'Some pack items do not resolve to catalog assets and cannot roll.',
      { assetIds: missingAssetIds }
    ));
  }

  const duplicatesEnabled = duplicatePolicyEnabled(pack, options);
  const ownedPackAssetIds = (pack.items || [])
    .filter((item) => owned.has(item.assetId) && assetByIdFromCatalog(catalog, item.assetId) && !duplicatesEnabled)
    .map((item) => item.assetId);
  if (ownedPackAssetIds.length) {
    warnings.push(warning(
      'owned_items_excluded',
      'Owned pack assets are excluded because duplicate inventory is not enabled yet.',
      { assetIds: ownedPackAssetIds }
    ));
  }
  const includedOwnedAssetIds = duplicatesEnabled
    ? (pack.items || [])
      .filter((item) => owned.has(item.assetId) && assetByIdFromCatalog(catalog, item.assetId))
      .map((item) => item.assetId)
    : [];
  if (includedOwnedAssetIds.length) {
    warnings.push(warning(
      'owned_items_included_as_duplicates',
      'Owned pack assets remain rollable because duplicate inventory is enabled for this pack.',
      { assetIds: includedOwnedAssetIds }
    ));
  }

  const candidates = resolveAssetGachaRollCandidates(pack, {
    ...options,
    ownedAssetIds: owned,
    copyCounts: ownedCopyCounts,
    catalog
  });
  const guaranteeRules = configuredGuarantees(pack);
  const pityRules = configuredPityRules(pack);
  const hasGuaranteedSelection = guaranteeRules.length > 0 || pityState.some((rule) => rule?.active);
  const totalWeight = candidates.reduce((sum, candidate) => sum + candidateWeight(candidate), 0);
  const zeroWeightAssetIds = candidates
    .filter((candidate) => candidateWeight(candidate) <= 0)
    .map((candidate) => candidate.assetId);
  if (zeroWeightAssetIds.length) {
    warnings.push(warning(
      'zero_weight_candidates',
      'Some unowned candidates have no positive weight and should not appear in simulation results.',
      { assetIds: zeroWeightAssetIds }
    ));
  }

  const counts = new Map(candidates.map((candidate) => [candidate.assetId, 0]));
  if (!candidates.length) {
    warnings.push(warning('no_unowned_candidates', 'No unowned assets are available for this pack.'));
  } else if (totalWeight <= 0) {
    warnings.push(warning('no_weighted_candidates', 'No unowned candidates have positive drop weight.'));
  } else if (Number(pack.rollSize || 1) === 1 && !hasGuaranteedSelection) {
    for (let index = 0; index < trialCount; index += 1) {
      const selected = chooseWeightedAssetGachaCandidate(candidates, random);
      counts.set(selected.assetId, (counts.get(selected.assetId) || 0) + 1);
    }
  } else {
    for (let index = 0; index < trialCount; index += 1) {
      const selectedItems = selectAssetGachaRollResults(candidates, pack, {
        ...options,
        rng: random,
        pityState
      });
      for (const selected of selectedItems) {
        counts.set(selected.assetId, (counts.get(selected.assetId) || 0) + 1);
      }
    }
  }
  const totalObservedSelections = [...counts.values()].reduce((sum, count) => sum + count, 0);
  const averageItemsPerRoll = totalObservedSelections / trialCount;

  const items = candidates.map((candidate) => {
    const weight = candidateWeight(candidate);
    const observedCount = counts.get(candidate.assetId) || 0;
    const expectedProbability = !hasGuaranteedSelection && Number(pack.rollSize || 1) === 1 && totalWeight > 0
      ? weight / totalWeight
      : null;
    const observedProbability = observedCount / trialCount;
    return {
      assetId: candidate.assetId,
      rarity: candidate.rarity || candidate.asset?.rarity || null,
      dropWeight: weight,
      ownedCopies: Number(candidate.ownedCopies || 0),
      copyLimit: candidate.copyLimit ?? null,
      copyCapped: Boolean(candidate.copyCapped),
      expectedProbability,
      observedProbability,
      observedPerRoll: observedProbability,
      observedCount,
      delta: expectedProbability === null ? null : observedProbability - expectedProbability,
      asset: shapedAssetForSimulation(candidate.asset)
    };
  });

  const normalizedDuplicatePolicy = normalizeAssetGachaDuplicatePolicy(pack, options);
  return {
    packId: pack.id,
    source,
    seasonId: pack.seasonId,
    collectionId: pack.collectionId,
    name: pack.name,
    status: pack.status,
    active: Boolean(odds.active ?? pack.active),
    rollPriceCurrencyCode: pack.rollPriceCurrencyCode,
    rollPriceAmount: pack.rollPriceAmount,
    rollSize: pack.rollSize,
    averageItemsPerRoll,
    trials: trialCount,
    seed: rng ? null : seedValue,
    candidateCount: candidates.length,
    weightedCandidateCount: candidates.filter((candidate) => candidateWeight(candidate) > 0).length,
    totalWeight,
    duplicatePolicy: {
      enabled: duplicatesEnabled,
      maxCopiesPerAsset: odds.duplicatePolicy?.maxCopiesPerAsset ?? normalizedDuplicatePolicy.maxCopiesPerAsset ?? null
    },
    rollable: candidates.length > 0 && totalWeight > 0,
    guarantees: {
      supported: guaranteeRules.length > 0,
      configured: guaranteeRules,
      note: guaranteeRules.length
        ? 'Configured guarantees are applied after the weighted slot draw and before pity state is advanced.'
        : 'No per-opening guarantees are configured for this pack.'
    },
    pity: {
      supported: pityRules.length > 0,
      configured: pityRules,
      simulatedState: pityState,
      note: pityRules.length
        ? 'Pack-scoped pity is runtime state from previous rolls; pass pityState to simulate an active counter.'
        : 'No pity rules are configured for this pack.'
    },
    warnings,
    raritySummary: summarizeRarities(items, trialCount),
    items
  };
}
