import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeededRng, randomInt, shuffleWithRng } from '../src/index.js';

test('[rng] createSeededRng is deterministic for the same numeric seed', () => {
  const left = createSeededRng(123);
  const right = createSeededRng(123);

  assert.deepEqual(
    [left(), left(), left(), left()],
    [right(), right(), right(), right()]
  );
});

test('[rng] zero and invalid seeds fall back to the same non-zero stream', () => {
  const zero = createSeededRng(0);
  const invalid = createSeededRng('not-a-number');

  assert.deepEqual(
    [zero(), zero(), zero()],
    [invalid(), invalid(), invalid()]
  );
});

test('[rng] randomInt floors rng output into an integer range', () => {
  assert.equal(randomInt(() => 0, 5), 0);
  assert.equal(randomInt(() => 0.39, 5), 1);
  assert.equal(randomInt(() => 0.99, 5), 4);
});

test('[rng] shuffleWithRng is deterministic and does not mutate input', () => {
  const input = ['a', 'b', 'c', 'd'];
  const shuffled = shuffleWithRng(input, createSeededRng(77));

  assert.deepEqual(input, ['a', 'b', 'c', 'd']);
  assert.deepEqual(shuffled, shuffleWithRng(input, createSeededRng(77)));
  assert.notDeepEqual(shuffled, input);
});
