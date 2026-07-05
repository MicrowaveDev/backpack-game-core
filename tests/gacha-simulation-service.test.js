import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAssetGachaSimulationService,
  createRuntimeAssetGachaSimulationService,
  createStaticAssetGachaSimulationService,
  simulateResolvedAssetPackOdds
} from '../src/modules/gacha/simulation-service.js';

const catalog = [
  { assetId: 'skin.common', rarity: 'common', slot: 'portrait', targetType: 'character', targetId: 'a', variantId: 'common' },
  { assetId: 'skin.rare', rarity: 'rare', slot: 'portrait', targetType: 'character', targetId: 'a', variantId: 'rare' }
];

function pack(overrides = {}) {
  return {
    id: 'starter_pack',
    status: 'active',
    active: true,
    rollSize: 1,
    items: [
      { assetId: 'skin.common', rarity: 'common', dropWeight: 1 },
      { assetId: 'skin.rare', rarity: 'rare', dropWeight: 3 }
    ],
    ...overrides
  };
}

test('[gacha-simulation-service] simulates static packs through injected providers', () => {
  const service = createAssetGachaSimulationService({
    getStaticPack: (packId) => packId === 'starter_pack' ? pack() : null,
    getStaticCatalog: () => catalog,
    getStaticPackOdds: (resolvedPack) => ({ active: resolvedPack.active })
  });
  const sequence = [0, 0.99];
  let index = 0;
  const result = service.simulateAssetPackOdds('starter_pack', {
    trials: 2,
    rng: () => sequence[index++ % sequence.length]
  });

  assert.equal(result.source, 'static');
  assert.equal(result.packId, 'starter_pack');
  assert.equal(result.active, true);
  assert.equal(result.candidateCount, 2);
  assert.equal(result.items.find((item) => item.assetId === 'skin.common').observedCount, 1);
  assert.equal(result.items.find((item) => item.assetId === 'skin.rare').observedCount, 1);
});

test('[gacha-simulation-service] simulates runtime packs through async providers', async () => {
  const service = createAssetGachaSimulationService({
    getRuntimePack: async (packId) => packId === 'runtime_pack' ? pack({ id: 'runtime_pack', source: 'database' }) : null,
    getRuntimeCatalog: async ({ planAssetVisibility }) => {
      assert.equal(planAssetVisibility, 'all');
      return catalog;
    },
    shapeRuntimePackOdds: async (resolvedPack, { includeAssets }) => ({
      active: resolvedPack.active,
      includeAssets
    })
  });

  const result = await service.simulateRuntimeAssetPackOdds('runtime_pack', {
    planAssetVisibility: 'all',
    trials: 1,
    rng: () => 0
  });

  assert.equal(result.source, 'database');
  assert.equal(result.packId, 'runtime_pack');
  assert.equal(result.active, true);
  assert.equal(result.items.find((item) => item.assetId === 'skin.common').observedCount, 1);
});

test('[gacha-simulation-service] convenience constructors map product provider names', async () => {
  const staticService = createStaticAssetGachaSimulationService({
    getPack: () => pack(),
    getCatalog: () => catalog,
    getPackOdds: () => ({ active: true })
  });
  assert.equal(staticService.simulateAssetPackOdds('starter_pack', { trials: 1, rng: () => 0 }).active, true);

  const runtimeService = createRuntimeAssetGachaSimulationService({
    getPack: async () => pack({ source: 'runtime' }),
    getCatalog: async () => catalog,
    shapePackOdds: async () => ({ active: true })
  });
  assert.equal((await runtimeService.simulateRuntimeAssetPackOdds('runtime_pack', { trials: 1, rng: () => 0 })).active, true);
});

test('[gacha-simulation-service] reports missing providers and missing packs as service errors', async () => {
  assert.throws(
    () => createAssetGachaSimulationService().simulateAssetPackOdds('missing'),
    /requires getStaticPack/
  );
  assert.throws(
    () => createAssetGachaSimulationService({
      getStaticPack: () => null,
      getStaticCatalog: () => catalog
    }).simulateAssetPackOdds('missing'),
    /Unknown asset pack/
  );
  await assert.rejects(
    () => createAssetGachaSimulationService({
      getRuntimePack: async () => null,
      getRuntimeCatalog: async () => catalog
    }).simulateRuntimeAssetPackOdds('missing'),
    /Unknown asset pack/
  );
});

test('[gacha-simulation-service] direct resolved simulation remains available', () => {
  const result = simulateResolvedAssetPackOdds(pack(), {
    catalog,
    odds: { active: true },
    trials: 1,
    rng: () => 0,
    source: 'preview'
  });

  assert.equal(result.source, 'preview');
  assert.equal(result.items.find((item) => item.assetId === 'skin.common').observedCount, 1);
});
