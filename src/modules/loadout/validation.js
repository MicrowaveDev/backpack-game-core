import { getEffectiveShape } from './bag-shape.js';
import { cellSet, pieceCells, setsIntersect } from './grid-geometry.js';

function defaultGetArtifactId(item) {
  return item?.artifactId ?? item?.artifact_id ?? item?.id;
}

function defaultGetArtifact(_id, item) {
  return item?.artifact ?? item;
}

function defaultGetArtifactPrice(artifact) {
  return Number.isFinite(artifact?.price) ? artifact.price : 0;
}

function defaultIsBag(artifact) {
  return artifact?.family === 'bag';
}

function defaultIsContainerItem(item) {
  return Number(item?.x) < 0 || Number(item?.y) < 0;
}

function defaultContributesStats(artifact, item, { isBag, isContainerItem }) {
  return !!artifact && !isBag(artifact) && !isContainerItem(item);
}

function defaultGetArtifactBonus(artifact) {
  return artifact?.bonus || {};
}

function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function applyStatClamps(totals, statClamps) {
  for (const [key, config] of Object.entries(statClamps)) {
    if (!Object.prototype.hasOwnProperty.call(totals, key)) continue;
    if (typeof config === 'number') {
      totals[key] = clamp(totals[key], 0, config);
      continue;
    }
    totals[key] = clamp(
      totals[key],
      Number.isFinite(config?.min) ? config.min : Number.NEGATIVE_INFINITY,
      Number.isFinite(config?.max) ? config.max : Number.POSITIVE_INFINITY
    );
  }
}

function createResolver(config) {
  return function resolveArtifact(item) {
    const artifactId = config.getArtifactId(item);
    return {
      artifactId,
      artifact: config.getArtifact(artifactId, item)
    };
  };
}

