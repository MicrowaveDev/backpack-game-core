import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRunShopPurchasePlan,
  createRunShopRefreshPlan,
  createRunShopSellPlan,
  generateShopOffer
} from '../src/index.js';

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

test('[shop-offer] plans run shop purchases without persistence', () => {
  const plan = createRunShopPurchasePlan({
    coins: 7,
    offer: ['needle', 'plate', 'pouch'],
    artifactId: 'plate',
    price: 3
  });

  assert.deepEqual(plan, {
    ok: true,
    reason: null,
    artifactId: 'plate',
    price: 3,
    coinsBefore: 7,
    coinsAfter: 4,
    shopOffer: ['needle', 'pouch'],
    removedOfferIndex: 1
  });

  assert.equal(createRunShopPurchasePlan({
    coins: 2,
    offer: ['needle'],
    artifactId: 'needle',
    price: 3
  }).reason, 'insufficient_run_currency');
  assert.equal(createRunShopPurchasePlan({
    coins: 10,
    offer: ['needle'],
    artifactId: 'plate',
    price: 3
  }).reason, 'item_not_in_offer');
});

test('[shop-offer] plans refresh and sell run currency state', () => {
  const refresh = createRunShopRefreshPlan({
    coins: 5,
    refreshCost: 1,
    refreshCount: 2,
    currentRoundsSinceBag: 3,
    generatedOffer: ['needle', 'pouch'],
    hasBag: true
  });
  assert.equal(refresh.ok, true);
  assert.equal(refresh.coinsAfter, 4);
  assert.equal(refresh.refreshCount, 3);
  assert.equal(refresh.roundsSinceBag, 0);
  assert.deepEqual(refresh.shopOffer, ['needle', 'pouch']);

  const blocked = createRunShopRefreshPlan({
    coins: 0,
    refreshCost: 1,
    refreshCount: 2,
    generatedOffer: ['needle']
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, 'insufficient_run_currency');

  assert.deepEqual(createRunShopSellPlan({
    coins: 2,
    price: 5,
    purchasedRound: 3,
    currentRound: 3
  }), {
    ok: true,
    reason: null,
    price: 5,
    sellPrice: 5,
    freshThisRound: true,
    coinsBefore: 2,
    coinsAfter: 7
  });

  assert.equal(createRunShopSellPlan({
    coins: 2,
    price: 5,
    purchasedRound: 1,
    currentRound: 3
  }).sellPrice, 2);
});
