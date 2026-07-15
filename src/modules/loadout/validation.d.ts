import type { BagShape } from './bag-shape.js';
import type { GridItemLike } from './grid-geometry.js';
import type { ItemId, LoadoutPlacement } from './backpack-loadout.js';

export interface LoadoutItemLike extends GridItemLike {
  id?: ItemId | null;
  artifactId?: ItemId | null;
  artifact_id?: ItemId | null;
  active?: boolean | number;
  rotated?: unknown;
}

export interface ArtifactLike {
  id?: ItemId | null;
  width?: number;
  height?: number;
  price?: number;
  family?: string;
  bonus?: Record<string, number | undefined>;
  shape?: BagShape | null;
  [key: string]: unknown;
}

export type StatClamp = number | {
  min?: number;
  max?: number;
};

export interface LoadoutValidatorConfig<
  Artifact = ArtifactLike,
  Item extends LoadoutItemLike = LoadoutItemLike,
  StatKey extends string = 'damage' | 'armor' | 'speed' | 'stunChance'
> {
  getArtifactId: (item: Item) => ItemId | null | undefined;
  getArtifact: (artifactId: ItemId | null | undefined, item: Item) => Artifact | null | undefined;
  getArtifactPrice: (artifact: Artifact, item: Item) => number;
  getArtifactWidth: (artifact: Artifact, item: Item) => number;
  getArtifactHeight: (artifact: Artifact, item: Item) => number;
  getBagShape: (artifact: Artifact, rotation: unknown) => BagShape;
  getArtifactBonus: (artifact: Artifact, item: Item) => Partial<Record<StatKey, number | undefined>>;
  isBag: (artifact: Artifact | null | undefined) => boolean;
  isContainerItem: (item: Item) => boolean;
  contributesStats: (
    artifact: Artifact | null | undefined,
    item: Item,
    config: LoadoutValidatorConfig<Artifact, Item, StatKey>
  ) => boolean;
}

export interface CreateLoadoutValidatorOptions<
  Artifact = ArtifactLike,
  Item extends LoadoutItemLike = LoadoutItemLike,
  StatKey extends string = 'damage' | 'armor' | 'speed' | 'stunChance'
> extends Partial<LoadoutValidatorConfig<Artifact, Item, StatKey>> {
  gridWidth?: number;
  gridHeight?: number;
  defaultCoinBudget?: number;
  statKeys?: StatKey[] | readonly StatKey[];
  statClamps?: Partial<Record<StatKey, StatClamp>>;
}

export type StatTotals<StatKey extends string> = Record<StatKey, number>;

export interface BagCellSet {
  id: unknown;
  artifactId: ItemId | null | undefined;
  cells: Set<string>;
}

export interface LoadoutValidationResult<Item extends LoadoutItemLike, StatKey extends string> {
  items: Item[];
  totals: StatTotals<StatKey>;
  totalCoins: number;
}

export interface LoadoutValidator<
  Item extends LoadoutItemLike = LoadoutItemLike,
  StatKey extends string = 'damage' | 'armor' | 'speed' | 'stunChance'
> {
  buildArtifactSummary(items: Item[]): StatTotals<StatKey>;
  effectiveGridHeight(items: Item[], minGridHeight?: number): number;
  validateGridItems(gridItems: Item[], gridWidth?: number, gridHeight?: number): { occupied: Set<string> };
  validateBagPlacement(items: Item[], gridWidth?: number): { occupied: Set<string> };
  bagCellSets(items: Item[]): BagCellSet[];
  bagsContainingItem(item: GridItemLike, items: Item[]): BagCellSet[];
  validateItemCoverage(items: Item[]): void;
  validateCoinBudget(items: Item[], coinBudget?: number): { totalCoins: number };
  validateLoadoutItems(items: Item[], coinBudget?: number): LoadoutValidationResult<Item, StatKey>;
}

export function createLoadoutValidator<
  Artifact = ArtifactLike,
  Item extends LoadoutItemLike = LoadoutItemLike,
  StatKey extends string = 'damage' | 'armor' | 'speed' | 'stunChance'
>(
  options?: CreateLoadoutValidatorOptions<Artifact, Item, StatKey>
): LoadoutValidator<Item, StatKey>;

export type { LoadoutPlacement };
