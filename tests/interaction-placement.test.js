import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoadoutValidator, evaluateBackpackPlacement, getBackpackItemCells, getBackpackItemDimensions, normalizeBackpackBagMoves, getBackpackLoadoutRevision } from '../src/modules/loadout/index.js';

const catalog = {
  bag: { family: 'bag', width: 2, height: 2 },
  strip: { family: 'bag', width: 2, height: 1 },
  tee: { family: 'bag', width: 3, height: 2, shape: [[1, 1, 1], [0, 1, 0]] },
  blade: { family: 'weapon', width: 1, height: 2 },
  square: { family: 'armor', width: 2, height: 2 }
};
const bag = (id, x, y, artifactId = 'bag') => ({ id, artifactId, x, y, active: true });
const evaluate = (rows, item, x, y, extra = {}) => evaluateBackpackPlacement({
  rows, item, x, y, columns: 6, height: 6,
  getArtifact: (id) => catalog[id], ...extra
});

test('items span adjoining bags using union coverage, including 1x2 and 2x2', () => {
  const bags = [bag('a', 0, 0), bag('b', 0, 2)];
  for (const artifactId of ['blade', 'square']) {
    const item = { id: 'moving', artifactId, x: -1, y: -1 };
    const before = structuredClone([...bags, item]);
    const result = evaluate([...bags, item], item, 0, 1);
    assert.equal(result.ok, true);
    assert.equal(result.reason, null);
    assert.deepEqual(result.conflictCells, []);
    assert.ok(result.cells.includes('0:1') && result.cells.includes('0:2'));
    assert.deepEqual([...bags, item], before, 'preview must be pure');
    assert.equal(result.rows[2].y, 1);
    assert.equal(result.rows[2].height, 2);
  }
});

test('missing coverage reports only the uncovered footprint cells', () => {
  const item = { id: 'moving', artifactId: 'blade', x: -1, y: -1 };
  const rows = [bag('a', 0, 0), item];
  const result = evaluate(rows, item, 0, 1);
  assert.equal(result.reason, 'uncovered');
  assert.deepEqual(result.conflictCells, ['0:2']);
  assert.equal(result.rows, rows);
});

test('bounds use the proposed anchor and real dimensions', () => {
  const item = { id: 'moving', artifactId: 'square', x: -1, y: -1 };
  assert.deepEqual(evaluate([], item, -1, 0).conflictCells, ['-1:0', '-1:1']);
  const result = evaluate([], item, 5, 5);
  assert.equal(result.reason, 'out_of_bounds');
  assert.deepEqual(result.conflictCells, ['5:6', '6:5', '6:6']);
  assert.equal(evaluate([], item, 0.5, 0).reason, 'out_of_bounds');
});

test('moving instance is excluded by stable id while duplicate artifacts still collide', () => {
  const moving = { id: 'one', artifactId: 'blade', x: 0, y: 0 };
  const duplicate = { id: 'two', artifactId: 'blade', x: 1, y: 0 };
  const rows = [bag('a', 0, 0), moving, duplicate];
  const samePosition = evaluate(rows, { ...moving }, 0, 0);
  assert.equal(samePosition.ok, true);
  const overlap = evaluate(rows, { ...moving }, 1, 0);
  assert.equal(overlap.reason, 'occupied');
  assert.deepEqual(overlap.conflictCells, ['1:0', '1:1']);
  assert.equal(samePosition.rows[2], duplicate);
});

test('id-less rows exclude only the actual object, never all matching artifact ids', () => {
  const moving = { artifactId: 'blade', x: 0, y: 0 };
  const duplicate = { artifactId: 'blade', x: 1, y: 0 };
  assert.equal(evaluate([bag('a', 0, 0), moving, duplicate], moving, 1, 0).reason, 'occupied');
});

test('bag footprint uses rotated tetromino masks and shape dimensions', () => {
  const moving = { id: 't', artifactId: 'tee', x: -1, y: -1, rotated: 1 };
  const result = evaluate([], moving, 2, 1);
  assert.equal(result.ok, true);
  assert.deepEqual(result.cells, ['2:2', '3:1', '3:2', '3:3']);
  assert.equal(result.item.width, 2);
  assert.equal(result.item.height, 3);
  assert.deepEqual(getBackpackItemCells({ ...moving, x: 0, y: 0 }, catalog.tee), ['0:1', '1:0', '1:1', '1:2']);
});

test('bag movements preserve item coordinates and reject lost coverage', () => {
  const moving = bag('a', 0, 0);
  const item = { id: 'sword', artifactId: 'blade', x: 0, y: 0 };
  const rows = [moving, item];
  const result = evaluate(rows, moving, 2, 0);
  assert.equal(result.reason, 'bag_contents');
  assert.deepEqual(result.conflictCells, ['0:0', '0:1']);
  assert.equal(result.rows, rows);
  const allowed = evaluate(rows, moving, 0, 0);
  assert.equal(allowed.ok, true);
  assert.equal(allowed.rows[1], item);
});

