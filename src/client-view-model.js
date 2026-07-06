import { getEffectiveShape, isCellInShape, normalizeRotation } from './bag-shape.js';

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

function normalizedPrepState(state) {
  return state && typeof state === 'object' ? state : {};
}

function prepStateFrom(options = {}) {
  return normalizedPrepState(typeof options.getState === 'function' ? options.getState() : options.state);
}

function samePrepItemInstance(a = {}, b = {}) {
  if (a?.id && b?.id) return a.id === b.id;
  return numberOr(a?.x) === numberOr(b?.x) && numberOr(a?.y) === numberOr(b?.y);
}

function prepRectCellKeys(x, y, width, height) {
  const cells = [];
  for (let dx = 0; dx < width; dx += 1) {
    for (let dy = 0; dy < height; dy += 1) {
      cells.push(`${x + dx}:${y + dy}`);
    }
  }
  return cells;
}

function prepShapeCellsAt(anchorX, anchorY, shape = []) {
  const cells = new Set();
  for (let dy = 0; dy < shape.length; dy += 1) {
    const row = shape[dy] || [];
    for (let dx = 0; dx < row.length; dx += 1) {
      if (row[dx]) cells.add(`${anchorX + dx}:${anchorY + dy}`);
    }
  }
  return cells;
}

function prepRectangleShape(cols, rows) {
  return Array.from({ length: rows }, () => Array(cols).fill(1));
}

function prepArray(state, key) {
  const value = normalizedPrepState(state)[key];
  return Array.isArray(value) ? value : [];
}

function prepArtifactTarget(target) {
  if (target && typeof target === 'object') {
    return {
      artifactId: target.artifactId || target.id || '',
      rowId: target.rowId || target.id || null
    };
  }
  return { artifactId: target || '', rowId: null };
}

function samePrepBagTarget(bag, artifactId, rowId = null) {
  return rowId ? bag?.id === rowId : bag?.artifactId === artifactId;
}

function popPrepContainerItem(containerItems = [], artifactId, rowId = null) {
  const idx = (containerItems || []).findIndex((slot) => (
    rowId ? slot.id === rowId : slot.artifactId === artifactId
  ));
  if (idx < 0) return { next: containerItems || [], removed: null };
  const removed = containerItems[idx];
  return {
    next: [
      ...containerItems.slice(0, idx),
      ...containerItems.slice(idx + 1)
    ],
    removed
  };
}

function prepItemCellSet(item = {}) {
  const cells = new Set();
  const width = Math.max(1, numberOr(item.width, 1));
  const height = Math.max(1, numberOr(item.height, 1));
  const x = numberOr(item.x);
  const y = numberOr(item.y);
  for (let dx = 0; dx < width; dx += 1) {
    for (let dy = 0; dy < height; dy += 1) {
      cells.add(`${x + dx}:${y + dy}`);
    }
  }
  return cells;
}

function prepSetsOverlap(a, b) {
  for (const key of a || []) {
    if (b?.has?.(key)) return true;
  }
  return false;
}

function prepBagCellSet(controller, bag, rotationOverride = null) {
  const rotation = rotationOverride == null
    ? controller.bagRotation(bag.artifactId, bag.id)
    : normalizeRotation(rotationOverride);
  const artifact = controller.lookupArtifact?.(bag.artifactId);
  const shape = artifact ? controller.shapeForArtifact(artifact, rotation) : [];
  return prepShapeCellsAt(numberOr(bag.anchorX), numberOr(bag.anchorY), shape);
}

function displacePrepItemsForBag(state, controller, bag, rotationOverride = null) {
  const bagCells = prepBagCellSet(controller, bag, rotationOverride);
  const builderItems = [];
  const displaced = [];
  for (const item of prepArray(state, 'builderItems')) {
    if (prepSetsOverlap(prepItemCellSet(item), bagCells)) displaced.push(item);
    else builderItems.push(item);
  }
  return {
    builderItems,
    containerItems: [
      ...prepArray(state, 'containerItems'),
      ...displaced.map((item) => ({ id: item.id ?? null, artifactId: item.artifactId }))
    ],
    displacedItems: displaced
  };
}

function prepControllerForPlan(options = {}) {
  return createPrepGridController({
    state: options.state,
    getArtifact: options.getArtifact,
    columns: options.columns,
    minRows: options.minRows,
    bagFamily: options.bagFamily
  });
}

export function createPrepGridController({
  state = null,
  getState = null,
  getArtifact = null,
  columns = 6,
  minRows = 6,
  bagFamily = 'bag'
} = {}) {
  const lookupArtifact = artifactLookup(getArtifact);
  const columnCount = Math.max(1, numberOr(columns, 6));
  const minimumRows = Math.max(1, numberOr(minRows, 6));
  const options = { state, getState };

  function currentState() {
    return prepStateFrom(options);
  }

  function activeBags() {
    return currentState().activeBags || [];
  }

  function rotatedBags() {
    return currentState().rotatedBags || [];
  }

  function builderItems() {
    return currentState().builderItems || [];
  }

  function containerItems() {
    return currentState().containerItems || [];
  }

  function bagRotation(bagArtifactId, rowId = null) {
    const entry = rotatedBags().find((bag) => (rowId ? bag.id === rowId : bag.artifactId === bagArtifactId));
    return normalizeRotation(entry?.rotation ?? (entry ? 1 : 0));
  }

  function shapeForArtifact(artifact, rotation = 0) {
    return getEffectiveShape(artifact, normalizeRotation(rotation));
  }

  function bagLayout(bagArtifactId, rowId = null) {
    const bag = lookupArtifact(bagArtifactId);
    if (!bag) return { cols: columnCount, rows: 1, shape: [], rotation: 0 };
    const rotation = bagRotation(bagArtifactId, rowId);
    const shape = shapeForArtifact(bag, rotation);
    const cols = shape.length > 0 ? shape[0].length : 0;
    const rows = shape.length;
    return { cols: Math.min(cols, columnCount), rows, shape, rotation };
  }

  function bagsBottomRow() {
    let max = 0;
    for (const bag of activeBags()) {
      const layout = bagLayout(bag.artifactId, bag.id);
      const bottom = (bag.anchorY ?? 0) + layout.rows;
      if (bottom > max) max = bottom;
    }
    return max;
  }

  function effectiveRows() {
    return Math.max(minimumRows, bagsBottomRow());
  }

  function bagRows() {
    const rows = [];
    for (const activeBag of activeBags()) {
      const bag = lookupArtifact(activeBag.artifactId);
      if (!bag) continue;
      const layout = bagLayout(activeBag.artifactId, activeBag.id);
      const anchorX = numberOr(activeBag.anchorX);
      const anchorY = numberOr(activeBag.anchorY);
      for (let i = 0; i < layout.shape.length; i += 1) {
        const maskRow = layout.shape[i] || [];
        const enabledCells = [];
        for (let x = 0; x < maskRow.length; x += 1) {
          const cellX = anchorX + x;
          if (cellX >= columnCount) break;
          if (maskRow[x]) enabledCells.push(cellX);
        }
        if (enabledCells.length === 0) continue;
        rows.push({
          bagId: activeBag.id,
          row: anchorY + i,
          color: bag.color || '#888',
          artifactId: activeBag.artifactId,
          rotation: layout.rotation,
          enabledCells,
          bboxStart: anchorX,
          bboxEnd: Math.min(anchorX + maskRow.length, columnCount)
        });
      }
    }
    return rows.sort((a, b) => a.row - b.row);
  }

  function bagForCell(cx, cy) {
    for (const bag of activeBags()) {
      const layout = bagLayout(bag.artifactId, bag.id);
      const ax = numberOr(bag.anchorX);
      const ay = numberOr(bag.anchorY);
      if (cx >= ax && cx < ax + layout.cols && cy >= ay && cy < ay + layout.rows) {
        const localX = cx - ax;
        const localY = cy - ay;
        if (!isCellInShape(layout.shape, localX, localY)) continue;
        return {
          bagRowId: bag.id,
          bagArtifactId: bag.artifactId,
          anchorX: ax,
          anchorY: ay,
          rowCount: layout.rows,
          cols: layout.cols,
          shape: layout.shape
        };
      }
    }
    return null;
  }

  function isCellDisabled(cx, cy) {
    return !bagForCell(cx, cy);
  }

  function containerKeyForCell(cx, cy) {
    const info = bagForCell(cx, cy);
    return info ? info.bagRowId : null;
  }

  function footprintInOneContainer(x, y, width, height) {
    for (let dx = 0; dx < width; dx += 1) {
      for (let dy = 0; dy < height; dy += 1) {
        if (containerKeyForCell(x + dx, y + dy) == null) return false;
      }
    }
    return true;
  }

  function bagAreaOverlaps(anchorX, anchorY, cols, rows, ignoreBagId = null, candidateShape = null) {
    const candidateCells = prepShapeCellsAt(
      anchorX,
      anchorY,
      candidateShape || prepRectangleShape(cols, rows)
    );
    for (const other of activeBags()) {
      if (other.id === ignoreBagId) continue;
      const layout = bagLayout(other.artifactId, other.id);
      const otherCells = prepShapeCellsAt(numberOr(other.anchorX), numberOr(other.anchorY), layout.shape);
      for (const key of candidateCells) {
        if (otherCells.has(key)) return true;
      }
    }
    return false;
  }

  function findFirstFitAnchor(cols, rows, ignoreBagId = null, shape = null) {
    const maxY = Math.max(0, bagsBottomRow()) + rows;
    for (let ay = 0; ay <= maxY; ay += 1) {
      for (let ax = 0; ax + cols <= columnCount; ax += 1) {
        if (!bagAreaOverlaps(ax, ay, cols, rows, ignoreBagId, shape)) {
          return { anchorX: ax, anchorY: ay };
        }
      }
    }
    return { anchorX: 0, anchorY: maxY };
  }

  function normalizePlacement(artifact, x, y, width, height, rowId = null) {
    const w = Math.max(1, numberOr(width ?? artifact?.width, 1));
    const h = Math.max(1, numberOr(height ?? artifact?.height, 1));
    if (x + w > columnCount || y + h > effectiveRows()) return null;
    const occupied = buildOccupiedCellMap(builderItems());
    for (let dx = 0; dx < w; dx += 1) {
      for (let dy = 0; dy < h; dy += 1) {
        if (occupied.has(`${x + dx}:${y + dy}`)) return null;
        if (isCellDisabled(x + dx, y + dy)) return null;
      }
    }
    if (!footprintInOneContainer(x, y, w, h)) return null;
    const candidate = {
      id: rowId,
      artifactId: artifact?.id || artifact?.artifactId,
      x,
      y,
      width: w,
      height: h
    };
    return [...builderItems(), candidate];
  }

  function canMovePlacedItemTo(item, x, y) {
    const others = builderItems().filter((candidate) => !samePrepItemInstance(candidate, item));
    const occupied = buildOccupiedCellMap(others);
    const w = Math.max(1, numberOr(item?.width, 1));
    const h = Math.max(1, numberOr(item?.height, 1));
    if (x + w > columnCount || y + h > effectiveRows()) return false;
    for (let dx = 0; dx < w; dx += 1) {
      for (let dy = 0; dy < h; dy += 1) {
        if (occupied.has(`${x + dx}:${y + dy}`)) return false;
        if (isCellDisabled(x + dx, y + dy)) return false;
      }
    }
    return footprintInOneContainer(x, y, w, h);
  }

  function placementPreviewAt(x, y) {
    const resolvedState = currentState();
    if (resolvedState.draggingSource === 'bag-chip') {
      const bagId = resolvedState.draggingBagId;
      const bag = activeBags().find((activeBag) => activeBag.id === bagId);
      if (!bag) return null;
      const layout = bagLayout(bag.artifactId, bag.id);
      const cells = Array.from(prepShapeCellsAt(x, y, layout.shape));
      const valid = x >= 0
        && y >= 0
        && x + layout.cols <= columnCount
        && !bagAreaOverlaps(x, y, layout.cols, layout.rows, bagId, layout.shape);
      return {
        cells,
        valid,
        artifactId: bag.artifactId,
        family: bagFamily
      };
    }

    if (resolvedState.draggingSource === 'container') {
      const artifactId = resolvedState.draggingArtifactId;
      const artifact = lookupArtifact(artifactId);
      if (!artifact || artifact.family === bagFamily) return null;
      const draggedRowId = resolvedState.draggingItem?.id ?? null;
      const slot = containerItems().find((item) => (
        draggedRowId ? item.id === draggedRowId : item.artifactId === artifactId
      ));
      const rowId = slot?.id ?? null;
      const preferred = preferredArtifactOrientation(artifact);
      const orientations = [preferred];
      if (artifact.width !== artifact.height) {
        orientations.push({ width: preferred.height, height: preferred.width });
      }
      const validOrientation = orientations.find((orientation) =>
        normalizePlacement(artifact, x, y, orientation.width, orientation.height, rowId)
      );
      const display = validOrientation || orientations[0];
      return {
        cells: prepRectCellKeys(x, y, display.width, display.height),
        valid: Boolean(validOrientation),
        artifactId,
        family: artifact.family
      };
    }

    if (resolvedState.draggingSource === 'inventory' && resolvedState.draggingItem) {
      const item = resolvedState.draggingItem;
      const artifact = lookupArtifact(item.artifactId);
      return {
        cells: prepRectCellKeys(x, y, item.width, item.height),
        valid: canMovePlacedItemTo(item, x, y),
        artifactId: item.artifactId,
        family: artifact?.family || 'damage'
      };
    }

    return null;
  }

  return {
    bagAreaOverlaps,
    bagForCell,
    bagLayout,
    bagRows,
    bagRotation,
    bagsBottomRow,
    canMovePlacedItemTo,
    containerKeyForCell,
    effectiveRows,
    findFirstFitAnchor,
    footprintInOneContainer,
    isCellDisabled,
    normalizePlacement,
    placementPreviewAt,
    rectCellKeys: prepRectCellKeys,
    shapeCellsAt: prepShapeCellsAt,
    shapeForArtifact,
    lookupArtifact
  };
}

