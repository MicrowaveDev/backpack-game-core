import type {
  ArtifactLike,
  CreateLoadoutValidatorOptions,
  LoadoutItemLike,
  LoadoutValidator
} from './validation.js';

export declare const LOADOUT_VALIDATION_PROVIDER_NAMES: readonly [
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

export type LoadoutValidationService<
  Item extends LoadoutItemLike = LoadoutItemLike,
  StatKey extends string = 'damage' | 'armor' | 'speed' | 'stunChance'
> = LoadoutValidator<Item, StatKey>;

export type CreateLoadoutValidationServiceOptions<
  Artifact = ArtifactLike,
  Item extends LoadoutItemLike = LoadoutItemLike,
  StatKey extends string = 'damage' | 'armor' | 'speed' | 'stunChance'
> = CreateLoadoutValidatorOptions<Artifact, Item, StatKey>;

export declare function createLoadoutValidationService<
  Artifact = ArtifactLike,
  Item extends LoadoutItemLike = LoadoutItemLike,
  StatKey extends string = 'damage' | 'armor' | 'speed' | 'stunChance'
>(
  options?: CreateLoadoutValidationServiceOptions<Artifact, Item, StatKey>
): LoadoutValidationService<Item, StatKey>;
