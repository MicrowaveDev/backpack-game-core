import test from 'node:test';
import assert from 'node:assert/strict';
import { generateBackpackLoadout } from '../src/index.js';

const starterBag = {
  item: { id: 'starter_bag', family: 'bag', width: 1, height: 1, shape: [[1]] },
  placement: { artifactId: 'starter_bag', x: 0, y: 0, width: 1, height: 1, active: true }
};

const items = [
  { id: 'blade', family: 'damage', width: 1, height: 1, price: 1, weight: 10 },
  { id: 'pouch', family: 'bag', width: 2, height: 2, price: 2, weight: 10, shape: [[1, 1], [1, 0]] },
  { id: 'gem', family: 'damage', width: 1, height: 1, price: 1, weight: 10 }
];

function zeroRng() {
  return 0;
}

function validateBudget(placements, ceiling) {
  const total = placements.reduce((sum, placement) => {
    const item = [...items, starterBag.item].find((candidate) => candidate.id === placement.artifactId);
    return sum + Number(item?.price || 0);
  }, 0);
  assert.ok(total <= ceiling, `cost ${total} exceeds ceiling ${ceiling}`);
}

function baseOptions(overrides = {}) {
  return {
    rng: zeroRng,
    budget: 4,
    grid: { columns: 4, rows: 2 },
    items,
    starterBag,
    starterPreset: [],
    getItemPrice: (item) => item.price,
    isBag: (item) => item.family === 'bag',
    weightForItem: (item) => item.weight,
    validateLoadout: validateBudget,
    ...overrides
  };
}

test('[backpack-loadout] includes starter bag first and buys a combat item', () => {
  const loadout = generateBackpackLoadout(baseOptions({ budget: 1, items: [items[0]] }));

  assert.equal(loadout.gridWidth, 4);
  assert.equal(loadout.gridHeight, 2);
  assert.deepEqual(loadout.items.map((item) => item.artifactId), ['starter_bag', 'blade']);
  assert.equal(loadout.items[0].active, true);
});

test('[backpack-loadout] uses compact first-fit anchors for bought bags', () => {
  const loadout = generateBackpackLoadout(baseOptions({ budget: 3, items: [items[0], items[1]] }));
  const pouch = loadout.items.find((item) => item.artifactId === 'pouch');

  assert.deepEqual(
    { x: pouch.x, y: pouch.y, rotated: pouch.rotated },
    { x: 0, y: 0, rotated: 2 }
  );
});

test('[backpack-loadout] can place bought items inside bought bag cells', () => {
  const loadout = generateBackpackLoadout(baseOptions({ budget: 4 }));
  const gem = loadout.items.find((item) => item.artifactId === 'gem');

  assert.ok(gem, 'expected gem to be bought after the bag');
  assert.ok(gem.x >= 1, `expected gem inside bought bag cells, got x=${gem.x}`);
});

test('[backpack-loadout] passes budget plus preset cost into validation', () => {
  let seenCeiling = null;
  generateBackpackLoadout(baseOptions({
    budget: 1,
    presetCost: 7,
    items: [items[0]],
    validateLoadout(_placements, ceiling) {
      seenCeiling = ceiling;
    }
  }));

  assert.equal(seenCeiling, 8);
});

test('[backpack-loadout] retries failed validation up to the attempt limit', () => {
  let calls = 0;
  const loadout = generateBackpackLoadout(baseOptions({
    budget: 1,
    attempts: 2,
    items: [items[0]],
    validateLoadout() {
      calls += 1;
      if (calls === 1) throw new Error('first validation failed');
    }
  }));

  assert.equal(calls, 2);
  assert.deepEqual(loadout.items.map((item) => item.artifactId), ['starter_bag', 'blade']);
});
