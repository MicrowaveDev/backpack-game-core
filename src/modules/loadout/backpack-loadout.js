import { getEffectiveShape } from './bag-shape.js';
import { pieceCells } from './grid-geometry.js';
import { shuffleWithRng } from '../../shared/rng.js';

function defaultGetItemId(item) {
  return item?.id ?? item?.artifactId;
}

function defaultGetItemPrice(item) {
  return Number(item?.price ?? 0);
}

function defaultGetItemWidth(item) {
  return Number(item?.width ?? 1);
}

function defaultGetItemHeight(item) {
  return Number(item?.height ?? 1);
}

function defaultIsBag(item) {
  return item?.family === 'bag';
}

function defaultWeightForItem() {
  return 1;
}

function shapeCells(x, y, shape) {
  const width = shape.length ? shape[0].length : 0;
  return pieceCells({ x, y, width, height: shape.length }, shape);
}

function canPlaceArtifact(candidate, occupied, covered) {
  for (const key of pieceCells(candidate)) {
    if (occupied.has(key) || (covered && !covered.has(key))) {
      return false;
    }
  }
  return true;
}

function markOccupied(candidate, occupied) {
  for (const key of pieceCells(candidate)) {
    occupied.add(key);
  }
}

function canPlaceBag(candidate, occupiedBags) {
  return shapeCells(candidate.x, candidate.y, candidate.shape)
    .every((key) => !occupiedBags.has(key));
}

function markBag(candidate, occupiedBags, coveredCells) {
  for (const key of shapeCells(candidate.x, candidate.y, candidate.shape)) {
    occupiedBags.add(key);
    coveredCells.add(key);
  }
}

function bagPlacementCandidates(item, {
  columns,
  rows,
  rotations,
  getBagShape
}) {
  const candidates = [];
  for (const rotation of rotations) {
    const shape = getBagShape(item, rotation);
    const width = shape.length ? shape[0].length : 0;
    const height = shape.length;
    if (width <= 0 || height <= 0) continue;
    if (width > columns || height > rows) continue;
    for (let y = 0; y <= rows - height; y += 1) {
      for (let x = 0; x <= columns - width; x += 1) {
        candidates.push({ x, y, width, height, rotated: rotation, shape });
      }
    }
  }
  return candidates.sort((left, right) =>
    left.y - right.y
    || left.x - right.x
    || (left.y + left.height) - (right.y + right.height)
    || left.height - right.height
    || Number(left.rotated) - Number(right.rotated)
  );
}

function artifactPlacementCandidates(item, { columns, rows, getItemWidth, getItemHeight }) {
  const width = getItemWidth(item);
  const height = getItemHeight(item);
  const candidates = [];
  for (let y = 0; y <= rows - height; y += 1) {
    for (let x = 0; x <= columns - width; x += 1) {
      candidates.push({ x, y, width, height });
    }
  }
  return candidates;
}

function pickWeightedItem(rng, affordable, weightForItem) {
  const totalWeight = affordable.reduce(
    (sum, item) => sum + Math.max(0, Number(weightForItem(item)) || 0),
    0
  );
  if (totalWeight <= 0) return affordable[0];
  let cursor = rng() * totalWeight;
  for (const item of affordable) {
    cursor -= Math.max(0, Number(weightForItem(item)) || 0);
    if (cursor <= 0) return item;
  }
  return affordable[0];
}

function normalizeStarterBag(starterBag, {
  getItemId,
  getItemWidth,
  getItemHeight
}) {
  const item = starterBag?.item || starterBag?.artifact || starterBag;
  const placement = starterBag?.placement || starterBag?.row || starterBag;
  if (!item || !placement) {
    throw new Error('generateBackpackLoadout requires a starterBag');
  }

  const row = {
    artifactId: placement.artifactId ?? placement.itemId ?? getItemId(item),
    x: Number(placement.x ?? 0),
    y: Number(placement.y ?? 0),
    width: Number(placement.width ?? getItemWidth(item)),
    height: Number(placement.height ?? getItemHeight(item)),
    active: placement.active ?? true,
    sortOrder: 0
  };
  if (placement.rotated !== undefined) row.rotated = placement.rotated;
  return { item, row };
}

function normalizePresetRow(item, sortOrder) {
  const row = {
    ...item,
    sortOrder
  };
  return row;
}

