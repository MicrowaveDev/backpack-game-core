import { evaluateBackpackPlacement } from '../loadout/interaction-placement.js';

/** Validate a newly purchased row before any currency or offer mutation. */
export function createRunShopPlacementPlan({ rows = [], item, placement, columns, height, getArtifact }) {
  const rotated = placement?.rotated ?? 0;
  if (!placement || !Number.isInteger(placement.x) || !Number.isInteger(placement.y)
    || !Number.isInteger(rotated) || rotated < 0 || rotated > 3) {
    return { ok: false, reason: 'invalid_placement', rows, item, cells: [], conflictCells: [], family: getArtifact(item.artifactId)?.family, affectedIds: [], noOp: false };
  }
  const artifact = getArtifact(item.artifactId);
  const draft = { ...item, rotated,
    width: rotated % 2 ? artifact?.height : artifact?.width,
    height: rotated % 2 ? artifact?.width : artifact?.height };
  return evaluateBackpackPlacement({ rows, item: draft, x: placement.x, y: placement.y,
    columns, height, getArtifact });
}
