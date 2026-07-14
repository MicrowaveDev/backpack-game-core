import test from 'node:test';
import assert from 'node:assert/strict';
import {
  alphaBounds,
  averageEdgeRgb,
  averageRegionRgb,
  connectedComponents,
  frameDifference,
  frameHash,
  luminance,
  rgbDistance
} from '@microwavedev/backpack-game-core/tooling/image-analysis';
import { createRaster, fillRaster } from '@microwavedev/backpack-game-core/tooling/raster';

test('[tooling/image-analysis] reports alpha bounds and deterministic connected components', () => {
  const image = createRaster(4, 3);
  fillRaster(image, [10, 20, 30, 255], { x: 0, y: 0, width: 2, height: 1 });
  fillRaster(image, [10, 20, 30, 255], { x: 3, y: 2, width: 1, height: 1 });
  assert.deepEqual(alphaBounds(image), {
    x: 0, y: 0, width: 4, height: 3,
    minX: 0, minY: 0, maxX: 3, maxY: 2,
    centerX: 1.5, centerY: 1, visiblePixels: 3
  });
  assert.equal(alphaBounds(createRaster(1, 1)), null);
  assert.deepEqual(connectedComponents(image), [
    { pixels: 2, x: 0, y: 0, width: 2, height: 1, minX: 0, minY: 0, maxX: 1, maxY: 0, touchesRectEdge: true },
    { pixels: 1, x: 3, y: 2, width: 1, height: 1, minX: 3, minY: 2, maxX: 3, maxY: 2, touchesRectEdge: true }
  ]);
  assert.equal(connectedComponents(image, { rect: { x: 2, y: 1, width: 2, height: 2 } })[0].x, 3);
});

test('[tooling/image-analysis] hashes rows without stride bytes and compares frame metrics', () => {
  const first = createRaster(2, 1, [1, 2, 3, 255]);
  const second = createRaster(2, 1, [1, 2, 3, 255]);
  second.rgba[4] = 10;
  assert.equal(frameHash(first).length, 64);
  assert.notEqual(frameHash(first), frameHash(second));
  assert.deepEqual(frameDifference(first, second), {
    differentPixels: 1,
    totalPixels: 2,
    ratio: 0.5,
    meanChannelDifference: 4.5,
    maxChannelDifference: 9
  });
  assert.equal(frameDifference(first, second, { colorThreshold: 9 }).differentPixels, 0);
  assert.throws(() => frameDifference(first, createRaster(1, 1)), /same dimensions/);
});

test('[tooling/image-analysis] averages regions and edge bands and computes color metrics', () => {
  const image = { width: 2, height: 2, rgba: Buffer.from([
    0, 10, 20, 255, 100, 110, 120, 255,
    20, 30, 40, 0, 120, 130, 140, 0
  ]) };
  assert.deepEqual(averageRegionRgb(image), [60, 70, 80]);
  assert.deepEqual(averageRegionRgb(image, { x: 1, y: 0, width: 1, height: 2 }), [110, 120, 130]);
  assert.deepEqual(averageEdgeRgb(image, 'top'), [50, 60, 70]);
  assert.deepEqual(averageEdgeRgb(image, 'right', { band: { start: 1, end: 2 } }), [120, 130, 140]);
  assert.ok(Math.abs(luminance([255, 255, 255]) - 255) < Number.EPSILON * 255);
  assert.equal(rgbDistance([0, 0, 0], [3, 4, 0]), 5);
  assert.throws(() => averageEdgeRgb(image, 'north'), /top, right, bottom, or left/);
});
