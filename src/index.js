export {
  defaultRectangleShape,
  getBagShape,
  getEffectiveShape,
  getEffectiveDimensions,
  isCellInShape,
  normalizeRotation,
  rotateShape,
  shapeArea
} from './modules/loadout/bag-shape.js';

export {
  cellKey,
  cellSet,
  pieceCells,
  setsIntersect
} from './modules/loadout/grid-geometry.js';

export {
  createSeededRng,
  randomInt,
  shuffleWithRng
} from './shared/rng.js';

export {
  findFusionMatches,
  fusionIngredientRowIdSet
} from './modules/fusion/matching.js';

export * from './modules/fusion/recipes.js';

export {
  createRunShopPurchasePlan,
  createRunShopRefreshPlan,
  createRunShopSellPlan,
  generateShopOffer
} from './modules/shop/offers.js';

export {
  generateBackpackLoadout
} from './modules/loadout/backpack-loadout.js';

export * from './modules/artifacts/capabilities.js';
export * from './modules/artifacts/visual-classification.js';
export * from './modules/run/lifecycle.js';

export {
  createLoadoutValidator
} from './modules/loadout/validation.js';

export {
  simulateBattle
} from './modules/battle/simulation.js';

export * from './modules/wallet/accounting.js';
export * from './modules/assets/profile-state.js';
export * from './modules/gacha/engine.js';
export * from './client/view-model.js';
export * from './client/index.js';
