import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackpackInteraction } from '@microwavedev/backpack-game-core/vue/composables';

const catalog = {
  bag: { family: 'bag', width: 4, height: 4 },
  strip: { family: 'bag', width: 2, height: 1 },
  blade: { family: 'weapon', width: 1, height: 2 },
  square: { family: 'armor', width: 2, height: 2 }
};
const bag = { id: 'bag-one', artifactId: 'bag', x: 0, y: 0, active: true };
const stored = { id: 'blade-one', artifactId: 'blade', x: -1, y: -1, width: 1, height: 2 };
const settle = () => new Promise((resolve) => setImmediate(resolve));

function surface() {
  const listeners = new Map();
  return {
    addEventListener(name, fn) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn); },
    removeEventListener(name, fn) { listeners.get(name)?.delete(fn); },
    emit(name, values = {}) {
      const event = { pointerId: 1, isPrimary: true, button: 0, clientX: 0, clientY: 0,
        prevented: false, stopped: false,
        preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; }, ...values };
      for (const fn of listeners.get(name) || []) fn(event);
      return event;
    },
    listenerCount() { return [...listeners.values()].reduce((sum, set) => sum + set.size, 0); }
  };
}

function fixture(t, { initialRows = [bag, stored], save, origin = 100, canInteract, onSell } = {}) {
  let rows = structuredClone(initialRows);
  const calls = [];
  const committed = [];
  const root = surface();
  const doc = surface();
  const win = surface();
  const captures = [];
  const releases = [];
  root.setPointerCapture = (id) => captures.push(id);
  root.releasePointerCapture = (id) => releases.push(id);
  const board = { querySelector(selector) {
    const x = Number(selector.match(/data-cell-x="(\d+)"/)?.[1]);
    const y = Number(selector.match(/data-cell-y="(\d+)"/)?.[1]);
    return { getBoundingClientRect: () => ({ left: origin + x * 40, top: origin + y * 40, width: 36, height: 36 }) };
  } };
  root.querySelectorAll = () => [board];
  const interaction = createBackpackInteraction({ getRows: () => rows,
    getArtifact: (id) => catalog[id], columns: 4, getHeight: () => 4,
    commitRows: async (next) => {
      calls.push(next);
      const result = save ? await save(next) : true;
      if (result !== false && result !== null) rows = next;
      return result;
    }, onCommitted: (event) => committed.push(event), canInteract, onSell, document: doc, win });
  interaction.attach(root);
  t.after(() => interaction.detach());
  const target = (id, rect = { left: 20, top: 20, width: 40, height: 80 }) => {
    const element = { dataset: { backpackRowId: String(id) }, getBoundingClientRect: () => rect };
    element.closest = (selector) => selector === '[data-backpack-row-id]' ? element : null;
    return element;
  };
  return { interaction, root, doc, win, calls, committed, captures, releases, target, getRows: () => rows,
    point: (x, y) => ({ clientX: origin + x * 40 + 10, clientY: origin + y * 40 + 10 }) };
}

test('two-tap selection keeps placed rows and only saves the explicit target', async (t) => {
  const placed = { ...stored, x: 0, y: 0 };
  const f = fixture(t, { initialRows: [bag, placed] });
  const before = f.getRows();
  assert.equal(f.interaction.select(placed.id), true);
  assert.equal(f.calls.length, 0);
  assert.equal(f.getRows(), before);
  f.interaction.clickCell({ x: 2, y: 1 });
  await settle();
  assert.equal(f.calls.length, 1);
  assert.equal(f.getRows()[1].x, 2);
  assert.equal(f.getRows()[1].y, 1);
  assert.equal(f.interaction.state.selectedId, '');
});

