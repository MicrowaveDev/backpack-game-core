import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cellKey,
  cellSet,
  pieceCells,
  setsIntersect
} from '../src/index.js';

test('[grid-geometry] cellKey serializes x/y coordinates', () => {
  assert.equal(cellKey(3, 4), '3:4');
  assert.equal(cellKey(-1, 0), '-1:0');
});

test('[grid-geometry] pieceCells returns every rectangular footprint cell in stable order', () => {
  assert.deepEqual(pieceCells({ x: 2, y: 3, width: 2, height: 2 }), [
    '2:3',
    '2:4',
    '3:3',
    '3:4'
  ]);
});

test('[grid-geometry] pieceCells respects an optional shape mask', () => {
  assert.deepEqual(
    pieceCells(
      { x: 5, y: 7, width: 2, height: 2 },
      [
        [1, 0],
        [1, 1]
      ]
    ),
    [
      '5:7',
      '5:8',
      '6:8'
    ]
  );
});

test('[grid-geometry] cellSet returns a Set of serialized cells', () => {
  const set = cellSet(['0:0', '0:0', '1:0']);
  assert.equal(set.size, 2);
  assert.equal(set.has('0:0'), true);
  assert.equal(set.has('1:0'), true);
});

test('[grid-geometry] setsIntersect detects shared cells', () => {
  assert.equal(setsIntersect(new Set(['0:0', '1:0']), new Set(['2:0', '1:0'])), true);
  assert.equal(setsIntersect(new Set(['0:0']), new Set(['2:0'])), false);
});