export function planPrepPlaceFromContainer({
  state = null,
  target = null,
  artifactId = '',
  x = 0,
  y = 0,
  getArtifact = null,
  columns = 6,
  minRows = 6,
  bagFamily = 'bag'
} = {}) {
  const resolvedState = normalizedPrepState(state);
  const lookupArtifact = artifactLookup(getArtifact);
  const targetInfo = prepArtifactTarget(target || {
    artifactId: artifactId || resolvedState.draggingArtifactId,
    rowId: resolvedState.draggingItem?.id || null
  });
  const resolvedArtifactId = artifactId || targetInfo.artifactId;
  const artifact = lookupArtifact(resolvedArtifactId);
  if (!artifact || artifact.family === bagFamily) return { ok: false, reason: 'invalid_artifact' };

  const controller = prepControllerForPlan({ state: resolvedState, getArtifact, columns, minRows, bagFamily });
  const rowId = targetInfo.rowId || resolvedState.draggingItem?.id || null;
  const slot = prepArray(resolvedState, 'containerItems').find((item) => (
    rowId ? item.id === rowId : item.artifactId === resolvedArtifactId
  ));
  if (!slot) return { ok: false, reason: 'missing_container_item' };

  const preferred = preferredArtifactOrientation(artifact);
  const orientations = [preferred];
  if (artifact.width !== artifact.height) {
    orientations.push({ width: preferred.height, height: preferred.width });
  }

  for (const orientation of orientations) {
    const builderItems = controller.normalizePlacement(
      artifact,
      numberOr(x),
      numberOr(y),
      orientation.width,
      orientation.height,
      slot.id ?? null
    );
    if (!builderItems) continue;
    const { next: containerItems } = popPrepContainerItem(
      prepArray(resolvedState, 'containerItems'),
      resolvedArtifactId,
      slot.id ?? null
    );
    return {
      ok: true,
      reason: '',
      builderItems,
      containerItems,
      placedItem: builderItems[builderItems.length - 1]
    };
  }

  return { ok: false, reason: 'does_not_fit' };
}

export function planPrepMovePlacedItem({
  state = null,
  item = null,
  x = 0,
  y = 0,
  getArtifact = null,
  columns = 6,
  minRows = 6,
  bagFamily = 'bag'
} = {}) {
  if (!item) return { ok: false, reason: 'missing_item' };
  const resolvedState = normalizedPrepState(state);
  const controller = prepControllerForPlan({ state: resolvedState, getArtifact, columns, minRows, bagFamily });
  if (!controller.canMovePlacedItemTo(item, numberOr(x), numberOr(y))) {
    return { ok: false, reason: 'does_not_fit' };
  }
  const others = prepArray(resolvedState, 'builderItems').filter((candidate) => !samePrepItemInstance(candidate, item));
  return {
    ok: true,
    reason: '',
    builderItems: [...others, { ...item, x: numberOr(x), y: numberOr(y) }]
  };
}

export function planPrepActivateBag({
  state = null,
  target = null,
  artifactId = '',
  getArtifact = null,
  columns = 6,
  minRows = 6,
  bagFamily = 'bag'
} = {}) {
  const resolvedState = normalizedPrepState(state);
  const lookupArtifact = artifactLookup(getArtifact);
  const targetInfo = prepArtifactTarget(target || {
    artifactId: artifactId || resolvedState.draggingArtifactId,
    rowId: resolvedState.draggingItem?.id || null
  });
  const resolvedArtifactId = artifactId || targetInfo.artifactId;
  const artifact = lookupArtifact(resolvedArtifactId);
  if (!artifact || artifact.family !== bagFamily) return { ok: false, reason: 'invalid_bag' };
  if (prepArray(resolvedState, 'activeBags').some((bag) => samePrepBagTarget(bag, resolvedArtifactId, targetInfo.rowId))) {
    return { ok: false, reason: 'already_active' };
  }
  const { next: containerItems, removed } = popPrepContainerItem(
    prepArray(resolvedState, 'containerItems'),
    resolvedArtifactId,
    targetInfo.rowId
  );
  if (!removed) return { ok: false, reason: 'missing_container_item' };

  const controller = prepControllerForPlan({ state: resolvedState, getArtifact, columns, minRows, bagFamily });
  const rotation = controller.bagRotation(resolvedArtifactId, removed.id);
  const shape = controller.shapeForArtifact(artifact, rotation);
  const cols = Math.min(Math.max(0, shape[0]?.length || 0), Math.max(1, numberOr(columns, 6)));
  const rows = shape.length;
  const { anchorX, anchorY } = controller.findFirstFitAnchor(cols, rows, null, shape);

  return {
    ok: true,
    reason: '',
    activeBags: [...prepArray(resolvedState, 'activeBags'), { ...removed, anchorX, anchorY }],
    containerItems,
    activatedBag: { ...removed, anchorX, anchorY }
  };
}

export function planPrepDeactivateBag({
  state = null,
  target = null,
  artifactId = '',
  getArtifact = null,
  columns = 6,
  minRows = 6,
  bagFamily = 'bag'
} = {}) {
  const resolvedState = normalizedPrepState(state);
  const targetInfo = prepArtifactTarget(target || { artifactId });
  const resolvedArtifactId = artifactId || targetInfo.artifactId;
  const activeBags = prepArray(resolvedState, 'activeBags');
  const idx = activeBags.findIndex((bag) => samePrepBagTarget(bag, resolvedArtifactId, targetInfo.rowId));
  if (idx < 0) return { ok: false, reason: 'missing_active_bag' };
  const removed = activeBags[idx];
  const controller = prepControllerForPlan({ state: resolvedState, getArtifact, columns, minRows, bagFamily });
  const displaced = displacePrepItemsForBag(resolvedState, controller, removed);
  return {
    ok: true,
    reason: '',
    activeBags: [
      ...activeBags.slice(0, idx),
      ...activeBags.slice(idx + 1)
    ],
    builderItems: displaced.builderItems,
    containerItems: [...displaced.containerItems, removed],
    deactivatedBag: removed,
    displacedItems: displaced.displacedItems
  };
}

export function planPrepMoveActiveBag({
  state = null,
  bagId = '',
  x = 0,
  y = 0,
  getArtifact = null,
  columns = 6,
  minRows = 6,
  bagFamily = 'bag'
} = {}) {
  const resolvedState = normalizedPrepState(state);
  const activeBags = prepArray(resolvedState, 'activeBags');
  const idx = activeBags.findIndex((bag) => bag.id === bagId);
  if (idx < 0) return { ok: false, reason: 'missing_active_bag' };
  const bag = activeBags[idx];
  const controller = prepControllerForPlan({ state: resolvedState, getArtifact, columns, minRows, bagFamily });
  const layout = controller.bagLayout(bag.artifactId, bag.id);
  const anchorX = numberOr(x);
  const anchorY = numberOr(y);
  if (anchorX < 0 || anchorY < 0 || anchorX + layout.cols > Math.max(1, numberOr(columns, 6))) {
    return { ok: false, reason: 'does_not_fit' };
  }
  if (controller.bagAreaOverlaps(anchorX, anchorY, layout.cols, layout.rows, bagId, layout.shape)) {
    return { ok: false, reason: 'does_not_fit' };
  }
  const displaced = displacePrepItemsForBag(resolvedState, controller, bag);
  return {
    ok: true,
    reason: '',
    activeBags: activeBags.map((candidate, index) => (
      index === idx ? { ...candidate, anchorX, anchorY } : candidate
    )),
    builderItems: displaced.builderItems,
    containerItems: displaced.containerItems,
    movedBag: { ...bag, anchorX, anchorY },
    displacedItems: displaced.displacedItems
  };
}

export function planPrepRotateBag({
  state = null,
  target = null,
  artifactId = '',
  getArtifact = null,
  columns = 6,
  minRows = 6,
  bagFamily = 'bag'
} = {}) {
  const resolvedState = normalizedPrepState(state);
  const lookupArtifact = artifactLookup(getArtifact);
  const targetInfo = prepArtifactTarget(target || { artifactId });
  const resolvedArtifactId = artifactId || targetInfo.artifactId;
  const activeBags = prepArray(resolvedState, 'activeBags');
  const activeBag = activeBags.find((bag) => samePrepBagTarget(bag, resolvedArtifactId, targetInfo.rowId));
  if (!activeBag) return { ok: false, reason: 'missing_active_bag' };
  const bag = lookupArtifact(resolvedArtifactId);
  if (!bag || bag.family !== bagFamily) return { ok: false, reason: 'invalid_bag' };
  if (bag.width === bag.height) return { ok: false, reason: 'not_rotatable' };

  const controller = prepControllerForPlan({ state: resolvedState, getArtifact, columns, minRows, bagFamily });
  const currentRotation = controller.bagRotation(activeBag.artifactId, activeBag.id);
  const nextRotation = (currentRotation + 1) % 4;
  const nextShape = controller.shapeForArtifact(bag, nextRotation);
  const nextCols = nextShape.length > 0 ? nextShape[0].length : 0;
  const nextRows = nextShape.length;
  const { anchorX, anchorY } = controller.findFirstFitAnchor(nextCols, nextRows, activeBag.id, nextShape);
  const columnCount = Math.max(1, numberOr(columns, 6));
  if (
    anchorX + nextCols > columnCount
    || controller.bagAreaOverlaps(anchorX, anchorY, nextCols, nextRows, activeBag.id, nextShape)
  ) {
    return { ok: false, reason: 'does_not_fit' };
  }

  const displacedOld = displacePrepItemsForBag(resolvedState, controller, activeBag);
  const stateAfterOldDisplacement = {
    ...resolvedState,
    builderItems: displacedOld.builderItems,
    containerItems: displacedOld.containerItems
  };
  const displacedNew = displacePrepItemsForBag(
    stateAfterOldDisplacement,
    controller,
    { ...activeBag, anchorX, anchorY },
    nextRotation
  );
  const rotatedBags = prepArray(resolvedState, 'rotatedBags');
  const rotationIndex = rotatedBags.findIndex((entry) => entry.id === activeBag.id);
  let nextRotatedBags;
  if (nextRotation === 0) {
    nextRotatedBags = rotatedBags.filter((entry) => entry.id !== activeBag.id);
  } else if (rotationIndex >= 0) {
    nextRotatedBags = rotatedBags.map((entry, index) => (
      index === rotationIndex
        ? { id: activeBag.id, artifactId: activeBag.artifactId, rotation: nextRotation }
        : entry
    ));
  } else {
    nextRotatedBags = [
      ...rotatedBags,
      { id: activeBag.id, artifactId: activeBag.artifactId, rotation: nextRotation }
    ];
  }

  return {
    ok: true,
    reason: '',
    activeBags: activeBags.map((candidate) => (
      candidate.id === activeBag.id ? { ...candidate, anchorX, anchorY } : candidate
    )),
    rotatedBags: nextRotatedBags,
    builderItems: displacedNew.builderItems,
    containerItems: displacedNew.containerItems,
    rotatedBag: { ...activeBag, anchorX, anchorY },
    rotation: nextRotation,
    displacedItems: [...displacedOld.displacedItems, ...displacedNew.displacedItems]
  };
}

