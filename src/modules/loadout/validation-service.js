import { createLoadoutValidator } from './validation.js';

export const LOADOUT_VALIDATION_PROVIDER_NAMES = [
  'getArtifactId',
  'getArtifact',
  'getArtifactPrice',
  'getArtifactWidth',
  'getArtifactHeight',
  'getBagShape',
  'getArtifactBonus',
  'isBag',
  'isContainerItem',
  'contributesStats'
];

export function createLoadoutValidationService(options = {}) {
  return createLoadoutValidator(options);
}