test('dragging the lower cell retains its grab offset and suppresses synthetic click', async (t) => {
  const placed = { ...stored, x: 0, y: 0 };
  const f = fixture(t, { initialRows: [bag, placed] });
  f.root.emit('pointerdown', { target: f.target(placed.id), ...f.point(0, 1) });
  f.root.emit('pointermove', f.point(2, 2));
  assert.equal(f.interaction.state.preview.x, 2);
  assert.equal(f.interaction.state.preview.y, 1);
  assert.deepEqual(f.interaction.state.preview.cells, ['2:1', '2:2']);
  f.root.emit('pointerup', f.point(2, 2));
  await settle();
  assert.equal(f.calls.length, 1);
  assert.equal(f.getRows()[1].y, 1);
  assert.deepEqual(f.captures, [1]);
  assert.deepEqual(f.releases, [1]);
  const click = f.root.emit('click');
  assert.equal(click.prevented, true);
  assert.equal(click.stopped, true);
});

test('storage drag computes grabbed cell from piece rectangle', async (t) => {
  const f = fixture(t);
  f.root.emit('pointerdown', { target: f.target(stored.id), clientX: 35, clientY: 85 });
  f.root.emit('pointermove', f.point(2, 2));
  assert.equal(f.interaction.state.preview.y, 1);
  f.root.emit('pointerup', f.point(2, 2));
  await settle();
  assert.equal(f.getRows()[1].y, 1);
});

test('storage drag retains grab offset when piece rectangle begins at zero', async (t) => {
  const f = fixture(t);
  f.root.emit('pointerdown', { target: f.target(stored.id, { left: 0, top: 0, width: 40, height: 80 }), clientX: 15, clientY: 65 });
  f.root.emit('pointermove', f.point(2, 2));
  assert.equal(f.interaction.state.preview.y, 1);
  f.root.emit('pointerup', f.point(2, 2));
  await settle();
  assert.equal(f.getRows()[1].y, 1);
});

test('numeric instance IDs remain selectable through DOM dataset strings', async (t) => {
  const item = { ...stored, id: 17 };
  const f = fixture(t, { initialRows: [bag, item] });
  f.root.emit('pointerdown', { target: f.target(item.id), clientX: 35, clientY: 30 });
  f.root.emit('pointermove', f.point(1, 1));
  assert.ok(f.interaction.state.preview);
  f.root.emit('pointerup', f.point(1, 1));
  await settle();
  assert.equal(f.getRows()[1].x, 1);
});

test('invalid placement exposes exact conflict cells without saving', async (t) => {
  const f = fixture(t);
  f.interaction.select(stored.id);
  const before = f.getRows();
  assert.equal(await f.interaction.placeAt({ x: 3, y: 3 }), false);
  assert.equal(f.calls.length, 0);
  assert.equal(f.getRows(), before);
  assert.equal(f.interaction.state.messageCode, 'out_of_bounds');
  assert.deepEqual(f.interaction.state.preview.conflictCells, ['3:4']);
  assert.equal(f.interaction.state.selectedId, stored.id);
});

test('busy save prevents repeat requests, selection changes, rotation and cancellation', async (t) => {
  let finish;
  const f = fixture(t, { save: () => new Promise((resolve) => { finish = resolve; }) });
  f.interaction.select(stored.id);
  const saving = f.interaction.placeAt({ x: 1, y: 1 });
  assert.equal(f.interaction.state.busy, true);
  assert.equal(await f.interaction.placeAt({ x: 2, y: 1 }), false);
  assert.equal(await f.interaction.rotate(), false);
  assert.equal(f.interaction.select(bag.id), false);
  f.interaction.cancel();
  assert.equal(f.interaction.state.selectedId, stored.id);
  assert.equal(f.calls.length, 1);
  finish(true);
  assert.equal(await saving, true);
  assert.equal(f.interaction.state.busy, false);
});

