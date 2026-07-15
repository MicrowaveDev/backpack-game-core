import type { BagShape, BagShapeLike } from './bag-shape.js';
import type { Rng } from '../../shared/rng.js';

export type ItemId = string | number;

export interface BackpackGridConfig {
  columns?: number;
  rows?: number;
  width?: number;
  height?: number;
}

export interface LoadoutPlacement {
  artifactId: ItemId;
  x: number;
  y: number;
  width: number;
  height: number;
  active?: boolean | number;
  rotated?: unknown;
  sortOrder?: number;
  [key: string]: unknown;
}

export interface StarterBagConfig<Item = unknown> {
  item?: Item;
  artifact?: Item;
  placement?: Partial<LoadoutPlacement> & { itemId?: ItemId };
  row?: Partial<LoadoutPlacement> & { itemId?: ItemId };
  [key: string]: unknown;
}

export interface GenerateBackpackLoadoutOptions<Item = BagShapeLike> {
  rng: Rng;
  budget?: number;
  attempts?: number;
  grid: BackpackGridConfig;
  items?: Item[] | readonly Item[];
  starterBag: Item | StarterBagConfig<Item>;
  starterPreset?: LoadoutPlacement[] | readonly LoadoutPlacement[];
  presetCost?: number;
  getItemId?: (item: Item) => ItemId;
  getItemPrice?: (item: Item) => number;
  getItemWidth?: (item: Item) => number;
  getItemHeight?: (item: Item) => number;
  isBag?: (item: Item) => boolean;
  getBagShape?: (item: Item, rotation: unknown) => BagShape;
  weightForItem?: (item: Item) => number;
  validateLoadout?: (
    placements: LoadoutPlacement[],
    ceiling: number,
    context: { attempt: number }
  ) => void;
  requireBoughtNonBag?: boolean;
  rotations?: unknown[] | readonly unknown[];
  failureMessage?: string;
}

export interface BackpackLoadoutResult {
  gridWidth: number;
  gridHeight: number;
  items: LoadoutPlacement[];
}

export function generateBackpackLoadout<Item = BagShapeLike>(
  options: GenerateBackpackLoadoutOptions<Item>
): BackpackLoadoutResult;