export function prepRefreshCost(refreshCount = 0, {
  firstCost = 1,
  firstCostCount = 3,
  laterCost = 2
} = {}) {
  return numberOr(refreshCount) < numberOr(firstCostCount, 3)
    ? numberOr(firstCost, 1)
    : numberOr(laterCost, 2);
}

export function prepSellPriceLabel({
  sellDragOver = false,
  draggingArtifactId = '',
  freshPurchases = [],
  getArtifact = null,
  getArtifactPrice = null
} = {}) {
  if (!sellDragOver || !draggingArtifactId) return '';
  const artifact = artifactLookup(getArtifact)(draggingArtifactId);
  if (!artifact) return '';
  const price = typeof getArtifactPrice === 'function'
    ? numberOr(getArtifactPrice(artifact))
    : numberOr(artifact.price, 1);
  return String((freshPurchases || []).includes(draggingArtifactId) ? price : Math.floor(price / 2));
}

export function shapePrepScreenViewState({
  state = null,
  getArtifact = null,
  getArtifactPrice = null,
  columns = 6,
  minRows = 6,
  refreshPricing = {}
} = {}) {
  const resolvedState = normalizedPrepState(state);
  const controller = createPrepGridController({
    state: resolvedState,
    getArtifact,
    columns,
    minRows
  });
  return {
    ready: Boolean(resolvedState.bootstrapReady),
    currentRound: resolvedState.gameRun?.currentRound ?? '',
    showReconnecting: resolvedState.gameRun?.mode === 'challenge' && resolvedState.sseConnected === false,
    bagRows: controller.bagRows(),
    totalRows: controller.effectiveRows(),
    runRefreshCost: prepRefreshCost(resolvedState.gameRunRefreshCount, refreshPricing),
    runSellPriceLabel: prepSellPriceLabel({
      sellDragOver: resolvedState.sellDragOver,
      draggingArtifactId: resolvedState.draggingArtifactId,
      freshPurchases: resolvedState.freshPurchases,
      getArtifact,
      getArtifactPrice
    }),
    activeFusionReveal: resolvedState.fusionRevealQueue?.[0] || null
  };
}

export function bagRowEntryFor(bagRows = [], cx, cy) {
  const slotMatch = (bagRows || []).find(
    (br) => br?.row === cy && br.enabledCells?.includes(cx)
  );
  if (slotMatch) return slotMatch;
  const bboxMatch = (bagRows || []).find((br) => {
    if (br?.row !== cy) return false;
    const start = br.bboxStart ?? br.enabledCells?.[0] ?? -1;
    const end = br.bboxEnd ?? ((br.enabledCells?.[br.enabledCells.length - 1] ?? -1) + 1);
    return cx >= start && cx < end;
  });
  return bboxMatch || null;
}

export function classifyCell(bagRows = [], cx, cy, baseRect = null) {
  const baseCols = Number(baseRect?.cols ?? baseRect?.columns ?? 0);
  const baseRows = Number(baseRect?.rows ?? 0);
  if (
    baseRect
    && cx >= 0 && cx < baseCols
    && cy >= 0 && cy < baseRows
  ) {
    return 'base-inv';
  }
  const entry = bagRowEntryFor(bagRows, cx, cy);
  if (!entry) return 'bag-empty';
  if (entry.enabledCells?.includes(cx)) return 'bag-slot';
  return 'bag-box';
}

