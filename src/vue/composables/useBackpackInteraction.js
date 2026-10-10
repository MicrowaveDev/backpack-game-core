import {
  evaluateBackpackPlacement,
  getBackpackItemCells,
  getBackpackItemDimensions
} from '../../modules/loadout/interaction-placement.js';

export function createBackpackInteractionState() {
  return { selectedId: '', preview: null, dragVisual: null, dropTarget: null, messageCode: '', busy: false };
}

/** One input owner for both configured and adapter-based preparation screens. */
export function createBackpackInteraction({
  state = createBackpackInteractionState(), getRows, getArtifact,
  columns = 6, getHeight = () => 6, commitRows, onCommitted = () => {},
  isLockedBag = () => false, canInteract = () => true, onSell = null, canSellItem = () => true, getSellPrice = () => null, document: doc = globalThis.document,
  win = globalThis.window
}) {
  let root = null;
  let pointer = null;
  let messageTimer = null;
  let suppressClickUntil = 0;
  let disposed = false;
  let generation = 0;
  const rows = () => getRows() || [];
  const sameId = (a, b) => a != null && b != null && String(a) === String(b);
  const selected = () => pointer?.moved ? pointer.item : rows().find((row) => sameId(row.id, state.selectedId)) || null;
  const blocked = () => state.busy || !canInteract();
  const bag = (row) => getArtifact(row?.artifactId)?.family === 'bag';
  const active = (row) => row && Number(row.x) >= 0 && Number(row.y) >= 0;

  function message(code) {
    clearTimeout(messageTimer);
    state.messageCode = code;
    if (code) messageTimer = setTimeout(() => { state.messageCode = ''; }, 2400);
  }
  function clearPointer() {
    const current = pointer;
    pointer = null;
    state.dragVisual = null;
    state.dropTarget = null;
    if (current?.moved) suppressClickUntil = Date.now() + 400;
    try { current?.target?.releasePointerCapture?.(current.id); } catch { /* Already released. */ }
  }
  function cancel() {
    if (state.busy) return;
    clearPointer();
    state.selectedId = '';
    state.preview = null;
    message('');
  }
  function select(value) {
    if (blocked()) return false;
    const id = typeof value === 'object' ? value?.rowId ?? value?.id : value;
    const item = rows().find((row) => sameId(row.id, id));
    if (!item) return false;
    if (bag(item) && active(item) && isLockedBag(item)) { message('locked'); return false; }
    state.selectedId = String(item.id);
    state.preview = null;
    message('');
    return true;
  }
  function evaluate(item, x, y, nextRows = rows(), evacuateBagContents = true) {
    return evaluateBackpackPlacement({
      rows: nextRows, item, x, y, columns, height: getHeight(), getArtifact, isLockedBag, evacuateBagContents
    });
  }
  function previewAt({ x, y }, item = selected()) {
    if (!item) return null;
    const result = evaluate(item, x, y);
    const preview = { ...result, valid: result.ok, x, y };
    state.preview = preview;
    return preview;
  }
  async function commit(result, action) {
    if (blocked() || disposed) return false;
    if (!result.ok) { state.preview = { ...result, valid: false }; message(result.reason); return false; }
    if (result.noOp) { cancel(); return true; }
    const previousRows = rows();
    const commitGeneration = generation;
    state.busy = true;
    message('');
    let saved;
    try { saved = await commitRows(result.rows); }
    catch { saved = false; }
    finally { state.busy = false; }
    if (disposed || generation !== commitGeneration) return false;
    if (saved === false || saved === null) { message('save_failed'); return false; }
    state.preview = null;
    state.selectedId = '';
    try { await onCommitted({ action, item: result.item, rows: result.rows, previousRows }); }
    catch { /* Optional feedback must not undo an already confirmed save. */ }
    return true;
  }
  function placeAt({ x, y }) {
    const item = selected();
    if (!item || blocked()) return Promise.resolve(false);
    return commit(evaluate(item, x, y), 'place');
  }
  function rotate() {
    const item = selected();
    if (!item || blocked()) return Promise.resolve(false);
    const dimensions = getBackpackItemDimensions(item, getArtifact(item.artifactId));
    const rotated = {
      ...item, width: dimensions.height, height: dimensions.width,
      rotated: ((Number(item.rotated) || 0) + 1) % 4
    };
    if (pointer?.moved) {
      const oldVisual = pointer.visual;
      pointer.item = rotated;
      pointer.visual = { ...oldVisual, width: oldVisual.height, height: oldVisual.width,
        grabX: oldVisual.height - oldVisual.grabY, grabY: oldVisual.grabX };
      const pitch = oldVisual.cellWidth + oldVisual.gap;
      pointer.offsetX = Math.max(0, Math.min(rotated.width - 1, Math.floor(pointer.visual.grabX / pitch)));
      pointer.offsetY = Math.max(0, Math.min(rotated.height - 1, Math.floor(pointer.visual.grabY / pitch)));
      const { clientX, clientY } = state.dragVisual;
      state.dragVisual = { ...pointer.visual, clientX, clientY };
      const cell = boardAt(clientX, clientY);
      if (cell) previewAt({ x: cell.x - pointer.offsetX, y: cell.y - pointer.offsetY }, rotated);
      return Promise.resolve(true);
    }
    if (!active(item)) {
      return commit({ ok: true, item: rotated, rows: rows().map((row) => sameId(row.id, item.id) ? rotated : row) }, 'rotate');
    }
    return commit(evaluate(rotated, item.x, item.y, rows(), false), 'rotate');
  }
  function unplace(item = selected()) {
    if (!item || blocked()) return Promise.resolve(false);
    if (bag(item) && isLockedBag(item)) { message('locked'); return Promise.resolve(false); }
    const next = { ...item, x: -1, y: -1, active: false };
    const nextRows = rows().map((row) => sameId(row.id, item.id) ? next : row);
    if (bag(item)) {
      for (const other of nextRows) {
        if (!bag(other) && active(other)) {
          const check = evaluate(other, other.x, other.y, nextRows);
          if (!check.ok) {
            state.preview = { ...check, valid: false };
            message('bag_contents');
            return Promise.resolve(false);
          }
        }
      }
    }
    return commit({ ok: true, item: next, rows: nextRows }, 'unplace');
  }
  function autoPlace() {
    const item = selected();
    if (!item || blocked()) return Promise.resolve(false);
    for (let y = 0; y < getHeight(); y += 1) {
      for (let x = 0; x < columns; x += 1) {
        const result = evaluate(item, x, y);
        if (result.ok) return commit(result, 'place');
      }
    }
    message('no_space');
    return Promise.resolve(false);
  }
  async function sell() {
    const item = selected();
    if (!item || blocked() || typeof onSell !== 'function' || !canSellItem(item)) return false;
    const commitGeneration = generation;
    state.busy = true;
    let saved;
    try { saved = await onSell(item); } catch { saved = false; }
    finally { state.busy = false; }
    if (disposed || generation !== commitGeneration) return false;
    if (saved === false || saved === null) { message('save_failed'); return false; }
    state.selectedId = '';
    state.preview = null;
    message('');
    return true;
  }
  function boardGeometry(board) {
    const first = board?.querySelector('[data-cell-x="0"][data-cell-y="0"]');
    if (!first) return null;
    const rect = first.getBoundingClientRect();
    const nextX = board.querySelector('[data-cell-x="1"][data-cell-y="0"]')?.getBoundingClientRect();
    const nextY = board.querySelector('[data-cell-x="0"][data-cell-y="1"]')?.getBoundingClientRect();
    const pitchX = nextX ? nextX.left - rect.left : rect.width;
    const pitchY = nextY ? nextY.top - rect.top : rect.height;
    return pitchX > 0 && pitchY > 0 ? { rect, pitchX, pitchY, board } : null;
  }
  function boardAt(x, y) {
    for (const board of root?.querySelectorAll?.('[data-backpack-interaction-board]') || []) {
      const geometry = boardGeometry(board);
      if (!geometry) continue;
      const { rect, pitchX, pitchY } = geometry;
      const cellX = Math.floor((x - rect.left) / pitchX);
      const cellY = Math.floor((y - rect.top) / pitchY);
      if (cellX < 0 || cellY < 0 || cellX >= columns || cellY >= getHeight()) continue;
      return { x: cellX, y: cellY, ...geometry };
    }
    return null;
  }
  function bagAt(cell) {
    if (!cell) return null;
    return rows().find((row) => bag(row) && active(row)
      && getBackpackItemCells(row, getArtifact(row.artifactId)).includes(`${cell.x}:${cell.y}`));
  }
  function onPointerDown(event) {
    suppressClickUntil = 0;
    if (blocked() || pointer || event.isPrimary === false || (event.button != null && event.button !== 0)) return;
    if (event.target?.closest?.('button.backpack-interaction-action, .artifact-piece-rotate, .active-bag-action, [data-backpack-context-action]')) return;
    const zone = boardAt(event.clientX, event.clientY);
    if (zone && (event.clientX - zone.rect.left - zone.x * zone.pitchX >= zone.rect.width
      || event.clientY - zone.rect.top - zone.y * zone.pitchY >= zone.rect.height)) return;
    const target = event.target?.closest?.('[data-backpack-row-id]');
    // The usable cell under the pointer owns the hit test, never transparent
    // watermark pixels or rectangular piece gaps. Occupied cells prefer items.
    let item = zone ? rows().find((row) => !bag(row) && active(row)
      && getBackpackItemCells(row, getArtifact(row.artifactId)).includes(`${zone.x}:${zone.y}`)) || bagAt(zone)
      : rows().find((row) => sameId(row.id, target?.dataset?.backpackRowId));
    if (!item) return;
    if (bag(item) && active(item) && isLockedBag(item)) return;
    const dimensions = getBackpackItemDimensions(item, getArtifact(item.artifactId));
    const rect = target?.getBoundingClientRect?.();
    const offsetX = active(item) && zone ? zone.x - Number(item.x)
      : Math.floor(((event.clientX - (rect?.left ?? event.clientX)) / (rect?.width || 1)) * dimensions.width);
    const offsetY = active(item) && zone ? zone.y - Number(item.y)
      : Math.floor(((event.clientY - (rect?.top ?? event.clientY)) / (rect?.height || 1)) * dimensions.height);
    const geometry = zone || boardGeometry([...root?.querySelectorAll?.('[data-backpack-interaction-board]') || []][0]);
    const pitchX = geometry?.pitchX || 50;
    const pitchY = geometry?.pitchY || 50;
    const cellWidth = geometry?.rect.width || pitchX;
    const cellHeight = geometry?.rect.height || pitchY;
    const width = dimensions.width * pitchX - (pitchX - cellWidth);
    const height = dimensions.height * pitchY - (pitchY - cellHeight);
    // Placed rows retain the exact pixel grab point, including gaps. Storage
    // and chips use the same relative point scaled to the destination grid.
    const grabX = active(item) && zone
      ? event.clientX - (geometry.rect.left + Number(item.x) * pitchX)
      : ((event.clientX - (rect?.left ?? event.clientX)) / (rect?.width || 1)) * width;
    const grabY = active(item) && zone
      ? event.clientY - (geometry.rect.top + Number(item.y) * pitchY)
      : ((event.clientY - (rect?.top ?? event.clientY)) / (rect?.height || 1)) * height;
    pointer = {
      id: event.pointerId, startX: event.clientX, startY: event.clientY,
      item, moved: false, target: root,
      visual: { width, height, cellWidth, gap: pitchX - cellWidth,
        grabX: Math.max(0, Math.min(width, grabX)), grabY: Math.max(0, Math.min(height, grabY)) },
      offsetX: Math.max(0, Math.min(dimensions.width - 1, offsetX)),
      offsetY: Math.max(0, Math.min(dimensions.height - 1, offsetY))
    };
  }
  function onPointerMove(event) {
    if (!pointer) {
      if (state.selectedId && !blocked()) {
        const cell = boardAt(event.clientX, event.clientY);
        if (cell) previewAt(cell);
      }
      return;
    }
    if (event.pointerId !== pointer.id) return;
    if (!pointer.moved && Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) < 8) return;
    if (!pointer.moved) {
      if (!select(pointer.item)) { clearPointer(); return; }
      pointer.moved = true;
      try { root.setPointerCapture?.(event.pointerId); } catch { /* Synthetic/older WebView. */ }
    }
    event.preventDefault();
    state.dragVisual = { ...pointer.visual, clientX: event.clientX, clientY: event.clientY };
    const cell = boardAt(event.clientX, event.clientY);
    state.dropTarget = cell ? null : dropTargetAt(event.clientX, event.clientY);
    if (cell) previewAt({ x: cell.x - pointer.offsetX, y: cell.y - pointer.offsetY });
    else state.preview = null;
  }
  function dropTargetAt(x, y) {
    const target = doc?.elementFromPoint?.(x, y);
    const zone = target?.closest?.('[data-backpack-drop-zone]')?.dataset?.backpackDropZone;
    if (zone === 'storage') return zone;
    if (zone === 'sell') return selected() && canSellItem(selected()) && getSellPrice(selected()) != null ? zone : null;
    if (target?.closest?.('.sell-zone')) return selected() && canSellItem(selected()) && getSellPrice(selected()) != null ? 'sell' : null;
    if (target?.closest?.('.artifact-container-zone')) return 'storage';
    return null;
  }
  function onPointerUp(event) {
    if (!pointer || event.pointerId !== pointer.id) return;
    const current = pointer;
    const cell = boardAt(event.clientX, event.clientY);
    clearPointer();
    if (!current.moved) return;
    event.preventDefault();
    if (cell) void commit(evaluate(current.item, cell.x - current.offsetX, cell.y - current.offsetY), 'place');
    else {
      state.preview = null;
      const destination = dropTargetAt(event.clientX, event.clientY);
      if (destination === 'sell') void sell();
      else if (destination === 'storage') void unplace(current.item);
      else cancel();
    }
  }
  function onPointerCancel(event) {
    if (pointer && (event.pointerId == null || pointer.id === event.pointerId)) {
      clearPointer();
      state.preview = null;
    }
  }
  function onClick(event) {
    if (Date.now() < suppressClickUntil && !event.target?.closest?.('.backpack-interaction-action, [data-backpack-context-action], .backpack-bag-context-label')) { event.preventDefault(); event.stopImmediatePropagation(); return; }
    if (state.selectedId && !event.target?.closest?.('[data-backpack-interaction-board], [data-backpack-row-id], [data-backpack-context-action], .backpack-interaction-controls, [data-backpack-drop-zone], .artifact-container-zone, .sell-zone')) cancel();
  }
  function onOutsidePointerDown(event) {
    if (!pointer && state.selectedId && root?.contains && !root.contains(event.target)) cancel();
  }
  function onKey(event) {
    if (event.key === 'Escape') cancel();
    if (event.key?.toLowerCase() === 'r' && state.selectedId
      && !event.target?.closest?.('input, textarea, select, [contenteditable=true]')) { event.preventDefault(); void rotate(); }
  }
  const listeners = [
    ['pointerdown', onPointerDown, true], ['pointermove', onPointerMove, { passive: false }],
    ['pointerup', onPointerUp, { passive: false }], ['pointercancel', onPointerCancel, true],
    ['lostpointercapture', onPointerCancel, true], ['click', onClick, true]
  ];
  function detach() {
    generation += 1;
    for (const [name, listener, options] of listeners) root?.removeEventListener?.(name, listener, options);
    doc?.removeEventListener?.('keydown', onKey);
    doc?.removeEventListener?.('pointerdown', onOutsidePointerDown);
    win?.removeEventListener?.('blur', onPointerCancel);
    clearPointer();
    clearTimeout(messageTimer);
    state.preview = null;
    root = null;
    disposed = true;
  }
  function attach(element) {
    if (root === element) return;
    detach();
    disposed = false;
    root = element;
    for (const [name, listener, options] of listeners) root?.addEventListener?.(name, listener, options);
    doc?.addEventListener?.('keydown', onKey);
    doc?.addEventListener?.('pointerdown', onOutsidePointerDown);
    win?.addEventListener?.('blur', onPointerCancel);
  }
  function clickCell(cell) {
    if (state.selectedId) void placeAt(cell);
  }
  return {
    state, select, previewAt, placeAt, rotate, unplace, autoPlace, cancel, sell,
    canSell: () => typeof onSell === 'function' && !!selected() && canSellItem(selected()), isBusy: blocked,
    getSellPrice: () => { const item = selected(); return item ? getSellPrice(item) : null; },
    attach, detach, clickCell, getRows: rows, getSelectedItem: selected
  };
}
