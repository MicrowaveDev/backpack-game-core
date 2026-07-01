import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultRectangleShape,
  getBagShape,
  getEffectiveShape,
  getEffectiveDimensions,
  isCellInShape,
  normalizeRotation,
  rotateShape,
  shapeArea
} from '../src/index.js';

const tBag = {
  width: 3,
  height: 2,
  shape: [
    [1, 1, 1],
    [0, 1, 0]
  ]
};

const lBag = {
  width: 3,
  height: 2,
  shape: [
    [1, 1, 1],
    [1, 0, 0]
  ]
};

test('[bag-shape] defaultRectangleShape fills every cell', () => {
  assert.deepEqual(defaultRectangleShape(2, 3), [
    [1, 1],
    [1, 1],
    [1, 1]
  ]);
});

test('[bag-shape] getBagShape falls back to landscape rectangle for legacy bags', () => {
  assert.deepEqual(getBagShape({ width: 1, height: 2 }), [[1, 1]]);
});

test('[bag-shape] getBagShape returns the explicit mask for shape-bearing bags', () => {
  assert.deepEqual(getBagShape(tBag), [
    [1, 1, 1],
    [0, 1, 0]
  ]);
});

test('[bag-shape] rotateShape rotates 90 degrees clockwise, swapping cols and rows', () => {
  assert.deepEqual(rotateShape(tBag.shape), [
    [0, 1],
    [1, 1],
    [0, 1]
  ]);
});

test('[bag-shape] getEffectiveShape applies four quarter-turn states', () => {
  assert.deepEqual(getEffectiveShape(tBag, 0), [
    [1, 1, 1],
    [0, 1, 0]
  ]);
  assert.deepEqual(getEffectiveShape(tBag, 1), [
    [0, 1],
    [1, 1],
    [0, 1]
  ]);
  assert.deepEqual(getEffectiveShape(tBag, 2), [
    [0, 1, 0],
    [1, 1, 1]
  ]);
  assert.deepEqual(getEffectiveShape(tBag, 3), [
    [1, 0],
    [1, 1],
    [1, 0]
  ]);
  assert.deepEqual(getEffectiveShape(tBag, true), getEffectiveShape(tBag, 1), 'legacy boolean true still means one turn');
});

test('[bag-shape] getEffectiveDimensions reports cols and rows for both orientations', () => {
  assert.deepEqual(getEffectiveDimensions(lBag, 0), { cols: 3, rows: 2 });
  assert.deepEqual(getEffectiveDimensions(lBag, 1), { cols: 2, rows: 3 });
  assert.deepEqual(getEffectiveDimensions(lBag, 2), { cols: 3, rows: 2 });
  assert.deepEqual(getEffectiveDimensions(lBag, 3), { cols: 2, rows: 3 });
});

test('[bag-shape] normalizeRotation preserves 0..3 and wraps legacy values', () => {
  assert.equal(normalizeRotation(false), 0);
  assert.equal(normalizeRotation(true), 1);
  assert.equal(normalizeRotation(2), 2);
  assert.equal(normalizeRotation(3), 3);
  assert.equal(normalizeRotation(4), 0);
  assert.equal(normalizeRotation(-1), 3);
});

test('[bag-shape] isCellInShape true for filled cells, false for empty / OOB', () => {
  assert.equal(isCellInShape(tBag.shape, 0, 0), true);
  assert.equal(isCellInShape(tBag.shape, 0, 1), false, 'empty cell');
  assert.equal(isCellInShape(tBag.shape, 1, 1), true);
  assert.equal(isCellInShape(tBag.shape, 3, 0), false, 'past width');
  assert.equal(isCellInShape(tBag.shape, 0, 2), false, 'past height');
  assert.equal(isCellInShape(tBag.shape, -1, 0), false, 'negative');
});

test('[bag-shape] shapeArea counts filled cells', () => {
  assert.equal(shapeArea(tBag.shape), 4);
  assert.equal(shapeArea(lBag.shape), 4);
  assert.equal(shapeArea(defaultRectangleShape(2, 3)), 6);
});

