import {
  evaluateBackpackPlacement,
  getBackpackItemCells,
  getBackpackItemDimensions
} from '../../modules/loadout/interaction-placement.js';

export function createBackpackInteractionState() {
  return { selectedId: '', bagMode: false, preview: null, messageCode: '', busy: false };
}

/** One input owner for both configured and adapter-based preparation screens. */
export function createBackpackInteraction({
  state = createBackpackInteractionState(), getRows, getArtifact,
  columns = 6, getHeight = () => 6, commitRows, onCommitted = () => {},
  isLockedBag = () => false, canInteract = () => true, onSell = null, document: doc = globalThis.document,
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
  const selected = () => rows().find((row) => sameId(row.id, state.selectedId)) || null;
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
  function evaluate(item, x, y, nextRows = rows()) {
    return evaluateBackpackPlacement({
      rows: nextRows, item, x, y, columns, height: getHeight(), getArtifact, isLockedBag
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
    if (!active(item)) {
      return commit({ ok: true, item: rotated, rows: rows().map((row) => sameId(row.id, item.id) ? rotated : row) }, 'rotate');
    }
    return commit(evaluate(rotated, item.x, item.y), 'rotate');
  }
  function unplace() {
    const item = selected();
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
    if (!item || blocked() || typeof onSell !== 'function') return false;
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
  function toggleBagMode() {
    if (blocked()) return;
    cancel();
    state.bagMode = !state.bagMode;
  }
  function boardAt(x, y) {
    for (const board of root?.querySelectorAll?.('[data-backpack-interaction-board]') || []) {
      const first = board.querySelector('[data-cell-x="0"][data-cell-y="0"]');
      if (!first) continue;
      const rect = first.getBoundingClientRect();
      const nextX = board.querySelector('[data-cell-x="1"][data-cell-y="0"]')?.getBoundingClientRect();
      const nextY = board.querySelector('[data-cell-x="0"][data-cell-y="1"]')?.getBoundingClientRect();
      const pitchX = nextX ? nextX.left - rect.left : rect.width;
      const pitchY = nextY ? nextY.top - rect.top : rect.height;
      if (pitchX <= 0 || pitchY <= 0) continue;
      const cellX = Math.floor((x - rect.left) / pitchX);
      const cellY = Math.floor((y - rect.top) / pitchY);
      if (cellX < 0 || cellY < 0 || cellX >= columns || cellY >= getHeight()) continue;
      return { x: cellX, y: cellY, pitchX, pitchY, board };
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
    if (event.target?.closest?.('button.backpack-interaction-action, .artifact-piece-rotate, .active-bag-action')) return;
    const zone = boardAt(event.clientX, event.clientY);
    const target = event.target?.closest?.('[data-backpack-row-id]');
    let item = state.bagMode && zone ? bagAt(zone)
      : rows().find((row) => sameId(row.id, target?.dataset?.backpackRowId));
    if (!item || (zone && !state.bagMode && bag(item))) return;
    if (bag(item) && active(item) && isLockedBag(item)) return;
    const dimensions = getBackpackItemDimensions(item, getArtifact(item.artifactId));
    const rect = target?.getBoundingClientRect?.();
    const offsetX = active(item) && zone ? zone.x - Number(item.x)
      : Math.floor(((event.clientX - (rect?.left ?? event.clientX)) / (rect?.width || 1)) * dimensions.width);
    const offsetY = active(item) && zone ? zone.y - Number(item.y)
      : Math.floor(((event.clientY - (rect?.top ?? event.clientY)) / (rect?.height || 1)) * dimensions.height);
    pointer = {
      id: event.pointerId, startX: event.clientX, startY: event.clientY,
      item, moved: false, target: root,
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
    const cell = boardAt(event.clientX, event.clientY);
    if (cell) previewAt({ x: cell.x - pointer.offsetX, y: cell.y - pointer.offsetY });
    else state.preview = null;
  }
  function onPointerUp(event) {
    if (!pointer || event.pointerId !== pointer.id) return;
    const current = pointer;
    const cell = boardAt(event.clientX, event.clientY);
    clearPointer();
    if (!current.moved) return;
    event.preventDefault();
    if (cell) void placeAt({ x: cell.x - current.offsetX, y: cell.y - current.offsetY });
    else {
      state.preview = null;
      const target = doc?.elementFromPoint?.(event.clientX, event.clientY);
      if (target?.closest?.('.sell-zone')) void sell();
      else if (target?.closest?.('.artifact-container-zone')) void unplace();
    }
  }
  function onPointerCancel(event) {
    if (pointer && (event.pointerId == null || pointer.id === event.pointerId)) {
      clearPointer();
      state.preview = null;
    }
  }
  function onClick(event) {
    if (Date.now() < suppressClickUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
  }
  function onKey(event) {
    if (event.key === 'Escape') cancel();
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
    win?.addEventListener?.('blur', onPointerCancel);
  }
  function clickCell(cell) {
    if (state.bagMode && !state.selectedId) { const item = bagAt(cell); if (item) select(item); }
    else void placeAt(cell);
  }
  return {
    state, select, previewAt, placeAt, rotate, unplace, autoPlace, cancel, sell,
    canSell: () => typeof onSell === 'function', isBusy: blocked,
    toggleBagMode, attach, detach, clickCell, getRows: rows, getSelectedItem: selected
  };
}
