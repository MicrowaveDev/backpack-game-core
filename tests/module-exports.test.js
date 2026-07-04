import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveAssetGachaRollCandidates,
  selectAssetGachaRollResults,
  shapeAssetGachaPack,
  validateAssetGachaPack
} from '@microwavedev/backpack-game-core/modules/gacha';
import {
  assetGachaPackRollSize,
  validateAssetGachaPack as validateAssetGachaPackOnly
} from '@microwavedev/backpack-game-core/modules/gacha/validation';
import {
  createGachaAdminReleaseChecklist,
  normalizeGachaAdminFixture
} from '@microwavedev/backpack-game-core/modules/gacha/admin-validation';
import * as gachaInterface from '@microwavedev/backpack-game-core/modules/gacha/interface';
import { generateShopOffer } from '@microwavedev/backpack-game-core/modules/shop';
import {
  createLoadoutValidator,
  getEffectiveShape,
  pieceCells
} from '@microwavedev/backpack-game-core/modules/loadout';
import {
  createSeededRng,
  simulateBattle
} from '@microwavedev/backpack-game-core/modules/battle';
import { findFusionMatches } from '@microwavedev/backpack-game-core/modules/fusion';

const catalog = [
  { assetId: 'skin.a', rarity: 'common', acquisitionMode: 'gacha', packId: 'starter' },
  { assetId: 'skin.b', rarity: 'rare', acquisitionMode: 'gacha', packId: 'starter' }
];

const pack = {
  id: 'starter',
  seasonId: 'season_1',
  collectionId: 'skins',
  status: 'active',
  rollPriceCurrencyCode: 'soft_coin',
  rollPriceAmount: 10,
  rollSize: 1,
  rarityTableVersion: 'starter:v1',
  items: [
    { assetId: 'skin.a', rarity: 'common', dropWeight: 100 },
    { assetId: 'skin.b', rarity: 'rare', dropWeight: 1 }
  ]
};

test('[modules] gacha facade exposes existing asset-gacha behavior', () => {
  assert.equal(validateAssetGachaPack(pack, { catalog }).ok, true);
  assert.equal(validateAssetGachaPackOnly({ ...pack, rollSize: 99 }, { catalog }).ok, false);
  assert.equal(assetGachaPackRollSize(pack), 1);

  const candidates = resolveAssetGachaRollCandidates(pack, { catalog });
  assert.deepEqual(candidates.map((item) => item.assetId), ['skin.a', 'skin.b']);

  const selected = selectAssetGachaRollResults(candidates, pack, { rng: () => 0 });
  assert.equal(selected[0].assetId, 'skin.a');

  const shaped = shapeAssetGachaPack(pack, { catalog, includeAssets: true, gachaEnabled: true });
  assert.equal(shaped.items[0].asset.assetId, 'skin.a');
  assert.equal(createGachaAdminReleaseChecklist({
    runtimePack: pack,
    validation: { ok: true, errors: [], warnings: [] }
  }).ok, false);
  assert.equal(normalizeGachaAdminFixture({ packs: [{ id: 'fixture_pack' }] }).packs[0].id, 'fixture_pack');
  assert.deepEqual(Object.keys(gachaInterface), []);
});

test('[modules] shop, loadout, battle, and fusion facades expose stable APIs', () => {
  const offer = generateShopOffer({
    rng: () => 0,
    count: 1,
    combatItems: [{ id: 'needle' }],
    getItemId: (item) => item.id
  });
  assert.deepEqual(offer.offer, ['needle']);

  assert.deepEqual(getEffectiveShape({ width: 1, height: 2, shape: [[1], [1]] }), [[1], [1]]);
  assert.deepEqual(pieceCells({ x: 0, y: 0, width: 1, height: 2 }), ['0:0', '0:1']);

  const artifacts = new Map([
    ['bag', { id: 'bag', family: 'bag', width: 2, height: 2, price: 0 }],
    ['needle', { id: 'needle', family: 'damage', width: 1, height: 1, price: 0 }]
  ]);
  const validator = createLoadoutValidator({
    gridWidth: 2,
    gridHeight: 2,
    getArtifact: (artifactId) => artifacts.get(artifactId),
    getArtifactPrice: () => 0
  });
  const validation = validator.validateLoadoutItems([
    { artifactId: 'bag', x: 0, y: 0, width: 2, height: 2, active: true },
    { artifactId: 'needle', x: 0, y: 0, width: 1, height: 1 }
  ]);
  assert.equal(validation.totalCoins, 0);

  const battle = simulateBattle({
    left: { side: 'left', maxHealth: 3, currentHealth: 3, attack: 3, speed: 2, defense: 0 },
    right: { side: 'right', maxHealth: 3, currentHealth: 3, attack: 1, speed: 1, defense: 0 },
    rng: createSeededRng(1),
    stepCap: 1
  });
  assert.equal(battle.winnerSide, 'left');

  const matches = findFusionMatches([
    { rowId: 'a', artifactId: 'a', x: 0, y: 0, width: 1, height: 1 },
    { rowId: 'b', artifactId: 'b', x: 1, y: 0, width: 1, height: 1 }
  ].map((row) => ({ ...row, id: row.rowId })), (artifactId) => ({ id: artifactId }), [{
    id: 'a_b',
    resultArtifactId: 'ab',
    ingredientArtifactIds: ['a', 'b']
  }]);
  assert.equal(matches[0].resultArtifactId, 'ab');
});