test('rotation persists actual dimensions and preserves unrelated duplicate artifact instance', async (t) => {
  const duplicate = { ...stored, id: 'blade-two' };
  const f = fixture(t, { initialRows: [bag, stored, duplicate] });
  f.interaction.select(duplicate.id);
  assert.equal(await f.interaction.rotate(), true);
  assert.equal(f.getRows()[1].width, 1);
  assert.equal(f.getRows()[1].height, 2);
  assert.equal(f.getRows()[2].width, 2);
  assert.equal(f.getRows()[2].height, 1);
  assert.equal(f.getRows()[2].rotated, 1);
  f.interaction.select(duplicate.id);
  assert.equal(await f.interaction.placeAt({ x: 1, y: 1 }), true);
  assert.equal(f.getRows()[1].x, -1);
  assert.equal(f.getRows()[2].x, 1);
});

test('API rejection and thrown failures retain confirmed layout and selection', async (t) => {
  for (const save of [() => false, () => { throw new Error('offline'); }]) {
    const f = fixture(t, { save });
    const before = f.getRows();
    f.interaction.select(stored.id);
    assert.equal(await f.interaction.placeAt({ x: 1, y: 1 }), false);
    assert.equal(f.getRows(), before);
    assert.equal(f.interaction.state.selectedId, stored.id);
    assert.equal(f.interaction.state.messageCode, 'save_failed');
    assert.equal(f.interaction.state.busy, false);
    assert.equal(f.committed.length, 0);
  }
});

test('pointer cancellation, capture loss, Escape and blur clear drag without saves', async (t) => {
  for (const cancellation of ['pointercancel', 'lostpointercapture', 'Escape', 'blur']) {
    const f = fixture(t);
    const before = f.getRows();
    f.root.emit('pointerdown', { target: f.target(stored.id), clientX: 35, clientY: 30 });
    f.root.emit('pointermove', f.point(1, 1));
    assert.ok(f.interaction.state.preview);
    if (cancellation === 'Escape') f.doc.emit('keydown', { key: 'Escape' });
    else if (cancellation === 'blur') f.win.emit('blur', { pointerId: undefined });
    else f.root.emit(cancellation);
    assert.equal(f.interaction.state.preview, null);
    f.root.emit('pointerup', f.point(1, 1));
    await settle();
    assert.equal(f.calls.length, 0);
    assert.equal(f.getRows(), before);
    assert.equal(f.releases.length, 1);
  }
});

test('release outside board cancels drop and detach removes every listener', async (t) => {
  const f = fixture(t);
  f.root.emit('pointerdown', { target: f.target(stored.id), clientX: 35, clientY: 30 });
  f.root.emit('pointermove', f.point(1, 1));
  f.root.emit('pointerup', { clientX: 900, clientY: 900 });
  await settle();
  assert.equal(f.calls.length, 0);
  assert.equal(f.interaction.state.preview, null);
  f.interaction.detach();
  assert.equal(f.root.listenerCount(), 0);
  assert.equal(f.doc.listenerCount(), 0);
  assert.equal(f.win.listenerCount(), 0);
});

test('bags select on the field in bag mode and cannot lose contents on move or unplace', async (t) => {
  const placed = { ...stored, x: 0, y: 0 };
  const f = fixture(t, { initialRows: [bag, placed] });
  f.interaction.toggleBagMode();
  f.interaction.clickCell({ x: 0, y: 0 });
  assert.equal(f.interaction.state.selectedId, bag.id);
  assert.equal(await f.interaction.unplace(), false);
  assert.equal(f.interaction.state.messageCode, 'bag_contents');
  assert.equal(f.calls.length, 0);
});

test('rotating a placed item into another item is rejected before API call', async (t) => {
  const placed = { ...stored, x: 0, y: 0 };
  const other = { ...stored, id: 'blade-two', x: 1, y: 0 };
  const f = fixture(t, { initialRows: [bag, placed, other] });
  f.interaction.select(placed.id);
  assert.equal(await f.interaction.rotate(), false);
  assert.equal(f.interaction.state.messageCode, 'occupied');
  assert.deepEqual(f.interaction.state.preview.conflictCells, ['1:0']);
  assert.equal(f.calls.length, 0);
  assert.equal(f.getRows()[1].height, 2);
});

