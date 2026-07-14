import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chromaKeyRaster,
  composeFrameGrid,
  compositeRaster,
  createFrameGrid,
  createRaster,
  cropRaster,
  extractFrame,
  fillRaster,
  frameRect,
  padRaster,
  paintCheckerboard,
  resizeRasterNearest,
  resizeRasterBox,
  resizeRasterHybrid,
  tileRaster,
  trimRasterAlpha
} from '@microwavedev/backpack-game-core/tooling/raster';

function pixels(image) {
  return Array.from(image.rgba);
}

test('[tooling/raster] creates, fills, and checkerboards RGB/RGBA rasters with clipping', () => {
  const image = createRaster(3, 2, [1, 2, 3]);
  fillRaster(image, [9, 8, 7, 6], { x: 2, y: 0, width: 3, height: 2 });
  assert.deepEqual(pixels(image), [
    1, 2, 3, 255, 1, 2, 3, 255, 9, 8, 7, 6,
    1, 2, 3, 255, 1, 2, 3, 255, 9, 8, 7, 6
  ]);
  paintCheckerboard(image, { x: 0, y: 0, width: 2, height: 2 }, {
    size: 1,
    colors: [[0, 0, 0], [255, 255, 255]]
  });
  assert.deepEqual(pixels(cropRaster(image, { x: 0, y: 0, width: 2, height: 2 })), [
    0, 0, 0, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 0, 0, 0, 255
  ]);
  assert.throws(() => createRaster(100_000_001, 1), /excessive/);
  assert.throws(() => fillRaster(image, [256, 0, 0]), /\[0, 255\]/);
  assert.throws(() => cropRaster(image, { x: 2, y: 0, width: 2, height: 1 }), /inside image bounds/);
});

test('[tooling/raster] nearest resize preserves pixels and source-over handles translucent targets', () => {
  const source = { width: 2, height: 1, rgba: Buffer.from([10, 20, 30, 255, 40, 50, 60, 255]) };
  assert.deepEqual(pixels(resizeRasterNearest(source, 4, 1)), [
    10, 20, 30, 255, 10, 20, 30, 255, 40, 50, 60, 255, 40, 50, 60, 255
  ]);
  const destination = createRaster(2, 1, [0, 0, 255, 128]);
  compositeRaster(destination, createRaster(2, 1, [255, 0, 0, 128]), { x: 1, y: 0 });
  assert.deepEqual(pixels(destination), [0, 0, 255, 128, 170, 0, 85, 192]);
  const clipped = createRaster(1, 1);
  compositeRaster(clipped, source, { x: -1, y: 0 });
  assert.deepEqual(pixels(clipped), [40, 50, 60, 255]);
});

test('[tooling/raster] compatibility modes preserve straight-channel box resize and review compositing', () => {
  const source = { width: 2, height: 1, rgba: Buffer.from([0, 10, 20, 0, 100, 110, 120, 128]) };
  assert.deepEqual(pixels(resizeRasterBox(source, 1, 1)), [50, 60, 70, 64]);
  assert.deepEqual(resizeRasterHybrid(source, 4, 1), resizeRasterNearest(source, 4, 1));

  const maxAlpha = createRaster(1, 1, [10, 20, 30, 200]);
  compositeRaster(maxAlpha, createRaster(1, 1, [110, 120, 130, 128]), { mode: 'max-alpha' });
  assert.deepEqual(pixels(maxAlpha), [60, 70, 80, 200]);
  const opaque = createRaster(1, 1, [10, 20, 30, 1]);
  compositeRaster(opaque, createRaster(1, 1, [110, 120, 130, 128]), { mode: 'opaque' });
  assert.deepEqual(pixels(opaque), [60, 70, 80, 255]);
  const copied = createRaster(1, 1, [1, 2, 3, 4]);
  compositeRaster(copied, createRaster(1, 1, [5, 6, 7, 0]), { mode: 'copy' });
  assert.deepEqual(pixels(copied), [5, 6, 7, 0]);
});

test('[tooling/raster] tiles repeatedly and extracts exact frame-grid edge cells', () => {
  const tile = { width: 2, height: 1, rgba: Buffer.from([1, 0, 0, 255, 2, 0, 0, 255]) };
  const destination = createRaster(5, 1);
  tileRaster(destination, tile);
  assert.deepEqual(pixels(destination).filter((_, index) => index % 4 === 0), [1, 2, 1, 2, 1]);

  const sheet = { width: 4, height: 2, rgba: Buffer.from([
    1, 0, 0, 255, 2, 0, 0, 255, 3, 0, 0, 255, 4, 0, 0, 255,
    5, 0, 0, 255, 6, 0, 0, 255, 7, 0, 0, 255, 8, 0, 0, 255
  ]) };
  const grid = createFrameGrid(sheet, { rows: 2, columns: 2 });
  assert.deepEqual(frameRect(grid, 1, 1), { x: 2, y: 1, width: 2, height: 1 });
  assert.deepEqual(pixels(extractFrame(sheet, grid, 1, 1)), [7, 0, 0, 255, 8, 0, 0, 255]);
  assert.deepEqual(composeFrameGrid([
    extractFrame(sheet, grid, 0, 0),
    extractFrame(sheet, grid, 1, 1)
  ], { rows: 1, columns: 2 }), {
    width: 4,
    height: 1,
    rgba: Buffer.from([1, 0, 0, 255, 2, 0, 0, 255, 7, 0, 0, 255, 8, 0, 0, 255])
  });
  assert.throws(() => createFrameGrid(sheet, { rows: 1, columns: 3 }), /integer/);
  assert.throws(() => composeFrameGrid([tile], { rows: 1, columns: 2 }), /frame count/);
  assert.throws(() => extractFrame(sheet, grid, 2, 0), /outside the grid/);
});

test('[tooling/raster] chroma-keys by tolerance, trims alpha, and pads empty images deterministically', () => {
  const source = { width: 3, height: 1, rgba: Buffer.from([
    255, 0, 255, 255, 250, 0, 250, 128, 0, 1, 2, 255
  ]) };
  const keyed = chromaKeyRaster(source, [255, 0, 255], { tolerance: 8 });
  assert.deepEqual(pixels(keyed), [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 255]);
  assert.deepEqual(pixels(trimRasterAlpha(keyed)), [0, 1, 2, 255]);
  assert.equal(padRaster(trimRasterAlpha(keyed), { left: 1, top: 1 }).width, 2);
  assert.deepEqual(trimRasterAlpha(createRaster(2, 2)), createRaster(1, 1));
  assert.throws(() => chromaKeyRaster(source, [255, 0, 255], { tolerance: -1 }), />= 0/);
  assert.deepEqual(
    pixels(chromaKeyRaster(source, [255, 0, 255], { tolerance: 0, clearRgb: false })).slice(0, 4),
    [255, 0, 255, 0]
  );
});
