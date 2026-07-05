import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLoadoutValidationService
} from '../src/modules/loadout/validation-service.js';

const catalog = new Map([
  ['starter_bag', {
    id: 'starter_bag',
    family: 'bag',
    width: 2,
    height: 2,
    price: 0,
    bonus: {}
  }],
  ['cleaver', {
    id: 'cleaver',
    family: 'damage',
    width: 1,
    height: 1,
    price: 3,
    bonus: { damage: 2, stunChance: 99 }
  }]
]);

function createService(overrides = {}) {
  return createLoadoutValidationService({
    gridWidth: 4,
    gridHeight: 4,
    defaultCoinBudget: 10,
    getArtifact: (artifactId) => catalog.get(artifactId),
    getArtifactPrice: (artifact) => artifact.price,
    isBag: (artifact) => artifact?.family === 'bag',
    isContainerItem: (item) => Number(item.x) < 0 || Number(item.y) < 0,
    contributesStats: (artifact, item, { isBag, isContainerItem }) => (
      !!artifact && !isBag(artifact) && !isContainerItem(item)
    ),
    statClamps: {
      stunChance: { min: 0, max: 25 }
    },
    ...overrides
  });
}

test('[loadout-validation-service] validates loadouts through injected providers', () => {
  const service = createService();
  const result = service.validateLoadoutItems([
    { id: 'row_bag', artifactId: 'starter_bag', x: 0, y: 0, width: 2, height: 2, active: 1 },
    { id: 'row_item', artifactId: 'cleaver', x: 0, y: 0, width: 1, height: 1 }
  ]);

  assert.equal(result.totalCoins, 3);
  assert.deepEqual(result.totals, {
    damage: 2,
    armor: 0,
    speed: 0,
    stunChance: 25
  });
});

test('[loadout-validation-service] keeps product budget and catalog policy injectable', () => {
  const service = createService({ defaultCoinBudget: 2 });

  assert.throws(
    () => service.validateLoadoutItems([
      { id: 'row_bag', artifactId: 'starter_bag', x: 0, y: 0, width: 2, height: 2, active: 1 },
      { id: 'row_item', artifactId: 'cleaver', x: 0, y: 0, width: 1, height: 1 }
    ]),
    /Loadout exceeds 2-coin budget/
  );
});
