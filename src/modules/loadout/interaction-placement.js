import { getEffectiveShape, normalizeRotation } from './bag-shape.js';
import { pieceCells } from './grid-geometry.js';

/** Row dimensions describe the current item orientation; bags use their shape. */
export function getBackpackItemDimensions(item, artifact) {
  if (artifact?.family === 'bag') {
    const shape = getEffectiveShape(artifact, item.rotated);
    return { width: shape[0]?.length ?? 0, height: shape.length };
  }
  const turns = normalizeRotation(item.rotated);
  const width = Number(item.width ?? (turns % 2 ? artifact?.height : artifact?.width));
  const height = Number(item.height ?? (turns % 2 ? artifact?.width : artifact?.height));
  return { width, height };
}

/** Keys follow grid-geometry's canonical `x:y` convention. */
export function getBackpackItemCells(item, artifact) {
  return pieceCells(
    { ...item, ...getBackpackItemDimensions(item, artifact) },
    artifact?.family === 'bag' ? getEffectiveShape(artifact, item.rotated) : null
  );
}

const isPlaced = (row) => Number(row.x) >= 0 && Number(row.y) >= 0;
const sameInstance = (row, item) => row === item
  || (item?.id != null && row?.id === item.id);
const artifactId = (row) => row?.artifactId ?? row?.artifact_id ?? row?.id;

/** Pure proposed placement. Rejected results retain the confirmed rows. */
export function evaluateBackpackPlacement({
  rows = [], item, x, y, columns, height,
  getArtifact = (_id, row) => row?.artifact,
  isLockedBag = () => false
}) {
  const artifact = item && getArtifact(artifactId(item), item);
  const family = artifact?.family;
  const proposed = artifact ? {
    ...item, x: Number(x), y: Number(y),
    ...getBackpackItemDimensions(item, artifact),
    ...(family === 'bag' ? { active: true } : {})
  } : item;
  const cells = artifact ? getBackpackItemCells(proposed, artifact) : [];
  const result = (reason, conflictCells = []) => ({
    ok: !reason, reason: reason ?? null, cells,
    conflictCells: [...new Set(conflictCells)], family,
    item: proposed,
    rows: reason ? rows : rows.some((row) => sameInstance(row, item))
      ? rows.map((row) => sameInstance(row, item) ? proposed : row)
      : [...rows, proposed]
  });
  if (!artifact) return result('unknown_item');
  if (family === 'bag' && isLockedBag(item, artifact)) return result('locked', cells);
  const dimensions = getBackpackItemDimensions(proposed, artifact);
  const outOfBounds = cells.filter((key) => {
    const [cx, cy] = key.split(':').map(Number);
    return cx < 0 || cy < 0 || cx >= columns || cy >= height;
  });
  if (!Number.isInteger(proposed.x) || !Number.isInteger(proposed.y)
    || !Number.isInteger(dimensions.width) || dimensions.width <= 0
    || !Number.isInteger(dimensions.height) || dimensions.height <= 0
    || !(columns > 0) || !(height > 0)
    || proposed.x < 0 || proposed.y < 0
    || proposed.x + dimensions.width > columns
    || proposed.y + dimensions.height > height) {
    return result('out_of_bounds', outOfBounds.length ? outOfBounds : cells);
  }

  const bags = new Set();
  const occupied = new Set();
  const placedItems = [];
  for (const row of rows) {
    if (sameInstance(row, item) || !isPlaced(row)) continue;
    const otherArtifact = getArtifact(artifactId(row), row);
    if (!otherArtifact) return result('unknown_item');
    const otherCells = getBackpackItemCells(row, otherArtifact);
    if (otherArtifact.family === 'bag') {
      if (row.active) for (const key of otherCells) bags.add(key);
    } else {
      for (const key of otherCells) occupied.add(key);
      placedItems.push(...otherCells);
    }
  }
  const collisionSet = family === 'bag' ? bags : occupied;
  const collisions = cells.filter((key) => collisionSet.has(key));
  if (collisions.length) return result('occupied', collisions);
  if (family === 'bag') {
    for (const key of cells) bags.add(key);
    const uncoveredContents = placedItems.filter((key) => !bags.has(key));
    if (uncoveredContents.length) return result('bag_contents', uncoveredContents);
  } else {
    const uncovered = cells.filter((key) => !bags.has(key));
    if (uncovered.length) return result('uncovered', uncovered);
  }
  return result(null);
}
