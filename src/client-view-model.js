import { getEffectiveShape, normalizeRotation } from './bag-shape.js';

function artifactLookup(getArtifact) {
  if (typeof getArtifact === 'function') return getArtifact;
  if (getArtifact instanceof Map) return (id) => getArtifact.get(id);
  return () => null;
}

function bagIdSet(bagArtifactIds) {
  return bagArtifactIds instanceof Set ? bagArtifactIds : new Set(bagArtifactIds || []);
}

export function projectLoadoutItems(loadoutItems = [], bagArtifactIds = [], getArtifact = null) {
  const bagsSet = bagIdSet(bagArtifactIds);
  const builderItems = [];
  const containerItems = [];
  const activeBags = [];
  const rotatedBags = [];
  const freshPurchases = [];

  for (const item of loadoutItems || []) {
    const isBagRow = bagsSet.has(item.artifactId);
    if (isBagRow) {
      if (item.active) {
        activeBags.push({
          id: item.id,
          artifactId: item.artifactId,
          anchorX: Number(item.x ?? 0),
          anchorY: Number(item.y ?? 0)
        });
      } else {
        containerItems.push({ id: item.id, artifactId: item.artifactId });
      }
      const rotation = normalizeRotation(item.rotated);
      if (rotation) rotatedBags.push({ id: item.id, artifactId: item.artifactId, rotation });
      if (item.freshPurchase) freshPurchases.push(item.artifactId);
      continue;
    }

    if (Number(item.x) >= 0 && Number(item.y) >= 0) {
      builderItems.push({
        id: item.id,
        artifactId: item.artifactId,
        x: Number(item.x),
        y: Number(item.y),
        width: Number(item.width),
        height: Number(item.height)
      });
    } else {
      containerItems.push({ id: item.id, artifactId: item.artifactId });
    }
    if (item.freshPurchase) freshPurchases.push(item.artifactId);
  }

  return {
    builderItems,
    containerItems,
    activeBags,
    rotatedBags,
    freshPurchases
  };
}

export function prepareGridProps(loadoutItems = [], bagArtifactIds = [], getArtifact = null, options = {}) {
  const columns = Number(options.columns ?? 6);
  const minRows = Number(options.minRows ?? 6);
  const projected = projectLoadoutItems(loadoutItems, bagArtifactIds, getArtifact);
  const lookupArtifact = artifactLookup(getArtifact);
  const rotationById = new Map(projected.rotatedBags.map((bag) => [bag.id, normalizeRotation(bag.rotation ?? 1)]));
  const rows = [];
  let maxBottom = minRows;

  for (const activeBag of projected.activeBags) {
    const bag = lookupArtifact(activeBag.artifactId);
    if (!bag) continue;
    const rotation = rotationById.get(activeBag.id) ?? 0;
    const shape = getEffectiveShape(bag, rotation);
    const anchorX = activeBag.anchorX ?? 0;
    const anchorY = activeBag.anchorY ?? 0;
    const bottom = anchorY + shape.length;
    if (bottom > maxBottom) maxBottom = bottom;
    for (let i = 0; i < shape.length; i += 1) {
      const maskRow = shape[i] || [];
      const enabledCells = [];
      for (let x = 0; x < maskRow.length; x += 1) {
        const cellX = anchorX + x;
        if (cellX >= columns) break;
        if (maskRow[x]) enabledCells.push(cellX);
      }
      if (enabledCells.length === 0) continue;
      rows.push({
        bagId: activeBag.id,
        row: anchorY + i,
        color: bag.color || '#888',
        artifactId: activeBag.artifactId,
        rotation,
        enabledCells,
        bboxStart: anchorX,
        bboxEnd: Math.min(anchorX + maskRow.length, columns)
      });
    }
  }

  return {
    items: projected.builderItems,
    bagRows: rows.sort((a, b) => a.row - b.row),
    totalRows: maxBottom
  };
}
