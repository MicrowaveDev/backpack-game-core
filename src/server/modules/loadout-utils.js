import { createLoadoutValidationService } from '../../modules/loadout/validation-service.js';

export { pieceCells } from '../../modules/loadout/index.js';

function requiredProvider(name, value) {
  if (typeof value !== 'function') {
    throw new Error(`Backpack loadout utilities require provider ${name}`);
  }
  return value;
}

export function createServerLoadoutUtils({
  gridWidth,
  gridHeight,
  defaultCoinBudget,
  maxStunChance,
  getArtifact,
  getArtifactPrice,
  isBag,
  isContainerItem,
  contributesStats,
  statClamps = {}
} = {}) {
  const resolvedStatClamps = {
    ...(Number.isFinite(maxStunChance) ? { stunChance: { min: 0, max: maxStunChance } } : {}),
    ...statClamps
  };

  return createLoadoutValidationService({
    gridWidth,
    gridHeight,
    defaultCoinBudget,
    getArtifact: requiredProvider('getArtifact', getArtifact),
    getArtifactPrice: requiredProvider('getArtifactPrice', getArtifactPrice),
    isBag: requiredProvider('isBag', isBag),
    isContainerItem: requiredProvider('isContainerItem', isContainerItem),
    contributesStats: requiredProvider('contributesStats', contributesStats),
    statClamps: resolvedStatClamps
  });
}
