import { randomInt } from './rng.js';

function defaultGetItemId(item) {
  return typeof item === 'string' ? item : item?.id;
}

function takeRandomItemId(pool, rng, getItemId) {
  const idx = randomInt(rng, pool.length);
  const item = pool[idx];
  pool.splice(idx, 1);
  return getItemId(item);
}

export function generateShopOffer({
  rng,
  count,
  roundsSinceBag = 1,
  combatItems = [],
  bagItems = [],
  characterItems = [],
  bagBaseChance = 0,
  bagEscalationStep = 0,
  bagPityThreshold = Number.POSITIVE_INFINITY,
  characterItemChance = 0.3,
  getItemId = defaultGetItemId
}) {
  if (typeof rng !== 'function') {
    throw new Error('generateShopOffer requires an rng function');
  }

  const combatPool = [...combatItems];
  const bagPool = [...bagItems];
  const charPool = [...characterItems];
  const offer = [];
  let hasBag = false;
  let hasCharacterItem = false;
  const offerSize = Math.max(0, Number(count) || 0);
  const perSlotChance = bagBaseChance + roundsSinceBag * bagEscalationStep;

  for (let i = 0; i < offerSize; i += 1) {
    const forceBag = !hasBag && roundsSinceBag >= bagPityThreshold && i === offerSize - 1;
    const forceChar = !hasCharacterItem && charPool.length > 0 && i === offerSize - 1 && !forceBag;
    const isBagSlot = forceBag || (bagPool.length > 0 && rng() < perSlotChance);

    if (forceChar) {
      offer.push(takeRandomItemId(charPool, rng, getItemId));
      hasCharacterItem = true;
    } else if (isBagSlot && bagPool.length > 0) {
      offer.push(takeRandomItemId(bagPool, rng, getItemId));
      hasBag = true;
    } else if (charPool.length > 0 && !hasCharacterItem && rng() < characterItemChance) {
      offer.push(takeRandomItemId(charPool, rng, getItemId));
      hasCharacterItem = true;
    } else if (combatPool.length > 0) {
      offer.push(takeRandomItemId(combatPool, rng, getItemId));
    }
  }

  return { offer, hasBag };
}

function normalizeRunCoins(coins) {
  const value = Number(coins ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function normalizePositivePrice(price) {
  const value = Number(price ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function createRunShopPurchasePlan({
  coins = 0,
  offer = [],
  artifactId,
  price = 0
} = {}) {
  const currentOffer = Array.isArray(offer) ? [...offer] : [];
  const itemIndex = currentOffer.indexOf(artifactId);
  const itemPrice = normalizePositivePrice(price);
  const currentCoins = normalizeRunCoins(coins);
  if (itemIndex < 0) {
    return {
      ok: false,
      reason: 'item_not_in_offer',
      artifactId,
      price: itemPrice,
      coinsBefore: currentCoins,
      coinsAfter: currentCoins,
      shopOffer: currentOffer
    };
  }
  if (currentCoins < itemPrice) {
    return {
      ok: false,
      reason: 'insufficient_run_currency',
      artifactId,
      price: itemPrice,
      coinsBefore: currentCoins,
      coinsAfter: currentCoins,
      shopOffer: currentOffer
    };
  }
  const nextOffer = [...currentOffer];
  nextOffer.splice(itemIndex, 1);
  return {
    ok: true,
    reason: null,
    artifactId,
    price: itemPrice,
    coinsBefore: currentCoins,
    coinsAfter: currentCoins - itemPrice,
    shopOffer: nextOffer,
    removedOfferIndex: itemIndex
  };
}

export function createRunShopRefreshPlan({
  coins = 0,
  refreshCost = 0,
  refreshCount = 0,
  currentRoundsSinceBag = 1,
  generatedOffer = [],
  hasBag = false
} = {}) {
  const currentCoins = normalizeRunCoins(coins);
  const cost = normalizePositivePrice(refreshCost);
  const currentRefreshCount = Math.max(0, Number(refreshCount) || 0);
  const roundsSinceBag = Math.max(0, Number(currentRoundsSinceBag) || 0);
  if (currentCoins < cost) {
    return {
      ok: false,
      reason: 'insufficient_run_currency',
      refreshCost: cost,
      coinsBefore: currentCoins,
      coinsAfter: currentCoins,
      refreshCount: currentRefreshCount,
      roundsSinceBag,
      shopOffer: Array.isArray(generatedOffer) ? [...generatedOffer] : []
    };
  }
  return {
    ok: true,
    reason: null,
    refreshCost: cost,
    coinsBefore: currentCoins,
    coinsAfter: currentCoins - cost,
    refreshCount: currentRefreshCount + 1,
    roundsSinceBag: hasBag ? 0 : roundsSinceBag,
    shopOffer: Array.isArray(generatedOffer) ? [...generatedOffer] : []
  };
}

export function createRunShopSellPlan({
  coins = 0,
  price = 0,
  purchasedRound = null,
  currentRound = null
} = {}) {
  const currentCoins = normalizeRunCoins(coins);
  const itemPrice = normalizePositivePrice(price);
  const freshThisRound = Number(purchasedRound) === Number(currentRound);
  const sellPrice = freshThisRound ? itemPrice : Math.max(1, Math.floor(itemPrice / 2));
  return {
    ok: true,
    reason: null,
    price: itemPrice,
    sellPrice,
    freshThisRound,
    coinsBefore: currentCoins,
    coinsAfter: currentCoins + sellPrice
  };
}