test('bag overlap is separate from item occupancy and locked bags cannot move', () => {
  const moving = bag('a', 0, 0);
  assert.equal(evaluate([moving, bag('b', 2, 0)], moving, 1, 0).reason, 'occupied');
  assert.equal(evaluate([moving], moving, 0, 0, { isLockedBag: (row) => row.id === 'a' }).reason, 'locked');
});

test('inactive and stored bags do not contribute coverage; storage items do not occupy cells', () => {
  const item = { id: 'sword', artifactId: 'blade', x: -1, y: -1 };
  const inactive = { ...bag('a', 0, 0), active: false };
  assert.equal(evaluate([inactive, item], item, 0, 0).reason, 'uncovered');
  assert.equal(evaluate([bag('a', -1, -1), item], item, 0, 0).reason, 'uncovered');
  assert.equal(evaluate([bag('a', 0, 0), item, { ...item, id: 'stored' }], item, 0, 0).ok, true);
});

test('row dimensions win; missing storage dimensions use canonical rotation', () => {
  assert.deepEqual(getBackpackItemDimensions({ x: -1, y: -1, rotated: 1 }, catalog.blade), { width: 2, height: 1 });
  assert.deepEqual(getBackpackItemDimensions({ x: 0, y: 0, width: 1, height: 2, rotated: 1 }, catalog.blade), { width: 1, height: 2 });
});

test('unknown items produce a stable rejection without modifying rows', () => {
  const item = { id: 'unknown', artifactId: 'missing', x: -1, y: -1 };
  const rows = [item];
  const result = evaluate(rows, item, 0, 0);
  assert.equal(result.reason, 'unknown_item');
  assert.equal(result.rows, rows);
  assert.deepEqual(result.cells, []);
});

test('successful normalized proposals satisfy authoritative loadout coverage and collision rules', () => {
  const validator = createLoadoutValidator({ gridWidth: 6, gridHeight: 6, getArtifact: (id) => catalog[id] });
  const moving = { id: 'moving', artifactId: 'square', x: -1, y: -1 };
  const result = evaluate([bag('a', 0, 0), bag('b', 0, 2), moving], moving, 0, 1);
  assert.equal(result.ok, true);
  assert.doesNotThrow(() => validator.validateLoadoutItems(result.rows));
  const invalid = evaluate([bag('a', 0, 0), moving], moving, 0, 1);
  assert.equal(invalid.reason, 'uncovered');
  assert.throws(() => validator.validateItemCoverage([bag('a', 0, 0), invalid.item]), /uncovered/);
});

test('bag translation evacuates whole seam items and duplicates once, preserving rotations', () => {
  const moving = bag('a', 0, 0);
  const seam = { id: 'one', artifactId: 'blade', x: 0, y: 1, width: 1, height: 2, rotated: 2 };
  const duplicate = { ...seam, id: 'two', x: 1 };
  const untouched = { ...seam, id: 'three', x: 0, y: 2, height: 1 };
  const rows = [moving, bag('b', 0, 2), seam, duplicate, untouched];
  const result = evaluate(rows, moving, 3, 0, { evacuateBagContents: true });
  assert.equal(result.ok, true);
  assert.deepEqual(result.affectedIds, ['one', 'two']);
  assert.equal(result.rows[2].rotated, 2);
  assert.equal(result.rows[2].x, -1);
  assert.equal(result.rows[3].x, -1);
  assert.equal(result.rows[4], untouched);
  assert.equal(rows[2].x, 0);
  const rejected = evaluate(rows, moving, 0, 2, { evacuateBagContents: true });
  assert.equal(rejected.reason, 'occupied');
  assert.equal(rejected.rows, rows);
});

test('authoritative normalization evacuates old membership even if client omits evacuation', () => {
  const old = bag('a', 0, 0);
  const item = { id: 2, artifactId: 'blade', x: 0, y: 0, rotated: 2 };
  const rows = [old, item];
  const result = normalizeBackpackBagMoves({ rows, proposedRows: [{ ...old, x: 3 }, { ...item, x: 3 }],
    columns: 6, height: 6, getArtifact: (id) => catalog[id] });
  assert.equal(result.ok, true);
  assert.deepEqual(result.affectedIds, ['2']);
  assert.deepEqual(result.rows[1], { ...item, x: -1, y: -1, active: false });
  assert.equal(getBackpackLoadoutRevision(rows), getBackpackLoadoutRevision([...rows].reverse()));
  assert.notEqual(getBackpackLoadoutRevision(rows), getBackpackLoadoutRevision(result.rows));
});