export function createLoadoutValidator({
  gridWidth,
  gridHeight,
  defaultCoinBudget = Number.POSITIVE_INFINITY,
  statKeys = ['damage', 'armor', 'speed', 'stunChance'],
  statClamps = {},
  getArtifactId = defaultGetArtifactId,
  getArtifact = defaultGetArtifact,
  getArtifactPrice = defaultGetArtifactPrice,
  getArtifactWidth = (artifact) => artifact?.width,
  getArtifactHeight = (artifact) => artifact?.height,
  getBagShape = (artifact, rotation) => getEffectiveShape(artifact, rotation),
  getArtifactBonus = defaultGetArtifactBonus,
  isBag = defaultIsBag,
  isContainerItem = defaultIsContainerItem,
  contributesStats = defaultContributesStats
} = {}) {
  const defaultGridWidth = Number(gridWidth);
  const defaultGridHeight = Number(gridHeight);
  const config = {
    getArtifactId,
    getArtifact,
    getArtifactPrice,
    getArtifactWidth,
    getArtifactHeight,
    getBagShape,
    getArtifactBonus,
    isBag,
    isContainerItem,
    contributesStats
  };
  const resolveArtifact = createResolver(config);

  function buildArtifactSummary(items) {
    const totals = Object.fromEntries(statKeys.map((key) => [key, 0]));

    for (const item of items) {
      const { artifact } = resolveArtifact(item);
      if (!contributesStats(artifact, item, config)) continue;
      const bonus = getArtifactBonus(artifact, item);
      for (const key of statKeys) {
        totals[key] += Number(bonus[key]) || 0;
      }
    }

    applyStatClamps(totals, statClamps);
    return totals;
  }

  function activeBagRows(items) {
    return items.filter((item) => {
      const { artifact } = resolveArtifact(item);
      return isBag(artifact) && item.active && !isContainerItem(item);
    });
  }

  function effectiveGridHeight(items, minGridHeight = defaultGridHeight) {
    let max = minGridHeight;
    for (const item of items) {
      const { artifact } = resolveArtifact(item);
      if (!artifact || !isBag(artifact) || !item.active) continue;
      const shape = getBagShape(artifact, item.rotated);
      const bottom = (Number(item.y) || 0) + shape.length;
      if (bottom > max) max = bottom;
    }
    return max;
  }

  function validateGridItems(gridItems, width = defaultGridWidth, height = defaultGridHeight) {
    const occupied = new Set();

    for (const item of gridItems) {
      const { artifactId, artifact } = resolveArtifact(item);
      if (!artifact) {
        throw new Error(`Unknown artifact: ${artifactId}`);
      }
      if (isBag(artifact)) continue;
      if (isContainerItem(item)) continue;

      const itemWidth = Number(item.width);
      const itemHeight = Number(item.height);
      const x = Number(item.x);
      const y = Number(item.y);
      const artifactWidth = getArtifactWidth(artifact, item);
      const artifactHeight = getArtifactHeight(artifact, item);
      const matchesCanonical = itemWidth === artifactWidth && itemHeight === artifactHeight;
      const matchesRotated = itemWidth === artifactHeight && itemHeight === artifactWidth;
      if (!matchesCanonical && !matchesRotated) {
        throw new Error('Stored artifact dimensions must match canonical definitions');
      }

      if (x < 0 || y < 0 || x + itemWidth > width || y + itemHeight > height) {
        throw new Error(
          `Artifact placement is out of bounds: ${artifactId} `
          + `at (${x},${y}) ${itemWidth}x${itemHeight} `
          + `exceeds grid ${width}x${height}`
        );
      }

      for (const key of pieceCells({ ...item, x, y, width: itemWidth, height: itemHeight })) {
        if (occupied.has(key)) {
          throw new Error('Artifact placements cannot overlap');
        }
        occupied.add(key);
      }
    }

    return { occupied };
  }

  function validateBagPlacement(items, width = defaultGridWidth) {
    const occupied = new Set();
    for (const item of items) {
      const { artifactId, artifact } = resolveArtifact(item);
      if (!isBag(artifact)) continue;
      if (!item.active) {
        if (!isContainerItem(item)) {
          throw new Error(`Inactive bag ${artifactId} must use container coordinates`);
        }
        continue;
      }
      const shape = getBagShape(artifact, item.rotated);
      const cols = shape.length ? shape[0].length : 0;
      const rows = shape.length;
      const x = Number(item.x);
      const y = Number(item.y);
      if (x < 0 || y < 0 || x + cols > width) {
        throw new Error(`Bag placement is out of bounds: ${artifactId}`);
      }
      for (const key of pieceCells({ ...item, width: cols, height: rows }, shape)) {
        if (occupied.has(key)) {
          throw new Error('Bag placements cannot overlap');
        }
        occupied.add(key);
      }
    }
    return { occupied };
  }

  function bagCellSets(items) {
    return activeBagRows(items).map((bag) => {
      const { artifact } = resolveArtifact(bag);
      const shape = getBagShape(artifact, bag.rotated);
      const width = shape.length ? shape[0].length : 0;
      const height = shape.length;
      return {
        id: bag.id,
        artifactId: getArtifactId(bag),
        cells: cellSet(pieceCells({ ...bag, width, height }, shape))
      };
    });
  }

  function bagsContainingItem(item, items) {
    const itemCells = cellSet(pieceCells(item));
    return bagCellSets(items).filter((bag) => setsIntersect(itemCells, bag.cells));
  }

  function validateItemCoverage(items) {
    const bags = bagCellSets(items);
    const covered = new Set();
    for (const bag of bags) {
      for (const key of bag.cells) covered.add(key);
    }
    for (const item of items) {
      const { artifactId, artifact } = resolveArtifact(item);
      if (!artifact) {
        throw new Error(`Unknown artifact: ${artifactId}`);
      }
      if (isBag(artifact) || isContainerItem(item)) continue;
      for (const key of pieceCells(item)) {
        if (!covered.has(key)) {
          throw new Error(`Artifact ${artifactId} has an uncovered cell at ${key} (out of bounds of active bags)`);
        }
      }
    }
  }

  function validateCoinBudget(items, coinBudget = defaultCoinBudget) {
    let totalCoins = 0;
    for (const item of items) {
      const { artifactId, artifact } = resolveArtifact(item);
      if (!artifact) {
        throw new Error(`Unknown artifact: ${artifactId}`);
      }
      totalCoins += getArtifactPrice(artifact, item);
    }
    if (totalCoins > coinBudget) {
      throw new Error(`Loadout exceeds ${coinBudget}-coin budget (cost ${totalCoins})`);
    }
    return { totalCoins };
  }

  function validateLoadoutItems(items, coinBudget = defaultCoinBudget) {
    if (!Array.isArray(items)) {
      throw new Error('Loadout items must be an array');
    }

    validateBagPlacement(items);
    validateGridItems(items, defaultGridWidth, effectiveGridHeight(items));
    validateItemCoverage(items);
    const { totalCoins } = validateCoinBudget(items, coinBudget);

    return {
      items,
      totals: buildArtifactSummary(items),
      totalCoins
    };
  }

  return {
    buildArtifactSummary,
    effectiveGridHeight,
    validateGridItems,
    validateBagPlacement,
    bagCellSets,
    bagsContainingItem,
    validateItemCoverage,
    validateCoinBudget,
    validateLoadoutItems
  };
}
