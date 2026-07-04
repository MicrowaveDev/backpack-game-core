import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAssetGachaSimulationRng,
  normalizeAssetGachaSimulationTrials,
  simulateAssetGachaPackOdds
} from '../src/modules/gacha/simulation.js';

const catalog = [
  { assetId: 'skin.common', rarity: 'common', slot: 'portrait', targetType: 'character', targetId: 'a', variantId: 'common', name: { en: 'Common' }, price: 1, currencyCode: 'soft_coin' },
  { assetId: 'skin.common_b', rarity: 'common', slot: 'portrait', targetType: 'character', targetId: 'b', variantId: 'common_b', name: { en: 'Common B' }, price: 1, currencyCode: 'soft_coin' },
  { assetId: 'skin.rare', rarity: 'rare', slot: 'portrait', targetType: 'character', targetId: 'a', variantId: 'rare', name: { en: 'Rare' }, price: 2, currencyCode: 'soft_coin' },
  { assetId: 'skin.epic', rarity: 'epic', slot: 'portrait', targetType: 'character', targetId: 'b', variantId: 'epic', name: { en: 'Epic' }, price: 3, currencyCode: 'soft_coin' }
];

function pack(overrides = {}) {
  return {
    id: 'starter_pack',
    seasonId: 'season_1',
    collectionId: 'portraits',
    name: { en: 'Starter' },
    status: 'active',
    active: true,
    rollPriceCurrencyCode: 'soft_coin',
    rollPriceAmount: 10,
    rollSize: 1,
    items: [
      { assetId: 'skin.common', rarity: 'common', dropWeight: 1 },
      { assetId: 'skin.rare', rarity: 'rare', dropWeight: 3 }
    ],
    ...overrides
  };
}

test('[gacha-simulation] simulates weighted single-roll odds with expected probability', () => {
  const sequence = [0, 0.24, 0.25, 0.99];
  let index = 0;
  const result = simulateAssetGachaPackOdds(pack(), {
    catalog,
    odds: { active: true },
    trials: sequence.length,
    rng: () => sequence[index++ % sequence.length]
  });

  assert.equal(result.rollable, true);
  assert.equal(result.totalWeight, 4);
  assert.equal(result.candidateCount, 2);
  assert.deepEqual(result.warnings, []);
  assert.equal(result.seed, null);

  const common = result.items.find((item) => item.assetId === 'skin.common');
  const rare = result.items.find((item) => item.assetId === 'skin.rare');
  assert.equal(common.expectedProbability, 0.25);
  assert.equal(rare.expectedProbability, 0.75);
  assert.equal(common.observedCount, 2);
  assert.equal(rare.observedCount, 2);
  assert.equal(result.raritySummary.find((row) => row.rarity === 'common').observedPerRoll, 0.5);
});

test('[gacha-simulation] reports owned and missing candidate warnings', () => {
  const result = simulateAssetGachaPackOdds(pack({
    items: [
      { assetId: 'skin.common', rarity: 'common', dropWeight: 1 },
      { assetId: 'skin.rare', rarity: 'rare', dropWeight: 3 },
      { assetId: 'missing.asset', rarity: 'secret', dropWeight: 100 }
    ]
  }), {
    catalog,
    trials: 8,
    ownedAssetIds: ['skin.common'],
    seed: 'owned-filter'
  });

  assert.equal(result.candidateCount, 1);
  assert.equal(result.items[0].assetId, 'skin.rare');
  assert.equal(result.items[0].expectedProbability, 1);
  assert.ok(result.warnings.find((entry) => entry.code === 'owned_items_excluded'));
  assert.ok(result.warnings.find((entry) => entry.code === 'missing_asset_items'));
});

test('[gacha-simulation] includes duplicate-enabled owned items and respects copy caps', () => {
  const duplicatePack = pack({
    duplicatePolicy: { mode: 'allow_duplicates', maxCopiesPerAsset: 2 }
  });
  const result = simulateAssetGachaPackOdds(duplicatePack, {
    catalog,
    trials: 4,
    ownedAssetIds: ['skin.common', 'skin.rare'],
    ownedCopyCounts: {
      'skin.common': 2,
      'skin.rare': 1
    },
    rng: () => 0
  });

  assert.equal(result.duplicatePolicy.enabled, true);
  assert.equal(result.duplicatePolicy.maxCopiesPerAsset, 2);
  assert.equal(result.candidateCount, 1);
  assert.equal(result.items[0].assetId, 'skin.rare');
  assert.equal(result.items[0].ownedCopies, 1);
  assert.equal(result.items[0].copyCapped, false);
  assert.ok(result.warnings.find((entry) => entry.code === 'owned_items_included_as_duplicates'));
});

test('[gacha-simulation] supports multi-slot rolls and guarantees', () => {
  const result = simulateAssetGachaPackOdds(pack({
    rollSize: 2,
    slots: [
      { rarityWeights: { common: 1 } },
      { rarityWeights: { common: 1 } }
    ],
    guarantees: [
      { id: 'one_rare_plus', minRarity: 'rare', count: 1 }
    ],
    items: [
      { assetId: 'skin.common', rarity: 'common', dropWeight: 1 },
      { assetId: 'skin.common_b', rarity: 'common', dropWeight: 1 },
      { assetId: 'skin.rare', rarity: 'rare', dropWeight: 1 }
    ]
  }), {
    catalog,
    trials: 3,
    rng: () => 0
  });

  assert.equal(result.rollSize, 2);
  assert.equal(result.averageItemsPerRoll, 2);
  assert.equal(result.guarantees.supported, true);
  assert.equal(result.items.find((item) => item.assetId === 'skin.rare').expectedProbability, null);
  assert.equal(result.raritySummary.find((row) => row.rarity === 'rare').observedCount, 3);
});

test('[gacha-simulation] validates trial limits and creates deterministic seed RNGs', () => {
  assert.equal(normalizeAssetGachaSimulationTrials(undefined), 10_000);
  assert.equal(normalizeAssetGachaSimulationTrials(0), 10_000);
  assert.throws(() => normalizeAssetGachaSimulationTrials(-1), /positive integer/);
  assert.throws(() => normalizeAssetGachaSimulationTrials(2, { maxTrials: 1 }), /cannot exceed 1/);

  const first = createAssetGachaSimulationRng('same-seed');
  const second = createAssetGachaSimulationRng('same-seed');
  assert.equal(first(), second());
});
