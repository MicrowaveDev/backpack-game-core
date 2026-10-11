import type { BackpackInteractionRow, BackpackPlacementResult } from '../loadout/interaction-placement.js';
export declare function createRunShopPlacementPlan(options: {
  rows: BackpackInteractionRow[]; item: BackpackInteractionRow;
  placement: { x: number; y: number; rotated?: number }; columns: number; height: number;
  getArtifact: (id: string | number) => any;
}): BackpackPlacementResult;