test('bag rotation preserves contents and reports coverage lost by shape rotation', async (t) => {
  const smallBag = { ...bag, artifactId: 'strip' };
  const placed = { ...stored, width: 2, height: 1, rotated: 1, x: 0, y: 0 };
  const f = fixture(t, { initialRows: [smallBag, placed] });
  f.interaction.select(smallBag.id);
  assert.equal(await f.interaction.rotate(), false);
  assert.equal(f.interaction.state.messageCode, 'bag_contents');
  assert.deepEqual(f.interaction.state.preview.conflictCells, ['1:0']);
  assert.equal(f.calls.length, 0);
});

test('auto-place reports no_space and retains selection when all covered cells are occupied', async (t) => {
  const pieces = [];
  for (let x = 0; x < 4; x += 2) {
    for (let y = 0; y < 4; y += 2) pieces.push({ id: `square-${x}-${y}`, artifactId: 'square', x, y });
  }
  const f = fixture(t, { initialRows: [bag, stored, ...pieces] });
  f.interaction.select(stored.id);
  assert.equal(await f.interaction.autoPlace(), false);
  assert.equal(f.interaction.state.messageCode, 'no_space');
  assert.equal(f.interaction.state.selectedId, stored.id);
  assert.equal(f.calls.length, 0);
});

test('detaching during pending save suppresses late feedback on disposed screen', async (t) => {
  let finish;
  const f = fixture(t, { save: () => new Promise((resolve) => { finish = resolve; }) });
  f.interaction.select(stored.id);
  const saving = f.interaction.placeAt({ x: 0, y: 0 });
  f.interaction.detach();
  finish(true);
  assert.equal(await saving, false);
  assert.equal(f.committed.length, 0);
  assert.equal(f.interaction.state.busy, false);
  assert.equal(f.interaction.state.preview, null);
});

test('product mutation guard blocks selection, placement, rotation, storage, sale and pointer drag', async (t) => {
  let allowed = true;
  const sales = [];
  const f = fixture(t, { canInteract: () => allowed, onSell: (item) => { sales.push(item); return true; } });
  f.interaction.select(stored.id);
  allowed = false;
  assert.equal(f.interaction.isBusy(), true);
  assert.equal(f.interaction.select(bag.id), false);
  assert.equal(await f.interaction.placeAt({ x: 0, y: 0 }), false);
  assert.equal(await f.interaction.rotate(), false);
  assert.equal(await f.interaction.unplace(), false);
  assert.equal(await f.interaction.autoPlace(), false);
  assert.equal(await f.interaction.sell(), false);
  f.interaction.toggleBagMode();
  assert.equal(f.interaction.state.bagMode, false);
  f.root.emit('pointerdown', { target: f.target(stored.id), clientX: 35, clientY: 30 });
  f.root.emit('pointermove', f.point(1, 1));
  f.root.emit('pointerup', f.point(1, 1));
  await settle();
  assert.equal(f.calls.length, 0);
  assert.equal(sales.length, 0);
  assert.equal(f.interaction.state.selectedId, stored.id);
});

test('explicit sale sends the selected instance once and preserves selection on API failure', async (t) => {
  for (const outcome of [false, null, 'throw', true]) {
    const sales = [];
    const f = fixture(t, { onSell: (item) => { sales.push(item); if (outcome === 'throw') throw new Error('offline'); return outcome; } });
    f.interaction.select(stored.id);
    assert.equal(f.interaction.canSell(), true);
    assert.equal(await f.interaction.sell(), outcome === true);
    assert.deepEqual(sales.map((item) => item.id), [stored.id]);
    assert.equal(f.calls.length, 0, 'selling must not submit a second placement save');
    assert.equal(f.interaction.state.selectedId, outcome === true ? '' : stored.id);
    assert.equal(f.interaction.state.messageCode, outcome === true ? '' : 'save_failed');
  }
});

