import test from 'node:test';
import assert from 'node:assert/strict';
import {
  alphaBounds,
  averageEdgeRgb,
  averageRegionRgb,
  connectedComponents,
  connectedComponentsFromMask,
  frameDifference,
  frameHash,
  luminance,
  opaqueMatteMetrics,
  paletteHistogram,
  renderPaletteSwatch,
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

test('[tooling/image-analysis] analyzes injected masks with configurable connectivity', () => {
  const mask = { width: 2, height: 2, data: Uint8Array.from([1, 0, 0, 1]) };
  assert.equal(connectedComponentsFromMask(mask, { connectivity: 4 }).length, 2);
  assert.equal(connectedComponentsFromMask(mask, { connectivity: 8 }).length, 1);
  assert.deepEqual(connectedComponentsFromMask({ width: 1, height: 1, data: [0] }), []);
  assert.throws(() => connectedComponentsFromMask({ width: 2, height: 2, data: [1] }), /data size/);
});

test('[tooling/image-analysis] builds policy-filtered palette histograms and swatches', () => {
  const image = { width: 3, height: 1, rgba: Buffer.from([
    10, 20, 30, 255, 10, 20, 30, 255, 250, 0, 250, 0
  ]) };
  const palette = paletteHistogram(image, {
    alphaThreshold: 0,
    quantizationSteps: [16],
    includePixel: (rgba) => rgba[0] < 200
  });
  assert.equal(palette.includedPixels, 2);
  assert.equal(palette.transparentPixels, 1);
  assert.deepEqual(palette.exact[0], { rgb: [10, 20, 30], hex: '#0a141e', count: 2, ratio: 1, pct: 1 });
  assert.equal(palette.quantized[16][0].hex, '#081818');
  const swatch = renderPaletteSwatch(palette.exact, { columns: 1, cell: 4, gap: 1 });
  assert.deepEqual({ width: swatch.width, height: swatch.height }, { width: 6, height: 6 });
  assert.throws(() => paletteHistogram(image, { quantizationSteps: [0] }), /quantization steps/);
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
  const matte = opaqueMatteMetrics(image, { cornerSize: 1 });
  assert.equal(matte.alphaCoverage, 0.5);
  assert.equal(matte.cornerAverages.length, 4);
  assert.ok(matte.maximumCornerDistance > 0);
  assert.throws(() => averageEdgeRgb(image, 'north'), /top, right, bottom, or left/);
});
