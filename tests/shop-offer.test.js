import test from 'node:test';
import assert from 'node:assert/strict';
import { generateShopOffer } from '../src/index.js';

function sequenceRng(values) {
  let index = 0;
  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return value;
  };
}

test('[shop-offer] generates deterministic ids from passed combat pools', () => {
  const { offer, hasBag } = generateShopOffer({
    rng: sequenceRng([0, 0]),
    count: 2,
    combatItems: [{ id: 'needle' }, { id: 'plate' }],
    bagItems: []
  });

  assert.deepEqual(offer, ['needle', 'plate']);
  assert.equal(hasBag, false);
});

test('[shop-offer] forces a bag in the last slot at the pity threshold', () => {
  const { offer, hasBag } = generateShopOffer({
    rng: sequenceRng([0.9, 0, 0.9, 0]),
    count: 2,
    roundsSinceBag: 4,
    combatItems: [{ id: 'needle' }, { id: 'plate' }],
    bagItems: [{ id: 'pouch' }],
    bagBaseChance: 0,
    bagEscalationStep: 0,
    bagPityThreshold: 4
  });

  assert.deepEqual(offer, ['needle', 'pouch']);
  assert.equal(hasBag, true);
});

test('[shop-offer] reserves the last slot for an eligible character item', () => {
  const { offer, hasBag } = generateShopOffer({
    rng: sequenceRng([0.9, 0, 0.9, 0]),
    count: 2,
    combatItems: [{ id: 'needle' }, { id: 'plate' }],
    bagItems: [],
    characterItems: [{ id: 'hero_charm' }]
  });

  assert.deepEqual(offer, ['needle', 'hero_charm']);
  assert.equal(hasBag, false);
});

test('[shop-offer] supports string item pools', () => {
  const { offer } = generateShopOffer({
    rng: sequenceRng([0.9, 0]),
    count: 1,
    combatItems: ['needle']
  });

  assert.deepEqual(offer, ['needle']);
});