test('pointer sale destination invokes sale and no placement save', async (t) => {
  const sales = [];
  const f = fixture(t, { onSell: async (item) => { sales.push(item); return true; } });
  f.doc.elementFromPoint = () => ({ closest: (selector) => selector === '.sell-zone' ? {} : null });
  f.root.emit('pointerdown', { target: f.target(stored.id), clientX: 35, clientY: 30 });
  f.root.emit('pointermove', { clientX: 800, clientY: 800 });
  f.root.emit('pointerup', { clientX: 800, clientY: 800 });
  await settle();
  assert.deepEqual(sales.map((item) => item.id), [stored.id]);
  assert.equal(f.calls.length, 0);
  assert.equal(f.interaction.state.selectedId, '');
});

test('failed pointer sale keeps selection and rapid retries cannot double-submit', async (t) => {
  let finish;
  const sales = [];
  const f = fixture(t, { onSell: (item) => { sales.push(item); return new Promise((resolve) => { finish = resolve; }); } });
  f.doc.elementFromPoint = () => ({ closest: (selector) => selector === '.sell-zone' ? {} : null });
  f.root.emit('pointerdown', { target: f.target(stored.id), clientX: 35, clientY: 30 });
  f.root.emit('pointermove', { clientX: 800, clientY: 800 });
  f.root.emit('pointerup', { clientX: 800, clientY: 800 });
  assert.equal(f.interaction.state.busy, true);
  assert.equal(await f.interaction.sell(), false);
  assert.equal(sales.length, 1);
  finish(false);
  await settle();
  assert.equal(f.interaction.state.messageCode, 'save_failed');
  assert.equal(f.interaction.state.selectedId, stored.id);
  assert.equal(f.calls.length, 0);
});

test('pointer storage destination unplaces the dragged instance once', async (t) => {
  const placed = { ...stored, x: 0, y: 0 };
  const f = fixture(t, { initialRows: [bag, placed] });
  f.doc.elementFromPoint = () => ({ closest: (selector) => selector === '.artifact-container-zone' ? {} : null });
  f.root.emit('pointerdown', { target: f.target(placed.id), ...f.point(0, 0) });
  f.root.emit('pointermove', { clientX: 30, clientY: 30 });
  f.root.emit('pointerup', { clientX: 30, clientY: 30 });
  await settle();
  assert.equal(f.calls.length, 1);
  assert.equal(f.getRows()[1].x, -1);
  assert.equal(f.getRows()[1].y, -1);
  assert.equal(f.committed[0].action, 'unplace');
});

test('detach and reattach while save is pending ignores stale completion on new screen', async (t) => {
  let finish;
  const f = fixture(t, { save: () => new Promise((resolve) => { finish = resolve; }) });
  f.interaction.select(stored.id);
  const saving = f.interaction.placeAt({ x: 0, y: 0 });
  f.interaction.detach();
  f.interaction.attach(f.root);
  finish(true);
  assert.equal(await saving, false);
  assert.equal(f.committed.length, 0);
  assert.equal(f.interaction.state.selectedId, stored.id);
  assert.equal(f.interaction.state.busy, false);
});

test('new pointerdown immediately after drag permits the real following click', async (t) => {
  const f = fixture(t);
  f.root.emit('pointerdown', { target: f.target(stored.id), clientX: 35, clientY: 30 });
  assert.equal(f.captures.length, 0, 'simple clicks must not capture and reroute their target');
  f.root.emit('pointermove', f.point(1, 1));
  f.root.emit('pointerup', f.point(1, 1));
  await settle();
  const trailing = f.root.emit('click');
  assert.equal(trailing.stopped, true);
  f.root.emit('pointerdown', { target: f.target(stored.id), ...f.point(1, 1) });
  f.root.emit('pointerup', f.point(1, 1));
  const realClick = f.root.emit('click');
  assert.equal(realClick.stopped, false);
  assert.equal(realClick.prevented, false);
});
