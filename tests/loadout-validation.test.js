import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoadoutValidator } from '../src/index.js';

const catalog = {
  starter_bag: {
    id: 'starter_bag',
    family: 'bag',
    width: 3,
    height: 3,
    price: 0,
    shape: [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1]
    ],
    bonus: {}
  },
  t_sack: {
    id: 't_sack',
    family: 'bag',
    width: 3,
    height: 2,
    price: 3,
    shape: [
      [1, 1, 1],
      [0, 1, 0]
    ],
    bonus: {}
  },
  needle: {
    id: 'needle',
    family: 'damage',
    width: 1,
    height: 1,
    price: 1,
    bonus: { damage: 2 }
  },
  plate: {
    id: 'plate',
    family: 'armor',
    width: 1,
    height: 1,
    price: 1,
    bonus: { armor: 3 }
  },
  fang: {
    id: 'fang',
    family: 'stun',
    width: 1,
    height: 2,
    price: 2,
    bonus: { stunChance: 0.9 }
  },
  glass: {
    id: 'glass',
    family: 'damage',
    width: 2,
    height: 1,
    price: 2,
    bonus: { damage: 1, speed: 1 }
  }
};

function buildValidator() {
  return createLoadoutValidator({
    gridWidth: 6,
    gridHeight: 6,
    defaultCoinBudget: 5,
    getArtifact: (artifactId) => catalog[artifactId] || null,
    getArtifactPrice: (artifact) => artifact.price,
    isBag: (artifact) => artifact?.family === 'bag',
    isContainerItem: (item) => Number(item.x) < 0 || Number(item.y) < 0,
    contributesStats: (artifact, item, { isBag, isContainerItem }) =>
      !!artifact && !isBag(artifact) && !isContainerItem(item),
    statClamps: { stunChance: { min: 0, max: 0.5 } }
  });
}

const starterBag = {
  id: 'starter',
  artifactId: 'starter_bag',
  x: 0,
  y: 0,
  width: 3,
  height: 3,
  active: true
};

test('[loadout-validation] validates grid item bounds and overlap with injected catalog', () => {
  const validator = buildValidator();
  const result = validator.validateGridItems([
    { artifactId: 'needle', x: 0, y: 0, width: 1, height: 1 },
    { artifactId: 'plate', x: 1, y: 0, width: 1, height: 1 }
  ]);

  assert.equal(result.occupied.size, 2);
  assert.throws(
    () => validator.validateGridItems([
      { artifactId: 'needle', x: 0, y: 0, width: 1, height: 1 },
      { artifactId: 'plate', x: 0, y: 0, width: 1, height: 1 }
    ]),
    /cannot overlap/
  );
  assert.throws(
    () => validator.validateGridItems([
      { artifactId: 'needle', x: 6, y: 0, width: 1, height: 1 }
    ]),
    /out of bounds/
  );
});

test('[loadout-validation] validates active bag placement and inactive container policy', () => {
  const validator = buildValidator();

  assert.equal(validator.validateBagPlacement([starterBag]).occupied.size, 9);
  assert.throws(
    () => validator.validateBagPlacement([
      starterBag,
      { id: 't', artifactId: 't_sack', x: 1, y: 1, width: 3, height: 2, active: true }
    ]),
    /Bag placements cannot overlap/
  );
  assert.throws(
    () => validator.validateBagPlacement([
      { id: 't', artifactId: 't_sack', x: 0, y: 0, width: 3, height: 2 }
    ]),
    /Inactive bag t_sack must use container coordinates/
  );
});

test('[loadout-validation] validates item coverage against irregular bag masks', () => {
  const validator = buildValidator();

  validator.validateItemCoverage([
    { id: 't', artifactId: 't_sack', x: 0, y: 0, width: 3, height: 2, active: true },
    { artifactId: 'needle', x: 1, y: 1, width: 1, height: 1 }
  ]);

  assert.throws(
    () => validator.validateItemCoverage([
      { id: 't', artifactId: 't_sack', x: 0, y: 0, width: 3, height: 2, active: true },
      { artifactId: 'needle', x: 0, y: 1, width: 1, height: 1 }
    ]),
    /uncovered cell/
  );
});

test('[loadout-validation] derives bag membership and expanded grid height', () => {
  const validator = buildValidator();
  const lowBag = { id: 'low', artifactId: 't_sack', x: 0, y: 5, width: 3, height: 2, active: true };

  assert.equal(validator.effectiveGridHeight([starterBag, lowBag]), 7);
  assert.deepEqual(
    validator.bagsContainingItem({ artifactId: 'glass', x: 2, y: 0, width: 2, height: 1 }, [
      starterBag,
      { id: 'side', artifactId: 't_sack', x: 3, y: 0, width: 3, height: 2, active: true }
    ]).map((bag) => bag.id),
    ['starter', 'side']
  );
});

test('[loadout-validation] sums budget and clamps configured stat totals', () => {
  const validator = buildValidator();
  const items = [
    starterBag,
    { artifactId: 'needle', x: 0, y: 0, width: 1, height: 1 },
    { artifactId: 'fang', x: 1, y: 0, width: 1, height: 2 },
    { artifactId: 'fang', x: -1, y: -1, width: 1, height: 2 }
  ];

  assert.deepEqual(validator.validateCoinBudget(items, 5), { totalCoins: 5 });
  assert.throws(() => validator.validateCoinBudget(items, 4), /exceeds 4-coin budget/);
  assert.deepEqual(validator.buildArtifactSummary(items), {
    damage: 2,
    armor: 0,
    speed: 0,
    stunChance: 0.5
  });
});

test('[loadout-validation] orchestrates validation and returns totals', () => {
  const validator = buildValidator();
  const result = validator.validateLoadoutItems([
    starterBag,
    { artifactId: 'needle', x: 0, y: 0, width: 1, height: 1 },
    { artifactId: 'plate', x: 1, y: 0, width: 1, height: 1 }
  ]);

  assert.equal(result.totalCoins, 2);
  assert.deepEqual(result.totals, {
    damage: 2,
    armor: 3,
    speed: 0,
    stunChance: 0
  });
  assert.throws(() => validator.validateLoadoutItems('not an array'), /must be an array/);
});