export function generateBackpackLoadout({
  rng,
  budget = 0,
  attempts = 64,
  grid,
  items = [],
  starterBag,
  starterPreset = [],
  presetCost = 0,
  getItemId = defaultGetItemId,
  getItemPrice = defaultGetItemPrice,
  getItemWidth = defaultGetItemWidth,
  getItemHeight = defaultGetItemHeight,
  isBag = defaultIsBag,
  getBagShape = (item, rotation) => getEffectiveShape(item, rotation),
  weightForItem = defaultWeightForItem,
  validateLoadout = null,
  requireBoughtNonBag = true,
  rotations = [0, 1, 2, 3],
  failureMessage = 'Could not generate backpack loadout'
}) {
  if (typeof rng !== 'function') {
    throw new Error('generateBackpackLoadout requires an rng function');
  }
  const columns = Number(grid?.columns ?? grid?.width ?? 0);
  const rows = Number(grid?.rows ?? grid?.height ?? 0);
  if (columns <= 0 || rows <= 0) {
    throw new Error('generateBackpackLoadout requires positive grid dimensions');
  }

  const starter = normalizeStarterBag(starterBag, {
    getItemId,
    getItemWidth,
    getItemHeight
  });
  let lastValidationError = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const pool = [...items];
    const occupiedItems = new Set();
    const occupiedBags = new Set();
    const coveredCells = new Set();
    let remainingCoins = budget;
    let boughtCombatCount = 0;
    const placements = [{ ...starter.row }];

    markBag(
      {
        x: starter.row.x,
        y: starter.row.y,
        shape: getBagShape(starter.item, starter.row.rotated ?? false)
      },
      occupiedBags,
      coveredCells
    );

    for (const item of starterPreset) {
      const placement = normalizePresetRow(item, placements.length);
      markOccupied(placement, occupiedItems);
      placements.push(placement);
    }

    while (remainingCoins > 0 && pool.length) {
      const affordable = pool.filter((item) => {
        if (getItemPrice(item) > remainingCoins) return false;
        if (isBag(item)) {
          return bagPlacementCandidates(item, {
            columns,
            rows,
            rotations,
            getBagShape
          }).some((candidate) => canPlaceBag(candidate, occupiedBags));
        }
        return artifactPlacementCandidates(item, { columns, rows, getItemWidth, getItemHeight })
          .some((candidate) => canPlaceArtifact(candidate, occupiedItems, coveredCells));
      });
      if (!affordable.length) break;

      const pickable = boughtCombatCount === 0 && requireBoughtNonBag
        ? affordable.filter((item) => !isBag(item))
        : affordable;
      const item = pickWeightedItem(rng, pickable.length ? pickable : affordable, weightForItem);
      const idx = pool.indexOf(item);
      if (idx >= 0) pool.splice(idx, 1);
      remainingCoins -= getItemPrice(item);

      if (isBag(item)) {
        const found = bagPlacementCandidates(item, {
          columns,
          rows,
          rotations,
          getBagShape
        }).find((candidate) => canPlaceBag(candidate, occupiedBags));
        if (!found) break;

        markBag(found, occupiedBags, coveredCells);
        placements.push({
          artifactId: getItemId(item),
          x: found.x,
          y: found.y,
          width: found.width,
          height: found.height,
          rotated: found.rotated,
          active: true,
          sortOrder: placements.length
        });
        continue;
      }

      const found = shuffleWithRng(
        artifactPlacementCandidates(item, { columns, rows, getItemWidth, getItemHeight }),
        rng
      ).find((candidate) => canPlaceArtifact(candidate, occupiedItems, coveredCells));
      if (!found) break;

      const placement = {
        artifactId: getItemId(item),
        x: found.x,
        y: found.y,
        width: getItemWidth(item),
        height: getItemHeight(item),
        sortOrder: placements.length
      };
      markOccupied(placement, occupiedItems);
      placements.push(placement);
      boughtCombatCount += 1;
    }

    if (boughtCombatCount > 0 || !requireBoughtNonBag) {
      placements.sort((left, right) => left.sortOrder - right.sortOrder);
      try {
        if (validateLoadout) validateLoadout(placements, budget + presetCost, { attempt });
      } catch (err) {
        lastValidationError = err;
        continue;
      }
      return {
        gridWidth: columns,
        gridHeight: rows,
        items: placements
      };
    }
  }

  if (lastValidationError) throw lastValidationError;
  throw new Error(failureMessage);
}
