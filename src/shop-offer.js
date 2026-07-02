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
