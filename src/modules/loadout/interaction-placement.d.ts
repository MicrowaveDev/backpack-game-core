import type { ArtifactLike } from './validation.js';
import type { ItemId } from './backpack-loadout.js';

export interface BackpackInteractionRow {
  id?: ItemId | null;
  artifactId?: ItemId | null;
  artifact_id?: ItemId | null;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotated?: unknown;
  active?: boolean | number;
  artifact?: ArtifactLike;
}
export type BackpackPlacementReason = 'out_of_bounds' | 'occupied' | 'uncovered'
  | 'bag_contents' | 'locked' | 'unknown_item';
export interface BackpackPlacementResult<Row extends BackpackInteractionRow = BackpackInteractionRow> {
  ok: boolean;
  reason: BackpackPlacementReason | null;
  /** Canonical grid-geometry keys, `x:y`. */
  cells: string[];
  conflictCells: string[];
  family: string | undefined;
  item: Row;
  /** Original rows on rejection; proposed rows on success. */
  rows: Row[];
}
export interface BackpackPlacementOptions<Row extends BackpackInteractionRow = BackpackInteractionRow> {
  rows: Row[];
  item: Row;
  x: number;
  y: number;
  columns: number;
  height: number;
  getArtifact?: (id: ItemId | null | undefined, row: Row) => ArtifactLike | null | undefined;
  isLockedBag?: (row: Row, artifact: ArtifactLike) => boolean;
}
export function getBackpackItemDimensions(item: BackpackInteractionRow, artifact: ArtifactLike): { width: number; height: number };
export function getBackpackItemCells(item: BackpackInteractionRow, artifact: ArtifactLike): string[];
export function evaluateBackpackPlacement<Row extends BackpackInteractionRow>(options: BackpackPlacementOptions<Row>): BackpackPlacementResult<Row>;