export function occupiedCellKeys(items = []) {
  const occupied = new Set();
  for (const item of items || []) {
    const width = Number(item?.width) || 1;
    const height = Number(item?.height) || 1;
    const x = Number(item?.x);
    const y = Number(item?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    for (let dx = 0; dx < width; dx += 1) {
      for (let dy = 0; dy < height; dy += 1) {
        occupied.add(`${x + dx}:${y + dy}`);
      }
    }
  }
  return occupied;
}

export function buildOccupiedCellMap(items = [], {
  valueForItem = (item) => item?.artifactId
} = {}) {
  const occupied = new Map();
  for (const item of items || []) {
    const width = Number(item?.width) || 1;
    const height = Number(item?.height) || 1;
    const x = Number(item?.x);
    const y = Number(item?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const value = valueForItem(item);
    for (let dx = 0; dx < width; dx += 1) {
      for (let dy = 0; dy < height; dy += 1) {
        occupied.set(`${x + dx}:${y + dy}`, value);
      }
    }
  }
  return occupied;
}

function collectionHas(collection, value) {
  if (value == null || value === '' || !collection) return false;
  if (typeof collection.has === 'function') return collection.has(value);
  if (Array.isArray(collection)) return collection.includes(value);
  return false;
}

function normalizePreviewCellSet(placementPreview) {
  if (!placementPreview) return null;
  if (placementPreview.cellSet instanceof Set) return placementPreview.cellSet;
  if (Array.isArray(placementPreview.cells)) return new Set(placementPreview.cells);
  return null;
}

export function shapeGridBoardCells({
  columns = 0,
  rows = 0,
  bagRows = [],
  items = [],
  baseRect = null,
  inventoryVariant = true,
  placementPreview = null,
  hoverCellIndex = -1,
  interactiveCells = false,
  droppable = false
} = {}) {
  const resolvedColumns = Math.max(0, numberOr(columns));
  const resolvedRows = Math.max(0, numberOr(rows));
  const occupied = occupiedCellKeys(items);
  const previewCellSet = normalizePreviewCellSet(placementPreview);
  const cells = [];

  for (let index = 0; index < resolvedColumns * resolvedRows; index += 1) {
    const x = index % resolvedColumns;
    const y = Math.floor(index / resolvedColumns);
    const classification = classifyCell(bagRows, x, y, inventoryVariant ? baseRect : null);
    const bagRow = bagRowEntryFor(bagRows, x, y);
    const inPreview = Boolean(previewCellSet?.has(`${x}:${y}`));
    const baseInventory = classification === 'base-inv';
    const bagSlot = !baseInventory && classification === 'bag-slot';
    const bagBox = !bagSlot && classification === 'bag-box';
    const bagEmpty = Boolean(inventoryVariant && !baseInventory && !bagSlot && !bagBox);

    cells.push({
      key: `${x}:${y}`,
      index,
      x,
      y,
      kind: classification,
      bagRow,
      bagArtifactId: bagRow?.artifactId || null,
      bagColor: bagSlot ? bagRow?.color || '' : '',
      occupied: occupied.has(`${x}:${y}`),
      interactive: Boolean(interactiveCells),
      dropTarget: Boolean(droppable && hoverCellIndex === index),
      baseInventory,
      bagSlot,
      bagBox,
      bagEmpty,
      preview: inPreview,
      previewValid: Boolean(inPreview && placementPreview?.valid),
      previewInvalid: Boolean(inPreview && !placementPreview?.valid),
      previewFamily: inPreview ? placementPreview?.family || 'none' : ''
    });
  }

  return cells;
}

export function shapeGridBoardPieces(items = [], {
  highlightedRowIds = null,
  keyForItem = (item) => `${item?.artifactId || 'item'}:${item?.id ?? item?.rowId ?? ''}:${item?.x ?? 0}:${item?.y ?? 0}`
} = {}) {
  return (items || []).map((item, index) => {
    const x = numberOr(item?.x);
    const y = numberOr(item?.y);
    const width = Math.max(1, numberOr(item?.width, 1));
    const height = Math.max(1, numberOr(item?.height, 1));
    const rowId = item?.id ?? item?.rowId ?? '';
    return {
      ...item,
      key: keyForItem(item, index),
      index,
      rowId,
      x,
      y,
      width,
      height,
      gridColumnStart: x + 1,
      gridRowStart: y + 1,
      gridColumnSpan: width,
      gridRowSpan: height,
      gridColumn: `${x + 1} / span ${width}`,
      gridRow: `${y + 1} / span ${height}`,
      highlighted: collectionHas(highlightedRowIds, rowId),
      dataset: {
        artifactId: item?.artifactId || '',
        rowId,
        x,
        y,
        width,
        height
      }
    };
  });
}

export function shapeGridBagSlotCells(bagRows = []) {
  return (bagRows || []).flatMap((row) => (row?.enabledCells || []).map((cellX) => ({
    key: `bag:${row.bagId || row.artifactId || 'bag'}:${cellX}:${row.row}`,
    bagId: row.bagId,
    artifactId: row.artifactId,
    color: row.color || '',
    rotation: numberOr(row.rotation),
    x: cellX,
    y: numberOr(row.row),
    gridColumnStart: cellX + 1,
    gridRowStart: numberOr(row.row) + 1,
    bagRow: row
  })));
}

export function preferredArtifactOrientation(artifact) {
  const width = Number(artifact?.width) || 0;
  const height = Number(artifact?.height) || 0;
  if (Array.isArray(artifact?.shape)) {
    const shape = artifact.shape;
    return {
      width: Number(shape[0]?.length) || width,
      height: Number(shape.length) || height
    };
  }
  if (width !== height) {
    const longSide = Math.max(width, height);
    const shortSide = Math.min(width, height);
    return { width: longSide, height: shortSide };
  }
  return { width, height };
}

export function artifactPreviewOrientation(artifact, {
  bagFamily = 'bag'
} = {}) {
  const width = Number(artifact?.width) || 1;
  const height = Number(artifact?.height) || 1;
  if (Array.isArray(artifact?.shape)) {
    const shape = artifact.shape;
    return {
      width: Number(shape[0]?.length) || width,
      height: Number(shape.length) || height
    };
  }
  if (artifact?.family === bagFamily && width !== height) {
    const longSide = Math.max(width, height);
    const shortSide = Math.min(width, height);
    return { width: longSide, height: shortSide };
  }
  return { width, height };
}

export const DEFAULT_ARTIFACT_STAT_KEYS = ['damage', 'armor', 'speed', 'stunChance'];
export const DEFAULT_ARTIFACT_STAT_SUFFIX_BY_KEY = { stunChance: '%' };

function identity(value) {
  return value || '';
}

function numberOr(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function artifactStatKeys(statKeys, fallback = DEFAULT_ARTIFACT_STAT_KEYS) {
  return Array.isArray(statKeys) && statKeys.length ? statKeys : fallback;
}

function artifactLookupById(artifacts) {
  if (typeof artifacts === 'function') return artifacts;
  if (artifacts instanceof Map) return (id) => artifacts.get(id);
  if (artifacts && typeof artifacts === 'object' && !Array.isArray(artifacts)) {
    return (id) => artifacts[id];
  }
  const map = new Map((artifacts || []).filter(Boolean).map((artifact) => [artifact.id, artifact]));
  return (id) => map.get(id);
}

function titleCaseIdentifier(value, fallback = 'Artifact') {
  const normalized = String(value || '')
    .replace(/[_-]+/g, ' ')
    .trim();
  if (!normalized) return fallback;
  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeTileShape(shape) {
  if (!Array.isArray(shape) || shape.length === 0) return null;
  const width = Math.max(0, ...shape.map((row) => Array.isArray(row) ? row.length : 0));
  if (!width) return null;
  return shape.map((row) => Array.from({ length: width }, (_, index) => row?.[index] ? 1 : 0));
}

function rectangleTileShape(width, height) {
  const cols = Math.max(1, numberOr(width, 1));
  const rows = Math.max(1, numberOr(height, 1));
  return Array.from({ length: rows }, () => Array(cols).fill(1));
}

function tileShapeHasGaps(shape) {
  return Boolean(shape?.some((row) => row.some((cell) => !cell)));
}

function explicitTileShapeFor(artifact, {
  shape = null,
  shapeForArtifact = null
} = {}) {
  const providedShape = shape || (typeof shapeForArtifact === 'function' ? shapeForArtifact(artifact) : null);
  return normalizeTileShape(providedShape || artifact?.shape);
}

export const DEFAULT_ARTIFACT_TILE_SHINE_TIERS = {
  plain: { id: 'plain', label: 'Plain', rank: 1, cssClass: 'artifact-shine--plain' },
  bright: { id: 'bright', label: 'Bright', rank: 2, cssClass: 'artifact-shine--bright' },
  radiant: { id: 'radiant', label: 'Radiant', rank: 3, cssClass: 'artifact-shine--radiant' },
  signature: { id: 'signature', label: 'Signature', rank: 4, cssClass: 'artifact-shine--signature' }
};

export function artifactTileFootprintShape(artifact, options = {}) {
  return explicitTileShapeFor(artifact, options)
    || rectangleTileShape(artifact?.width, artifact?.height);
}

export function artifactTileFootprintDimensions(artifact, options = {}) {
  const shape = artifactTileFootprintShape(artifact, options);
  return {
    cols: shape[0]?.length || 1,
    rows: shape.length || 1
  };
}

export function artifactTileFootprintType(artifact, options = {}) {
  const shape = artifactTileFootprintShape(artifact, options);
  const explicitShape = explicitTileShapeFor(artifact, options);
  if (
    explicitShape
    && (tileShapeHasGaps(shape) || artifact?.family === (options.bagFamily || 'bag'))
  ) {
    return 'mask';
  }
  const { cols, rows } = artifactTileFootprintDimensions(artifact, options);
  if (cols === 1 && rows === 1) return 'single';
  if (cols > rows) return 'wide';
  if (rows > cols) return 'tall';
  return 'block';
}

export function defaultArtifactTileRole(artifact, {
  bagFamily = 'bag',
  roles = null
} = {}) {
  const roleId = artifact?.family === bagFamily
    ? bagFamily
    : (artifact?.family || 'artifact');
  const role = roles?.[roleId] || roles?.artifact || {};
  return {
    id: role.id || roleId,
    label: role.label || titleCaseIdentifier(roleId),
    ...role
  };
}

export function defaultArtifactTileShine(artifact, {
  shineTiers = DEFAULT_ARTIFACT_TILE_SHINE_TIERS,
  bagFamily = 'bag',
  shapeForArtifact = null
} = {}) {
  if (artifact?.characterItem || (artifact?.starterOnly && artifact?.family !== bagFamily)) {
    return shineTiers.signature;
  }
  if (Number(artifact?.price) >= 3) return shineTiers.radiant;
  const footprint = artifactTileFootprintDimensions(artifact, { shapeForArtifact });
  if (Number(artifact?.price) >= 2 || footprint.cols * footprint.rows >= 2) {
    return shineTiers.bright;
  }
  return shineTiers.plain;
}

export function defaultArtifactTileVisual(artifact, options = {}) {
  const role = typeof options.roleForArtifact === 'function'
    ? options.roleForArtifact(artifact)
    : defaultArtifactTileRole(artifact, options);
  const shine = typeof options.shineForArtifact === 'function'
    ? options.shineForArtifact(artifact)
    : defaultArtifactTileShine(artifact, options);
  return {
    role,
    shine,
    footprintType: artifactTileFootprintType(artifact, options),
    cssClasses: [
      `artifact-role--${role?.id || 'artifact'}`,
      shine?.cssClass || `artifact-shine--${shine?.id || 'plain'}`
    ]
  };
}

function artifactTileImageSrc(artifact, {
  imageForArtifact = null,
  imageBasePath = '',
  imageExtension = '.png'
} = {}) {
  if (typeof imageForArtifact === 'function') return imageForArtifact(artifact) || '';
  if (artifact?.image) return artifact.image;
  if (artifact?.imageSrc) return artifact.imageSrc;
  if (artifact?.imageUrl) return artifact.imageUrl;
  const imageId = artifact?.imageId || artifact?.id;
  if (!imageId || !imageBasePath) return '';
  return `${String(imageBasePath).replace(/\/$/, '')}/${imageId}${imageExtension}`;
}

function resolveArtifactTileVisual(artifact, options = {}) {
  const visual = typeof options.visualForArtifact === 'function'
    ? (options.visualForArtifact(artifact) || {})
    : defaultArtifactTileVisual(artifact, options);
  const role = visual.role || (typeof options.roleForArtifact === 'function'
    ? options.roleForArtifact(artifact)
    : defaultArtifactTileRole(artifact, options));
  const shine = visual.shine || (typeof options.shineForArtifact === 'function'
    ? options.shineForArtifact(artifact)
    : defaultArtifactTileShine(artifact, options));
  const cssClasses = Array.isArray(visual.cssClasses) && visual.cssClasses.length
    ? visual.cssClasses
    : [
        `artifact-role--${role?.id || 'artifact'}`,
        shine?.cssClass || `artifact-shine--${shine?.id || 'plain'}`
      ];
  return {
    ...visual,
    role,
    shine,
    footprintType: visual.footprintType || artifactTileFootprintType(artifact, options),
    cssClasses
  };
}

export function shapeArtifactTileDisplay(artifact, {
  displayWidth = null,
  displayHeight = null,
  shape = null,
  shapeForArtifact = null,
  visualForArtifact = null,
  roleForArtifact = null,
  shineForArtifact = null,
  roleGlyphLabel = null,
  imageForArtifact = null,
  imageBasePath = '',
  imageExtension = '.png',
  cellClass = 'artifact-figure-cell',
  emptyCellClass = 'artifact-figure-cell--empty',
  bitmapClass = 'artifact-figure-bitmap',
  bitmapFullClass = 'artifact-figure-bitmap--full',
  bitmapRotatedClass = 'artifact-figure-bitmap--rotated',
  roleGlyphClass = 'artifact-role-glyph',
  roleGlyphClassPrefix = 'artifact-role-glyph--'
} = {}) {
  if (!artifact) return null;

  const maskShape = explicitTileShapeFor(artifact, { shape, shapeForArtifact });
  const resolvedDisplayWidth = displayWidth != null && Number(displayWidth) > 0
    ? Number(displayWidth)
    : numberOr(artifact.width, 1);
  const resolvedDisplayHeight = displayHeight != null && Number(displayHeight) > 0
    ? Number(displayHeight)
    : numberOr(artifact.height, 1);
  const width = maskShape
    ? (maskShape[0]?.length || 1)
    : Math.max(1, resolvedDisplayWidth);
  const height = maskShape
    ? (maskShape.length || 1)
    : Math.max(1, resolvedDisplayHeight);
  const visual = resolveArtifactTileVisual(artifact, {
    shape: maskShape,
    shapeForArtifact,
    visualForArtifact,
    roleForArtifact,
    shineForArtifact
  });
  const role = visual.role || { id: artifact.family || 'artifact', label: 'Artifact' };
  const shine = visual.shine || DEFAULT_ARTIFACT_TILE_SHINE_TIERS.plain;
  const baseWidth = Math.max(1, numberOr(artifact.width, width));
  const baseHeight = Math.max(1, numberOr(artifact.height, height));
  const rotatedBitmap = !maskShape
    && baseWidth !== baseHeight
    && width === baseHeight
    && height === baseWidth;
  const imageSrc = artifactTileImageSrc(artifact, { imageForArtifact, imageBasePath, imageExtension });
  const imageAlt = artifact.alt || artifact.name || artifact.label || artifact.id || '';
  const roleLabel = typeof roleGlyphLabel === 'function'
    ? roleGlyphLabel(role, artifact, visual)
    : `${role.label || titleCaseIdentifier(role.id)} role`;
  const cells = Array.from({ length: width * height }, (_, index) => {
    const x = index % width;
    const y = Math.floor(index / width);
    const filled = maskShape ? Boolean(maskShape[y]?.[x]) : true;
    const classNames = filled ? [cellClass] : [cellClass, emptyCellClass];
    return {
      key: `${x}:${y}`,
      index,
      x,
      y,
      filled,
      empty: !filled,
      classNames,
      className: classNames.join(' ')
    };
  });
  const imageClassNames = [bitmapClass, bitmapFullClass, rotatedBitmap ? bitmapRotatedClass : ''].filter(Boolean);
  const rotatedImageVars = rotatedBitmap
    ? {
        '--artifact-rotated-bitmap-width': `${(height / width) * 100}%`,
        '--artifact-rotated-bitmap-height': `${(width / height) * 100}%`
      }
    : {};

  return {
    artifact,
    id: artifact.id || '',
    family: artifact.family || '',
    label: artifact.name || artifact.label || artifact.id || '',
    width,
    height,
    baseWidth,
    baseHeight,
    shape: maskShape,
    hasMask: Boolean(maskShape),
    footprintType: visual.footprintType || artifactTileFootprintType(artifact, { shape: maskShape, shapeForArtifact }),
    role,
    roleId: role.id || '',
    shine,
    shineId: shine.id || '',
    cssClasses: visual.cssClasses || [],
    gridStyle: {
      gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
      gridTemplateRows: `repeat(${height}, minmax(0, 1fr))`,
      ...(role.color ? { '--artifact-role-color': role.color } : {})
    },
    cells,
    imageSrc,
    imageAlt,
    rotatedImage: rotatedBitmap,
    imageClassNames,
    imageStyle: {
      ...(imageSrc ? { backgroundImage: `url('${imageSrc}')` } : {}),
      ...rotatedImageVars
    },
    rotatedImageVars,
    roleGlyph: {
      roleId: role.id || '',
      label: roleLabel,
      classNames: [roleGlyphClass, `${roleGlyphClassPrefix}${role.id || 'artifact'}`]
    },
    dataset: {
      artifactId: artifact.id || '',
      family: artifact.family || '',
      role: role.id || '',
      shine: shine.id || '',
      width,
      height
    }
  };
}

function artifactBonusSource(source) {
  if (!source || typeof source !== 'object') return {};
  if (source.bonus && typeof source.bonus === 'object') return source.bonus;
  return source;
}

function fillTemplate(template, values = {}) {
  return String(template || '').replace(/\{([^}]+)\}/g, (_, key) => values[key] ?? '');
}

export function sumArtifactBonuses(items = [], artifacts = [], {
  statKeys = DEFAULT_ARTIFACT_STAT_KEYS,
  getArtifactId = (item) => item?.artifactId
} = {}) {
  const keys = artifactStatKeys(statKeys);
  const totals = Object.fromEntries(keys.map((key) => [key, 0]));
  const getArtifact = artifactLookupById(artifacts);

  for (const item of items || []) {
    const artifact = getArtifact(getArtifactId(item));
    const bonus = artifactBonusSource(artifact?.bonus);
    for (const key of keys) {
      totals[key] += numberOr(bonus[key]);
    }
  }

  return totals;
}

export function formatStatDelta(value, {
  suffix = '',
  includeSign = true,
  zero = '0'
} = {}) {
  if (value == null) return '';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '';
  if (numeric === 0) return `${zero}${suffix}`;
  const sign = includeSign && numeric > 0 ? '+' : '';
  return `${sign}${numeric}${suffix}`;
}

export function formatArtifactBonusEntries(source, {
  labels = {},
  statKeys = null,
  suffixByKey = DEFAULT_ARTIFACT_STAT_SUFFIX_BY_KEY,
  includeZeroes = false
} = {}) {
  const bonus = artifactBonusSource(source);
  const keys = artifactStatKeys(statKeys, Object.keys(bonus));

  return keys
    .map((key) => {
      const numericValue = Number(bonus[key]);
      if (!Number.isFinite(numericValue)) return null;
      if (!includeZeroes && numericValue === 0) return null;
      return {
        key,
        label: labels[key] || key,
        value: formatStatDelta(numericValue, { suffix: suffixByKey[key] || '' }),
        numericValue,
        positive: numericValue > 0
      };
    })
    .filter(Boolean);
}

export function shapeArtifactStatRows(source, {
  definitions = null,
  labels = {},
  statKeys = null,
  suffixByKey = DEFAULT_ARTIFACT_STAT_SUFFIX_BY_KEY,
  includeZeroes = false
} = {}) {
  const normalizedDefinitions = Array.isArray(definitions) ? definitions.filter(Boolean) : [];
  const keys = normalizedDefinitions.length
    ? normalizedDefinitions.map((definition) => definition.sourceKey || definition.key || definition.id)
    : statKeys;
  const resolvedSuffixByKey = { ...suffixByKey };
  const definitionsByKey = new Map();

  for (const definition of normalizedDefinitions) {
    const key = definition.sourceKey || definition.key || definition.id;
    if (!key) continue;
    definitionsByKey.set(key, definition);
    if (definition.suffix != null) resolvedSuffixByKey[key] = definition.suffix;
  }

  return formatArtifactBonusEntries(source, {
    labels,
    statKeys: keys,
    suffixByKey: resolvedSuffixByKey,
    includeZeroes
  }).map((entry) => {
    const definition = definitionsByKey.get(entry.key) || {};
    const value = entry.numericValue;
    return {
      ...definition,
      id: definition.id || entry.key,
      key: entry.key,
      sourceKey: entry.key,
      label: entry.label,
      text: entry.value,
      value,
      numericValue: value,
      positive: entry.positive,
      sign: value > 0 ? 'positive' : value < 0 ? 'negative' : 'zero'
    };
  });
}

export function formatLoadoutStatsText({
  totals = null,
  items = [],
  artifacts = [],
  labels = {},
  statKeys = DEFAULT_ARTIFACT_STAT_KEYS,
  suffixByKey = DEFAULT_ARTIFACT_STAT_SUFFIX_BY_KEY,
  separator = ' / ',
  getArtifactId = (item) => item?.artifactId
} = {}) {
  const resolvedTotals = totals || sumArtifactBonuses(items, artifacts, { statKeys, getArtifactId });
  return formatArtifactBonusEntries(resolvedTotals, {
    labels,
    statKeys,
    suffixByKey
  })
    .map((entry) => `${entry.label} ${entry.value}`)
    .join(separator);
}

export function shapeShopItemRows({
  offer = [],
  artifacts = [],
  getArtifact = null,
  getArtifactId = (item) => (typeof item === 'string' ? item : item?.artifactId ?? item?.id),
  getArtifactPrice = (artifact) => Number(artifact?.price || 0),
  availableBudget = null,
  balance = null,
  orientationForArtifact = artifactPreviewOrientation,
  formatArtifactBonus = null,
  statDefinitions = null,
  statLabels = {},
  suffixByKey = DEFAULT_ARTIFACT_STAT_SUFFIX_BY_KEY,
  includeZeroStatRows = false
} = {}) {
  const lookupArtifact = getArtifact ? artifactLookupById(getArtifact) : artifactLookupById(artifacts);
  const normalizedBudget = numberOr(availableBudget ?? balance);

  return (offer || []).map((offerItem, index) => {
    const artifactId = getArtifactId(offerItem);
    const artifact = lookupArtifact(artifactId);
    if (!artifact) {
      return {
        id: `${artifactId || 'missing'}:${index}`,
        index,
        artifactId,
        artifact: null,
        missing: true,
        price: 0,
        canAfford: false,
        unavailable: true,
        previewOrientation: { width: 1, height: 1 },
        previewItem: [],
        statRows: []
      };
    }

    const price = Math.max(0, numberOr(getArtifactPrice(artifact, offerItem)));
    const previewOrientation = orientationForArtifact(artifact, offerItem) || artifactPreviewOrientation(artifact);
    const width = Math.max(1, numberOr(previewOrientation.width, 1));
    const height = Math.max(1, numberOr(previewOrientation.height, 1));
    const statRows = typeof formatArtifactBonus === 'function'
      ? (formatArtifactBonus(artifact, offerItem) || [])
      : shapeArtifactStatRows(artifact, {
        definitions: statDefinitions,
        labels: statLabels,
        suffixByKey,
        includeZeroes: includeZeroStatRows
      });

    return {
      id: offerItem?.id || `${artifactId}:${index}`,
      index,
      artifactId,
      artifact,
      missing: false,
      family: artifact.family || '',
      isBag: artifact.family === 'bag',
      characterItem: Boolean(artifact.characterItem),
      slotCount: numberOr(artifact.slotCount),
      price,
      canAfford: price <= normalizedBudget,
      unavailable: price > normalizedBudget,
      previewOrientation: { width, height },
      previewItem: [{ artifactId, x: 0, y: 0, width, height }],
      statRows
    };
  });
}

export function formatAssetPackRarityOdds(pack, {
  rarityLabel = identity
} = {}) {
  const summary = Array.isArray(pack?.raritySummary) && pack.raritySummary.length
    ? pack.raritySummary
    : null;
  if (summary) {
    return summary
      .map((entry) => `${rarityLabel(entry.rarity)} ${Math.round(numberOr(entry.probability) * 100)}%`)
      .join(' · ');
  }
  const items = Array.isArray(pack?.items) ? pack.items : [];
  const total = items.reduce((sum, item) => sum + numberOr(item.dropWeight), 0);
  if (!total) return '';
  const grouped = items.reduce((acc, item) => {
    const rarity = item.rarity || 'common';
    acc[rarity] = (acc[rarity] || 0) + numberOr(item.dropWeight);
    return acc;
  }, {});
  return Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .map(([rarity, weight]) => `${rarityLabel(rarity)} ${Math.round((weight / total) * 100)}%`)
    .join(' · ');
}

export function formatAssetPackGuaranteeText(pack, {
  rarityLabel = identity,
  template = 'Guarantee: {count} {rarity}+'
} = {}) {
  const rules = Array.isArray(pack?.guarantees?.rules) ? pack.guarantees.rules : [];
  return rules
    .filter((rule) => numberOr(rule.count) > 0 && rule.minRarity)
    .map((rule) => fillTemplate(template, {
      count: rule.count,
      rarity: rarityLabel(rule.minRarity)
    }))
    .join(' · ');
}

export function formatAssetPackPityText(pack, {
  rarityLabel = identity,
  template = '{rarity}+ pity in {count} opens',
  readyTemplate = '{rarity}+ guaranteed next open'
} = {}) {
  const rules = Array.isArray(pack?.pity?.rules) ? pack.pity.rules : [];
  return rules
    .filter((rule) => numberOr(rule.threshold) > 0 && rule.minRarity)
    .map((rule) => fillTemplate(rule.active ? readyTemplate : template, {
      rarity: rarityLabel(rule.minRarity),
      count: rule.remaining || rule.threshold
    }))
    .join(' · ');
}

export function formatAssetPackDuplicateText(pack, {
  template = 'Duplicates: {count}'
} = {}) {
  if (!pack?.duplicatePolicy?.enabled) return '';
  return fillTemplate(template, { count: numberOr(pack.duplicateCopies) });
}

export function assetPackIsActive(pack, {
  now = Date.now()
} = {}) {
  if (!pack) return false;
  if (pack.availability) return pack.availability === 'active';
  if (pack.active === false || (pack.status && pack.status !== 'active')) return false;
  const timestamp = typeof now === 'number' ? now : new Date(now).getTime();
  const startsAt = pack.startsAt ? new Date(pack.startsAt).getTime() : null;
  const endsAt = pack.endsAt ? new Date(pack.endsAt).getTime() : null;
  if (startsAt && startsAt > timestamp) return false;
  if (endsAt && endsAt <= timestamp) return false;
  return true;
}

export function assetPackAvailabilityLabel(pack, {
  now = Date.now(),
  labels = {}
} = {}) {
  if (assetPackIsActive(pack, { now })) return '';
  if (pack?.availability === 'invalid') return labels.invalid || '';
  if (pack?.availability === 'disabled') return labels.disabled || labels.unavailable || '';
  if (pack?.availability === 'future') return labels.future || '';
  if (pack?.availability === 'expired') return labels.expired || '';
  const timestamp = typeof now === 'number' ? now : new Date(now).getTime();
  const startsAt = pack?.startsAt ? new Date(pack.startsAt).getTime() : null;
  const endsAt = pack?.endsAt ? new Date(pack.endsAt).getTime() : null;
  if (startsAt && startsAt > timestamp) return labels.future || '';
  if (endsAt && endsAt <= timestamp) return labels.expired || '';
  return labels.unavailable || '';
}

export function summarizeAssetRollPacks({
  portraits = [],
  packs = [],
  ownedAssetIds = [],
  now = Date.now(),
  packName = (pack) => pack?.name || pack?.id || '',
  rarityLabel = identity,
  labels = {}
} = {}) {
  const packById = new Map((packs || []).filter(Boolean).map((pack) => [pack.id, pack]));
  const selectedAssetIds = new Set((portraits || []).map((portrait) => portrait.assetId).filter(Boolean));
  const packIds = new Set((portraits || [])
    .filter((portrait) => portrait.packId && (!portrait.unlocked || portrait.rollAvailable))
    .map((portrait) => portrait.packId));
  for (const pack of packs || []) {
    if ((pack?.items || []).some((item) => selectedAssetIds.has(item.assetId))) {
      packIds.add(pack.id);
    }
  }
  const owned = ownedAssetIds instanceof Set ? ownedAssetIds : new Set(ownedAssetIds || []);

  return [...packIds]
    .map((packId) => packById.get(packId))
    .filter(Boolean)
    .map((pack) => {
      const total = Number.isFinite(Number(pack.totalItems)) ? Number(pack.totalItems) : (pack.items?.length || 0);
      const ownedCount = Number.isFinite(Number(pack.ownedCount))
        ? Number(pack.ownedCount)
        : (pack.items || []).filter((item) => owned.has(item.assetId)).length;
      const left = Number.isFinite(Number(pack.remainingCount))
        ? Number(pack.remainingCount)
        : Math.max(0, total - ownedCount);
      const duplicateEnabled = Boolean(pack.duplicatePolicy?.enabled);
      const burnRules = Array.isArray(pack?.burn?.rules) ? pack.burn.rules : [];
      const readyBurnRule = burnRules.find((rule) => rule.ready) || burnRules[0] || null;
      const rollableCount = Number.isFinite(Number(pack.rollableCount))
        ? Number(pack.rollableCount)
        : duplicateEnabled ? total : left;
      const complete = Boolean(pack.complete) || (!duplicateEnabled && left <= 0);
      const active = assetPackIsActive(pack, { now });
      return {
        id: pack.id,
        name: packName(pack),
        total,
        owned: ownedCount,
        left,
        rollSize: Number(pack.rollSize || 1),
        nextRollItemCount: Number(pack.nextRollItemCount || Math.min(Number(pack.rollSize || 1), rollableCount)),
        active,
        availabilityLabel: assetPackAvailabilityLabel(pack, { now, labels }),
        price: pack.rollPriceAmount || 0,
        complete,
        duplicateEnabled,
        uniqueComplete: Boolean(pack.uniqueComplete),
        copyComplete: Boolean(pack.copyComplete),
        duplicateCopies: numberOr(pack.duplicateCopies),
        canRoll: active && !complete && rollableCount > 0,
        canBurn: active && Boolean(readyBurnRule?.ready),
        burnRuleId: readyBurnRule?.id || null,
        burnCost: numberOr(readyBurnRule?.sourceCount),
        burnRarity: readyBurnRule?.sourceRarity ? rarityLabel(readyBurnRule.sourceRarity) : '',
        odds: formatAssetPackRarityOdds(pack, { rarityLabel }),
        guaranteeText: formatAssetPackGuaranteeText(pack, {
          rarityLabel,
          template: labels.guaranteeTemplate
        }),
        pityText: formatAssetPackPityText(pack, {
          rarityLabel,
          template: labels.pityTemplate,
          readyTemplate: labels.pityReadyTemplate
        }),
        duplicateText: formatAssetPackDuplicateText(pack, {
          template: labels.duplicateTemplate
        })
      };
    });
}

function assetPackCardDetailText(pack, labels = {}) {
  if (pack?.availabilityLabel) return pack.availabilityLabel;
  if (pack?.duplicateEnabled && pack?.copyComplete) {
    return fillTemplate(labels.copiesCompleteTemplate || 'Copies complete: {count}', {
      count: pack.total
    });
  }
  if (pack?.complete) {
    return fillTemplate(labels.completeTemplate || 'Complete: {count}', {
      count: pack.total
    });
  }
  if (pack?.duplicateEnabled && numberOr(pack.rollSize, 1) > 1) {
    return fillTemplate(labels.detailsDuplicateMultiTemplate || '{count} items · {rollSize} per roll · {price}', {
      count: pack.total,
      rollSize: pack.nextRollItemCount,
      price: pack.price
    });
  }
  if (pack?.duplicateEnabled) {
    return fillTemplate(labels.detailsDuplicateTemplate || '{count} items · {price}', {
      count: pack.total,
      price: pack.price
    });
  }
  if (numberOr(pack?.rollSize, 1) > 1) {
    return fillTemplate(labels.detailsMultiTemplate || '{left}/{count} left · {rollSize} per roll · {price}', {
      count: pack.total,
      left: pack.left,
      rollSize: pack.nextRollItemCount,
      price: pack.price
    });
  }
  return fillTemplate(labels.detailsTemplate || '{left}/{count} left · {price}', {
    count: pack?.total,
    left: pack?.left,
    price: pack?.price
  });
}

export function shapeAssetPackCardRows(packs = [], {
  labels = {}
} = {}) {
  return (packs || []).map((pack, index) => {
    const detailText = assetPackCardDetailText(pack, labels);
    const lines = [
      detailText ? { key: 'detail', type: 'detail', text: detailText } : null,
      pack.active && pack.duplicateText
        ? { key: 'duplicates', type: 'duplicates', text: pack.duplicateText }
        : null,
      pack.canRoll && pack.odds
        ? {
            key: 'odds',
            type: 'odds',
            text: fillTemplate(labels.oddsTemplate || 'Odds: {odds}', { odds: pack.odds })
          }
        : null,
      pack.canRoll && pack.guaranteeText
        ? { key: 'guarantee', type: 'guarantee', text: pack.guaranteeText }
        : null,
      pack.canRoll && pack.pityText
        ? { key: 'pity', type: 'pity', text: pack.pityText }
        : null
    ].filter(Boolean);
    const actions = [
      pack.canRoll
        ? {
            key: 'roll',
            kind: 'roll',
            label: labels.rollAction || 'Roll',
            packId: pack.id,
            payload: { packId: pack.id }
          }
        : null,
      pack.canBurn
        ? {
            key: 'burn',
            kind: 'burn',
            label: fillTemplate(labels.burnActionTemplate || 'Burn {count} {rarity}', {
              count: pack.burnCost,
              rarity: pack.burnRarity
            }),
            packId: pack.id,
            ruleId: pack.burnRuleId,
            payload: { packId: pack.id, ruleId: pack.burnRuleId }
          }
        : null
    ].filter(Boolean);

    return {
      ...pack,
      index,
      title: pack.name,
      detailText,
      lines,
      actions,
      actionable: actions.length > 0
    };
  });
}

function readFirstField(source, fields = []) {
  if (!source) return undefined;
  for (const field of fields) {
    if (field && source[field] !== undefined && source[field] !== null) return source[field];
  }
  return undefined;
}

export function resolveWalletBalance({
  wallet = null,
  player = null,
  currencyCode = 'soft_coin',
  profileCurrencyFields = ['profileCurrency', 'profile_currency'],
  legacyField = 'spore',
  legacyFields = null,
  fallback = 0
} = {}) {
  const balance = wallet?.balances?.[currencyCode];
  if (balance !== undefined && balance !== null) return balance;
  const profileCurrency = readFirstField(player, profileCurrencyFields);
  if (profileCurrency !== undefined) return profileCurrency;
  const legacyCurrency = readFirstField(player, legacyFields || [legacyField]);
  return legacyCurrency ?? fallback;
}

export function selectWalletBundles({
  bundles = [],
  bundleSurface = null,
  surface = null
} = {}) {
  if (bundleSurface !== surface) return [];
  return Array.isArray(bundles) ? bundles : [];
}

export function walletBundlesLoadingViewState({
  surface = null
} = {}) {
  return {
    loading: true,
    bundles: [],
    surface,
    errorMessage: ''
  };
}

export function walletBundlesLoadedViewState(bundles = [], {
  surface = null
} = {}) {
  return {
    loading: false,
    bundles: Array.isArray(bundles) ? bundles : [],
    surface,
    errorMessage: ''
  };
}

export function walletBundlesErrorViewState(error, {
  surface = null,
  bundles = [],
  fallbackMessage = 'Failed to load wallet bundles'
} = {}) {
  return {
    loading: false,
    bundles: Array.isArray(bundles) ? bundles : [],
    surface,
    errorMessage: messageFromError(error, fallbackMessage)
  };
}

export function formatWalletBundlePrice(bundle, {
  minorUnitCurrencyDecimals = { USD: 2 },
  currencySymbols = { USD: '$' }
} = {}) {
  const amount = numberOr(bundle?.priceAmount);
  const currency = bundle?.priceCurrency || '';
  if (Object.prototype.hasOwnProperty.call(minorUnitCurrencyDecimals, currency)) {
    const decimals = numberOr(minorUnitCurrencyDecimals[currency]);
    const formatted = (amount / (10 ** decimals)).toFixed(decimals);
    const symbol = currencySymbols[currency] || '';
    return symbol ? `${symbol}${formatted}` : `${formatted} ${currency}`.trim();
  }
  return `${amount} ${currency}`.trim();
}

export function walletPurchaseStatusText(status, {
  labels = {}
} = {}) {
  if (!status) return '';
  return labels[status] || '';
}

export function walletSupportEntries({
  support = {},
  labels = {}
} = {}) {
  return [
    support.supportUrl ? { label: labels.support || 'Support', url: support.supportUrl } : null,
    support.termsUrl ? { label: labels.terms || 'Terms', url: support.termsUrl } : null
  ].filter(Boolean);
}

export function summarizeWalletPurchaseSurface({
  wallet = null,
  player = null,
  currencyCode = 'soft_coin',
  profileCurrencyFields = ['profileCurrency', 'profile_currency'],
  legacyField = 'spore',
  legacyFields = null,
  fallbackBalance = 0,
  bundles = [],
  bundleSurface = null,
  surface = null,
  status = '',
  support = {},
  labels = {}
} = {}) {
  return {
    balance: resolveWalletBalance({
      wallet,
      player,
      currencyCode,
      profileCurrencyFields,
      legacyField,
      legacyFields,
      fallback: fallbackBalance
    }),
    bundles: selectWalletBundles({ bundles, bundleSurface, surface }),
    statusText: walletPurchaseStatusText(status, { labels: labels.status || labels }),
    supportEntries: walletSupportEntries({ support, labels })
  };
}

export function walletPurchaseStatusFromIntent(intent, {
  completedStatus = 'completed',
  expiredStatuses = ['expired'],
  failedStatuses = ['failed', 'cancelled', 'refunded', 'reversed', 'chargeback'],
  checkoutExpiredStatuses = ['expired'],
  checkoutFailedStatuses = ['failed']
} = {}) {
  const status = String(intent?.status || '').toLowerCase();
  const checkoutStatus = String(intent?.checkoutStatus || '').toLowerCase();
  if (status === String(completedStatus || '').toLowerCase()) return 'confirmed';
  if (statusIn(expiredStatuses, status) || statusIn(checkoutExpiredStatuses, checkoutStatus)) return 'expired';
  if (statusIn(failedStatuses, status) || statusIn(checkoutFailedStatuses, checkoutStatus)) return 'failed';
  return '';
}

export function walletPurchaseStatusFromTelegramInvoice(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'paid') return 'confirmed';
  if (normalized === 'pending') return 'pending';
  if (normalized === 'expired') return 'expired';
  if (['failed', 'cancelled'].includes(normalized)) return 'failed';
  return 'failed';
}

export function walletPurchaseOpeningViewState({
  status = 'opening'
} = {}) {
  return {
    status,
    errorMessage: ''
  };
}

export function walletPurchaseIntentViewState(intent, options = {}) {
  const status = walletPurchaseStatusFromIntent(intent, options);
  return {
    status,
    handled: Boolean(status),
    shouldRefresh: status === 'confirmed'
  };
}

export function walletPurchaseCheckoutViewState({
  checkout = {},
  hasTelegramInvoice = false,
  hasWebCheckout = false,
  setupRequiredMessage = 'Wallet purchases are not configured yet',
  unavailableMessage = 'Payment checkout is not available'
} = {}) {
  if (hasTelegramInvoice || hasWebCheckout) {
    return {
      status: 'opened',
      errorMessage: '',
      canOpen: true
    };
  }
  return {
    status: 'failed',
    errorMessage: checkout?.setupRequired ? setupRequiredMessage : unavailableMessage,
    canOpen: false
  };
}

export function walletPurchaseNextAction(intent, {
  hasTelegramInvoice = false,
  hasWebCheckout = false,
  setupRequiredMessage = 'Wallet purchases are not configured yet',
  unavailableMessage = 'Payment checkout is not available',
  intentOptions = {}
} = {}) {
  const intentViewState = walletPurchaseIntentViewState(intent, intentOptions);
  if (intentViewState.handled) {
    return {
      action: 'status',
      status: intentViewState.status,
      errorMessage: '',
      shouldRefresh: intentViewState.shouldRefresh,
      checkout: null,
      invoiceLink: null,
      checkoutUrl: null,
      viewState: intentViewState
    };
  }

  const checkout = intent?.checkout && typeof intent.checkout === 'object' ? intent.checkout : {};
  const canOpenTelegramInvoice = Boolean(checkout.invoiceLink) && Boolean(hasTelegramInvoice);
  const canOpenWebCheckout = Boolean(checkout.checkoutUrl) && Boolean(hasWebCheckout);
  const checkoutViewState = walletPurchaseCheckoutViewState({
    checkout,
    hasTelegramInvoice: canOpenTelegramInvoice,
    hasWebCheckout: canOpenWebCheckout,
    setupRequiredMessage,
    unavailableMessage
  });
  return {
    action: canOpenTelegramInvoice ? 'telegram_invoice' : canOpenWebCheckout ? 'web_checkout' : 'unavailable',
    status: checkoutViewState.status,
    errorMessage: checkoutViewState.errorMessage,
    shouldRefresh: false,
    checkout,
    invoiceLink: canOpenTelegramInvoice ? checkout.invoiceLink : null,
    checkoutUrl: canOpenWebCheckout ? checkout.checkoutUrl : null,
    viewState: checkoutViewState
  };
}

export function walletPurchaseErrorViewState(error, {
  fallbackMessage = 'Failed to start wallet purchase'
} = {}) {
  return {
    status: 'failed',
    errorMessage: messageFromError(error, fallbackMessage)
  };
}

function localizeUnknownName(value) {
  if (value && typeof value === 'object') return value.en || Object.values(value)[0] || '';
  return value || '';
}

function statusIn(statuses = [], value) {
  return statuses.some((status) => value === String(status || '').toLowerCase());
}

function includesAny(value, patterns = []) {
  return patterns.some((pattern) => value.includes(String(pattern || '').toLowerCase()));
}

function messageFromError(error, fallbackMessage = '') {
  if (typeof error === 'string') return error || fallbackMessage;
  return error?.message || fallbackMessage;
}

export function assetRollStatusFromError(error, {
  completePatterns = ['no unowned assets', 'no rollable assets'],
  burnUnavailablePatterns = ['duplicate assets'],
  insufficientPatterns = ['insufficient', 'not enough'],
  disabledPatterns = ['disabled'],
  unavailablePatterns = ['not active', 'inactive', 'expired'],
  invalidPatterns = ['configuration is invalid']
} = {}) {
  const message = String(error?.message || error || '').toLowerCase();
  if (includesAny(message, completePatterns)) return 'complete';
  if (includesAny(message, burnUnavailablePatterns)) return 'burn_unavailable';
  if (includesAny(message, insufficientPatterns)) return 'insufficient';
  if (includesAny(message, disabledPatterns)) return 'disabled';
  if (includesAny(message, unavailablePatterns)) return 'unavailable';
  if (includesAny(message, invalidPatterns)) return 'invalid';
  return 'failed';
}

export function assetRollPendingViewState({
  status = 'rolling'
} = {}) {
  return {
    status,
    result: null,
    errorMessage: '',
    globalErrorMessage: ''
  };
}

export function assetRollResultViewState(response, {
  successKey = 'roll',
  resultKey = 'rollResult',
  successStatus = 'success',
  failureStatus = 'failed',
  failureMessage = 'Failed to roll pack'
} = {}) {
  const success = successKey ? Boolean(response?.[successKey]) : Boolean(response);
  if (success) {
    return {
      status: successStatus,
      result: resultKey ? response?.[resultKey] || null : response || null,
      errorMessage: '',
      globalErrorMessage: ''
    };
  }
  return {
    status: failureStatus,
    result: null,
    errorMessage: failureMessage,
    globalErrorMessage: ''
  };
}

export function assetRollErrorViewState(error, {
  fallbackMessage = 'Failed to roll pack',
  globalErrorStatuses = ['failed', 'invalid'],
  statusOptions = {}
} = {}) {
  const status = assetRollStatusFromError(error, statusOptions);
  const errorMessage = messageFromError(error, fallbackMessage);
  const shouldSurface = new Set(globalErrorStatuses || []).has(status);
  return {
    status,
    result: null,
    errorMessage,
    globalErrorMessage: shouldSurface ? errorMessage : ''
  };
}

export function assetRollMutationResultViewState(response, options = {}) {
  const viewState = assetRollResultViewState(response, options);
  const refreshStatuses = Array.isArray(options.refreshStatuses)
    ? options.refreshStatuses
    : [options.successStatus || 'success'];
  return {
    ...viewState,
    shouldRefresh: refreshStatuses.includes(viewState.status)
  };
}

export function assetRollMutationErrorViewState(error, options = {}) {
  return {
    ...assetRollErrorViewState(error, options),
    shouldRefresh: false
  };
}

function runArrayFrom(value) {
  return Array.isArray(value) ? value : [];
}

function gameRunCompletionRunFrom(response) {
  if (!response) return null;
  return {
    id: response.id,
    mode: response.mode,
    status: response.status,
    currentRound: response.currentRound,
    startedAt: response.startedAt,
    endedAt: response.endedAt,
    endReason: response.endReason,
    completionBonus: response.completionBonus || null,
    player: response.player || null
  };
}

function gameRunCompletionResultFrom(response) {
  if (!response) return null;
  return {
    id: response.id,
    mode: response.mode,
    status: response.status,
    currentRound: response.currentRound,
    endedAt: response.endedAt,
    endReason: response.endReason,
    completionBonus: response.completionBonus || null,
    season: response.season || null,
    achievements: runArrayFrom(response.achievements),
    player: response.player || null,
    playerResults: response.playerResults || null,
    lastRound: response.lastRound || null,
    rounds: runArrayFrom(response.rounds)
  };
}

function mergeGameRunRound(previousRounds, currentRound) {
  if (!currentRound) return previousRounds;
  return [
    ...previousRounds.filter((round) => round?.roundNumber !== currentRound.roundNumber),
    currentRound
  ].sort((a, b) => (a?.roundNumber || 0) - (b?.roundNumber || 0));
}

function gameRunIsCompleteStatus(status) {
  return status === 'completed' || status === 'abandoned';
}

export function gameRunStartResultViewState(response) {
  const run = response
    ? {
        ...response,
        loadoutItems: runArrayFrom(response.loadoutItems)
      }
    : null;
  return {
    run,
    rounds: [],
    shopOffer: runArrayFrom(run?.shopOffer),
    refreshCount: 0,
    result: null,
    fusionRevealQueue: [],
    errorMessage: ''
  };
}

export function gameRunReadyResultViewState(response, {
  run = null,
  previousRounds = null
} = {}) {
  const waiting = Boolean(response?.waiting);
  const baseRounds = Array.isArray(previousRounds)
    ? previousRounds
    : runArrayFrom(run?.rounds);
  const currentRound = response?.lastRound || null;
  const rounds = waiting
    ? baseRounds
    : mergeGameRunRound(baseRounds, currentRound);
  const resultRounds = runArrayFrom(response?.rounds).length
    ? response.rounds
    : rounds;
  let nextRun = run || null;

  if (!waiting && nextRun) {
    nextRun = {
      ...nextRun,
      currentRound: response?.currentRound ?? nextRun.currentRound,
      player: response?.player || nextRun.player,
      rounds
    };
    if (gameRunIsCompleteStatus(response?.status)) {
      nextRun = {
        ...nextRun,
        status: response.status,
        endReason: response.endReason,
        completionBonus: response.completionBonus || null,
        rounds
      };
    }
  }

  const battleId = response?.lastRound?.battleId || null;
  const status = response?.status || nextRun?.status || '';
  return {
    waiting,
    run: nextRun,
    result: waiting || !response ? null : { ...response, rounds: resultRounds },
    rounds,
    battleId,
    battle: response?.battle || null,
    shouldLoadReplay: Boolean(battleId),
    shouldShowComplete: !battleId && gameRunIsCompleteStatus(status),
    completionGameRunId: response?.id || nextRun?.id || null,
    errorMessage: ''
  };
}

export function gameRunRoundTransitionViewState(resolvedRun, {
  run = null
} = {}) {
  const hasRunPayload = Array.isArray(resolvedRun?.loadoutItems) && Array.isArray(resolvedRun?.shopOffer);
  const nextRun = hasRunPayload && run
    ? {
        ...run,
        status: resolvedRun.status || run.status,
        currentRound: resolvedRun.currentRound ?? run.currentRound,
        player: resolvedRun.player || run.player,
        shopOffer: resolvedRun.shopOffer,
        loadoutItems: resolvedRun.loadoutItems
      }
    : run || null;
  return {
    run: nextRun,
    result: null,
    refreshCount: 0,
    fusionRevealQueue: runArrayFrom(resolvedRun?.fusions),
    shopOffer: hasRunPayload ? resolvedRun.shopOffer : [],
    loadoutItems: hasRunPayload ? resolvedRun.loadoutItems : [],
    shouldRefreshBootstrap: !hasRunPayload,
    errorMessage: ''
  };
}

export function gameRunCompletionResultViewState(response) {
  return {
    run: gameRunCompletionRunFrom(response),
    result: gameRunCompletionResultFrom(response),
    rounds: runArrayFrom(response?.rounds),
    shopOffer: [],
    errorMessage: ''
  };
}

export const LONG_BATTLE_SPEED_BOOST_2X_INDEX = 45;
export const LONG_BATTLE_SPEED_BOOST_3X_INDEX = 90;
export const LONG_BATTLE_SPEED_BOOST_4X_INDEX = 120;
export const DEFAULT_REPLAY_SPEEDS = [2, 4, 8];

export function replayLongBattleSpeedBoost(eventCount, replayIndex, {
  boost2xIndex = LONG_BATTLE_SPEED_BOOST_2X_INDEX,
  boost3xIndex = LONG_BATTLE_SPEED_BOOST_3X_INDEX,
  boost4xIndex = LONG_BATTLE_SPEED_BOOST_4X_INDEX
} = {}) {
  const count = Number(eventCount) || 0;
  const index = Number(replayIndex) || 0;
  if (count <= boost2xIndex || index < boost2xIndex) return 1;
  if (count > boost4xIndex && index >= boost4xIndex) return 4;
  if (count > boost3xIndex && index >= boost3xIndex) return 3;
  return 2;
}

export function preferredReplaySpeed(settings = null, {
  allowedSpeeds = DEFAULT_REPLAY_SPEEDS,
  fallback = 2
} = {}) {
  const speed = Number(settings?.replaySpeed);
  return allowedSpeeds.includes(speed) ? speed : fallback;
}

export function replayAutoplayDelayViewState({
  eventCount = 0,
  replayIndex = 0,
  replaySpeed = null,
  settings = null,
  defaultDelayMs = 1200,
  fastDelayMs = 600,
  minDelayMs = 50
} = {}) {
  const selectedSpeed = Number(replaySpeed) || preferredReplaySpeed(settings);
  const boost = replayLongBattleSpeedBoost(eventCount, replayIndex);
  const speed = selectedSpeed * boost;
  const baseDelay = settings?.battleSpeed === '2x' ? fastDelayMs : defaultDelayMs;
  return {
    selectedSpeed,
    boost,
    speed,
    baseDelay,
    delay: Math.max(minDelayMs, Math.round(baseDelay / speed))
  };
}

export function replayAdvanceTickViewState({
  battle = null,
  replayIndex = 0
} = {}) {
  const events = runArrayFrom(battle?.events);
  if (!battle || !events.length) {
    return {
      replayIndex: numberOr(replayIndex),
      finished: true,
      shouldStop: true,
      shouldRestartTimer: false,
      previousBoost: 1,
      nextBoost: 1
    };
  }
  const index = numberOr(replayIndex);
  const lastIndex = events.length - 1;
  if (index >= lastIndex) {
    const boost = replayLongBattleSpeedBoost(events.length, index);
    return {
      replayIndex: index,
      finished: true,
      shouldStop: true,
      shouldRestartTimer: false,
      previousBoost: boost,
      nextBoost: boost
    };
  }
  const previousBoost = replayLongBattleSpeedBoost(events.length, index);
  const nextIndex = Math.min(lastIndex, index + 1);
  const nextBoost = replayLongBattleSpeedBoost(events.length, nextIndex);
  return {
    replayIndex: nextIndex,
    finished: nextIndex >= lastIndex,
    shouldStop: false,
    shouldRestartTimer: nextBoost !== previousBoost && nextIndex < lastIndex,
    previousBoost,
    nextBoost
  };
}

export function replayLoadResultViewState(battle, {
  settings = null
} = {}) {
  return {
    currentBattle: battle || null,
    replayIndex: 0,
    replaySpeed: preferredReplaySpeed(settings),
    errorMessage: ''
  };
}

export function replaySetSpeedViewState(speed, {
  settings = null,
  allowedSpeeds = DEFAULT_REPLAY_SPEEDS
} = {}) {
  const nextSpeed = allowedSpeeds.includes(Number(speed))
    ? Number(speed)
    : preferredReplaySpeed(settings, { allowedSpeeds });
  return {
    replaySpeed: nextSpeed,
    settings: settings
      ? {
          ...settings,
          replaySpeed: nextSpeed
        }
      : null,
    shouldPersist: Boolean(settings),
    errorMessage: ''
  };
}

export function shapeReplayEventRows(events = [], {
  replayIndex = null,
  throughIndex = replayIndex,
  eventTypes = null,
  limit = null,
  limitFromEnd = false,
  reverse = false,
  formatEvent = (event) => event?.display || event,
  textForEvent = (event, display) => display?.logText || event?.narration || '',
  activeIndex = replayIndex
} = {}) {
  const source = runArrayFrom(events);
  const maxIndex = throughIndex == null
    ? source.length - 1
    : Math.max(0, Math.min(numberOr(throughIndex), Math.max(0, source.length - 1)));
  const allowedTypes = eventTypes instanceof Set
    ? eventTypes
    : Array.isArray(eventTypes) && eventTypes.length
      ? new Set(eventTypes)
      : null;
  let rows = source
    .slice(0, maxIndex + 1)
    .map((event, eventIndex) => {
      const replayEventIndex = numberOr(event?.replayIndex, eventIndex);
      const display = event?.display !== undefined ? event.display : formatEvent(event, eventIndex);
      return {
        ...event,
        replayIndex: replayEventIndex,
        display,
        text: textForEvent(event, display, eventIndex),
        active: activeIndex != null && replayEventIndex === numberOr(activeIndex)
      };
    });

  if (allowedTypes) rows = rows.filter((row) => allowedTypes.has(row.type));
  const normalizedLimit = Math.max(0, numberOr(limit));
  if (normalizedLimit > 0 && rows.length > normalizedLimit) {
    rows = limitFromEnd ? rows.slice(-normalizedLimit) : rows.slice(0, normalizedLimit);
  }
  if (reverse) rows = [...rows].reverse();
  return rows;
}

export function replayTimelineViewState({
  battle = null,
  replayIndex = 0,
  formatEvent = (event) => event,
  longBattleSpeedBoost = replayLongBattleSpeedBoost
} = {}) {
  const events = runArrayFrom(battle?.events);
  const index = Math.max(0, Math.min(numberOr(replayIndex), Math.max(0, events.length - 1)));
  const activeEvent = events[index] || null;
  const activeDisplay = activeEvent ? formatEvent(activeEvent, index) : null;
  const visibleEvents = shapeReplayEventRows(events, {
    throughIndex: index,
    activeIndex: index,
    formatEvent,
    reverse: true
  });
  const speech = activeDisplay?.speechSide && activeDisplay?.speechText
    ? {
        side: activeDisplay.speechSide,
        narration: activeDisplay.speechText,
        parts: runArrayFrom(activeDisplay.speechParts)
      }
    : null;
  return {
    activeEvent,
    activeDisplay,
    activeSpeech: speech,
    battleStatusText: activeDisplay?.statusText || '',
    replayFinished: events.length > 0 && index >= events.length - 1,
    activeReplayState: activeEvent?.state || null,
    visibleReplayEvents: visibleEvents,
    longBattleSpeedBoost: longBattleSpeedBoost(events.length, index)
  };
}

function patchRunCoins(run, coins) {
  if (!run || coins === undefined) return run || null;
  return {
    ...run,
    player: {
      ...(run.player || {}),
      coins
    }
  };
}

function runShopOfferFrom(response) {
  return Array.isArray(response?.shopOffer) ? response.shopOffer : [];
}

function runShopItemsFrom(items) {
  return Array.isArray(items) ? items : [];
}

function pruneFirstRunItem(items = [], rowId = null, artifactId = null) {
  const list = runShopItemsFrom(items);
  const index = rowId
    ? list.findIndex((item) => item?.id === rowId)
    : list.findIndex((item) => item?.artifactId === artifactId);
  if (index < 0) return list;
  return [
    ...list.slice(0, index),
    ...list.slice(index + 1)
  ];
}

export function runShopRefreshResultViewState(response, {
  run = null
} = {}) {
  return {
    run: patchRunCoins(run, response?.coins),
    shopOffer: runShopOfferFrom(response),
    refreshCount: numberOr(response?.refreshCount),
    errorMessage: ''
  };
}

export function runShopBuyResultViewState(response, {
  run = null,
  containerItems = [],
  freshPurchases = [],
  artifactId = null
} = {}) {
  const boughtArtifactId = response?.artifactId || artifactId;
  const boughtItem = boughtArtifactId
    ? { id: response?.id || null, artifactId: boughtArtifactId }
    : null;
  const currentContainerItems = runShopItemsFrom(containerItems);
  const currentFreshPurchases = runShopItemsFrom(freshPurchases);
  return {
    run: patchRunCoins(run, response?.coins),
    shopOffer: runShopOfferFrom(response),
    containerItems: boughtItem ? [...currentContainerItems, boughtItem] : [...currentContainerItems],
    freshPurchases: boughtArtifactId ? [...currentFreshPurchases, boughtArtifactId] : [...currentFreshPurchases],
    boughtItem,
    errorMessage: ''
  };
}

export function runShopSellResultViewState(response, {
  run = null,
  builderItems = [],
  containerItems = [],
  activeBags = [],
  freshPurchases = [],
  target = null
} = {}) {
  const targetIsObject = target && typeof target === 'object';
  const rowId = response?.id || (targetIsObject ? target.id : null) || null;
  const artifactId = response?.artifactId || (targetIsObject ? target.artifactId : target) || null;
  const currentFreshPurchases = runShopItemsFrom(freshPurchases);
  const freshIndex = currentFreshPurchases.indexOf(artifactId);
  return {
    run: patchRunCoins(run, response?.coins),
    deletedRowId: rowId,
    deletedArtifactId: artifactId,
    builderItems: pruneFirstRunItem(builderItems, rowId, artifactId),
    containerItems: pruneFirstRunItem(containerItems, rowId, artifactId),
    activeBags: pruneFirstRunItem(activeBags, rowId, artifactId),
    freshPurchases: freshIndex >= 0
      ? [
          ...currentFreshPurchases.slice(0, freshIndex),
          ...currentFreshPurchases.slice(freshIndex + 1)
        ]
      : [...currentFreshPurchases],
    errorMessage: ''
  };
}

export function gachaAdminDraftDiffRows(diff) {
  if (!diff || diff.missingBase) return [];
  return [
    ...(diff.changedFields || []).map((change) => ({
      type: 'field',
      field: change.field,
      before: change.before,
      after: change.after
    })),
    ...(diff.addedItems || []).map((assetId) => ({
      type: 'item_added',
      field: assetId,
      before: null,
      after: assetId
    })),
    ...(diff.removedItems || []).map((assetId) => ({
      type: 'item_removed',
      field: assetId,
      before: assetId,
      after: null
    })),
    ...(diff.changedItems || []).map((entry) => ({
      type: 'item_changed',
      field: entry.assetId,
      before: (entry.changes || []).map((change) => change.before),
      after: (entry.changes || []).map((change) => change.after)
    }))
  ];
}

function gachaAdminPositiveNumber(value) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
}

function formatGachaAdminPercent(value) {
  const numeric = Number(value || 0);
  return `${(numeric * 100).toFixed(numeric > 0 && numeric < 0.01 ? 2 : 1)}%`;
}

export function gachaAdminValidationIssueRows(validation) {
  if (!validation) return [];
  return [
    ...(validation.errors || []).map((issue) => ({ ...issue, severity: 'error' })),
    ...(validation.warnings || []).map((issue) => ({ ...issue, severity: 'warning' }))
  ];
}

export function gachaAdminReleaseChecklistRows(checklist) {
  if (!checklist) return [];
  return [
    ...(checklist.blockers || []),
    ...(checklist.warnings || []),
    ...(checklist.passed || [])
  ];
}

export function gachaAdminPlanTotalWeight(planItems = []) {
  return (planItems || []).reduce(
    (sum, item) => sum + gachaAdminPositiveNumber(item?.dropWeight ?? item?.drop_weight),
    0
  );
}

export function gachaAdminPlanCoverageRows(planItems = [], {
  characters = [],
  targetPerCharacter = 5
} = {}) {
  const target = Number(targetPerCharacter) || 5;
  const byCharacter = new Map();
  for (const item of planItems || []) {
    const characterId = item?.characterId ?? item?.character_id;
    const row = byCharacter.get(characterId) || { count: 0, readyCount: 0, totalWeight: 0 };
    row.count += 1;
    if (item?.status === 'ready') row.readyCount += 1;
    row.totalWeight += gachaAdminPositiveNumber(item?.dropWeight ?? item?.drop_weight);
    byCharacter.set(characterId, row);
  }
  return (characters || []).map((character) => {
    const row = byCharacter.get(character.id) || { count: 0, readyCount: 0, totalWeight: 0 };
    return {
      ...character,
      ...row,
      target,
      missing: Math.max(0, target - row.count),
      enough: row.count >= target
    };
  });
}

export function gachaAdminPlanChanceText(item, {
  totalWeight = null,
  formatPercent = formatGachaAdminPercent
} = {}) {
  const total = gachaAdminPositiveNumber(totalWeight);
  if (!total) return '0.0%';
  return formatPercent(gachaAdminPositiveNumber(item?.dropWeight ?? item?.drop_weight) / total);
}

function gachaAdminOddsRows(source, key) {
  if (Array.isArray(source)) return source;
  if (Array.isArray(source?.[key])) return source[key];
  if (Array.isArray(source?.preview?.[key])) return source.preview[key];
  return [];
}

function gachaAdminLimitedRows(rows = [], limit = 8) {
  const numericLimit = Number(limit);
  return Number.isInteger(numericLimit) && numericLimit >= 0
    ? rows.slice(0, numericLimit)
    : rows;
}

export function gachaAdminOddsRarityRows(source = null, {
  formatPercent = formatGachaAdminPercent
} = {}) {
  return gachaAdminOddsRows(source, 'raritySummary').map((row) => ({
    ...row,
    expectedText: formatPercent(row?.probability ?? row?.expectedPerOpen ?? 0),
    dropWeightText: row?.dropWeight || '-'
  }));
}

export function gachaAdminOddsItemRows(source = null, {
  limit = 8,
  formatPercent = formatGachaAdminPercent
} = {}) {
  const rows = gachaAdminOddsRows(source, 'items');
  const limitedRows = gachaAdminLimitedRows(rows, limit);
  return limitedRows.map((row) => ({
    ...row,
    expectedText: formatPercent(row?.probability || 0),
    dropWeightText: row?.dropWeight ?? '-',
    copyLimitText: row?.copyLimit ?? '-'
  }));
}

function gachaAdminOddsTableRows(rows, keyForRow) {
  return rows.map((row, index) => ({
    ...row,
    rowKey: keyForRow(row, index) || String(index)
  }));
}

export function shapeGachaAdminOddsTableSections(source = null, {
  itemLimit = 8,
  formatPercent = formatGachaAdminPercent,
  labels = {}
} = {}) {
  const rarityRows = gachaAdminOddsTableRows(
    gachaAdminOddsRarityRows(source, { formatPercent }),
    (row, index) => row?.rarity || `rarity-${index}`
  );
  const itemRows = gachaAdminOddsTableRows(
    gachaAdminOddsItemRows(source, { limit: itemLimit, formatPercent }),
    (row, index) => row?.assetId || `item-${index}`
  );
  return [
    {
      key: 'rarities',
      title: labels.rarityTitle || 'Rarity odds',
      visible: rarityRows.length > 0,
      columns: [
        { key: 'rarity', field: 'rarity', label: labels.rarity || 'Rarity' },
        { key: 'expected', field: 'expectedText', label: labels.expected || 'Expected' },
        { key: 'count', field: 'count', label: labels.items || 'Items' },
        { key: 'weight', field: 'dropWeightText', label: labels.weight || 'Weight' }
      ],
      rows: rarityRows
    },
    {
      key: 'items',
      title: labels.itemTitle || 'Item odds',
      visible: itemRows.length > 0,
      columns: [
        { key: 'asset', field: 'assetId', label: labels.asset || 'Asset' },
        { key: 'rarity', field: 'rarity', label: labels.rarity || 'Rarity' },
        { key: 'weight', field: 'dropWeightText', label: labels.weight || 'Weight' },
        { key: 'expected', field: 'expectedText', label: labels.expected || 'Expected' },
        { key: 'copy_cap', field: 'copyLimitText', label: labels.copyCap || 'Copy Cap' }
      ],
      rows: itemRows
    }
  ].filter((section) => section.visible);
}

export function gachaAdminFixtureOperationRows(source = null, {
  limit = 8
} = {}) {
  const rows = Array.isArray(source) ? source : source?.operations || [];
  return gachaAdminLimitedRows(rows, limit).map((row) => ({
    ...row,
    afterCountText: row?.afterCount ?? '-'
  }));
}

export function gachaAdminSimulationItemRows(source = null, {
  limit = 8,
  formatPercent = formatGachaAdminPercent
} = {}) {
  const rows = Array.isArray(source) ? source : source?.items || [];
  return gachaAdminLimitedRows(rows, limit).map((row) => ({
    ...row,
    observedPerRollText: formatPercent(row?.observedPerRoll || 0),
    dropWeightText: row?.dropWeight ?? '-'
  }));
}

export function formatAssetRollResultName(result, {
  localizeName = localizeUnknownName
} = {}) {
  const firstItem = Array.isArray(result?.items) ? result.items[0] : null;
  return localizeName(firstItem?.assetName || result?.assetName) ||
    firstItem?.assetId ||
    result?.assetId ||
    '';
}

export function formatAssetRollResultItemsText(result, {
  localizeName = localizeUnknownName,
  rarityLabel = identity,
  itemSeparator = ' · ',
  resultSeparator = ' | ',
  limit = 3
} = {}) {
  const items = Array.isArray(result?.items) ? result.items : [];
  const named = items
    .map((item) => {
      const name = localizeName(item.assetName) || item.assetId || '';
      const rarity = rarityLabel(item.rarity);
      return [name, rarity].filter(Boolean).join(itemSeparator);
    })
    .filter(Boolean);
  if (!named.length) return '';
  if (named.length <= limit) return named.join(resultSeparator);
  return `${named.slice(0, limit).join(resultSeparator)} +${named.length - limit}`;
}

export function summarizeAssetRollFeedback({
  status = '',
  result = null,
  errorMessage = '',
  labels = {},
  localizeName = localizeUnknownName,
  rarityLabel = identity
} = {}) {
  if (!status) return null;
  if (status === 'rolling') {
    return {
      status,
      title: labels.openingTitle || '',
      text: labels.openingText || ''
    };
  }
  if (status === 'burning') {
    return {
      status,
      title: labels.burnOpeningTitle || '',
      text: labels.burnOpeningText || ''
    };
  }
  if (status === 'success' && result) {
    const itemCount = Array.isArray(result?.items) ? result.items.length : 0;
    const count = numberOr(result.count, itemCount || 1);
    if (count > 1) {
      return {
        status,
        title: fillTemplate(labels.multiResultTitleTemplate || '', { count }),
        text: formatAssetRollResultItemsText(result, { localizeName, rarityLabel })
      };
    }
    return {
      status,
      title: labels.resultTitle || '',
      text: fillTemplate(labels.resultTemplate || '', {
        asset: formatAssetRollResultName(result, { localizeName }),
        rarity: rarityLabel(result.rarity)
      })
    };
  }
  if (status === 'burned' && result) {
    return {
      status: 'success',
      title: labels.burnResultTitle || '',
      text: fillTemplate(labels.burnResultTemplate || '', {
        asset: formatAssetRollResultName(result, { localizeName }),
        rarity: rarityLabel(result.rarity)
      })
    };
  }
  if (status === 'success' || status === 'burned') return null;
  return {
    status,
    title: labels.problemTitle || '',
    text: labels.errors?.[status] || errorMessage || ''
  };
}

export function shapeAssetRollResultPanel(input = {}, {
  baseClass = '',
  role = 'status',
  ariaLive = 'polite',
  testId = ''
} = {}) {
  if (!input) return null;
  const feedback = input &&
    Object.prototype.hasOwnProperty.call(input, 'status') &&
    Object.prototype.hasOwnProperty.call(input, 'title') &&
    Object.prototype.hasOwnProperty.call(input, 'text')
    ? input
    : summarizeAssetRollFeedback(input);
  if (!feedback) return null;
  const status = String(feedback.status || '');
  return {
    ...feedback,
    visible: true,
    role,
    ariaLive,
    testId,
    className: [
      baseClass,
      baseClass && status ? `${baseClass}--${status}` : ''
    ].filter(Boolean).join(' '),
    lines: feedback.text ? [{ key: 'text', type: 'text', text: feedback.text }] : []
  };
}
