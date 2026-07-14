const MAX_RASTER_PIXELS = 100_000_000;

function assertInteger(value, label, { min = 0 } = {}) {
  if (!Number.isSafeInteger(value) || value < min) {
    throw new TypeError(`${label} must be an integer >= ${min}`);
  }
}

function assertCoordinate(value, label) {
  if (!Number.isSafeInteger(value)) throw new TypeError(`${label} must be a safe integer`);
}

function checkedPixelCount(width, height, label = 'raster') {
  assertInteger(width, `${label} width`, { min: 1 });
  assertInteger(height, `${label} height`, { min: 1 });
  const pixels = width * height;
  if (!Number.isSafeInteger(pixels) || pixels > MAX_RASTER_PIXELS) {
    throw new RangeError(`${label} dimensions are excessive`);
  }
  return pixels;
}

function normalizeColor(color, label = 'color') {
  if (!Array.isArray(color) && !ArrayBuffer.isView(color)) {
    throw new TypeError(`${label} must be an RGB or RGBA array`);
  }
  if (color.length !== 3 && color.length !== 4) {
    throw new RangeError(`${label} must contain 3 or 4 channels`);
  }
  const normalized = Array.from(color);
  if (normalized.length === 3) normalized.push(255);
  for (const channel of normalized) {
    if (!Number.isInteger(channel) || channel < 0 || channel > 255) {
      throw new RangeError(`${label} channels must be integers in [0, 255]`);
    }
  }
  return normalized;
}

export function assertRasterImage(image, label = 'image') {
  if (!image || typeof image !== 'object') throw new TypeError(`${label} must be a raster image`);
  const pixels = checkedPixelCount(image.width, image.height, label);
  if (!Buffer.isBuffer(image.rgba)) throw new TypeError(`${label}.rgba must be a Buffer`);
  if (image.rgba.length !== pixels * 4) {
    throw new RangeError(`${label} RGBA buffer size does not match its dimensions`);
  }
  return image;
}

export function assertRasterRect(rect, label = 'rect') {
  if (!rect || typeof rect !== 'object') throw new TypeError(`${label} must be a rectangle`);
  assertCoordinate(rect.x, `${label}.x`);
  assertCoordinate(rect.y, `${label}.y`);
  assertInteger(rect.width, `${label}.width`, { min: 1 });
  assertInteger(rect.height, `${label}.height`, { min: 1 });
  if (!Number.isSafeInteger(rect.x + rect.width) || !Number.isSafeInteger(rect.y + rect.height)) {
    throw new RangeError(`${label} coordinates are excessive`);
  }
  return rect;
}

function assertContainedRect(image, rect, label = 'rect') {
  assertRasterRect(rect, label);
  if (rect.x < 0 || rect.y < 0 || rect.x + rect.width > image.width || rect.y + rect.height > image.height) {
    throw new RangeError(`${label} must be inside image bounds`);
  }
}

function clippedRect(image, rect) {
  assertRasterRect(rect);
  const x = Math.max(0, Math.min(image.width, rect.x));
  const y = Math.max(0, Math.min(image.height, rect.y));
  const right = Math.min(image.width, rect.x + rect.width);
  const bottom = Math.min(image.height, rect.y + rect.height);
  return { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) };
}

export function createRaster(width, height, color = [0, 0, 0, 0]) {
  const pixels = checkedPixelCount(width, height);
  const rgba = Buffer.alloc(pixels * 4);
  const image = { width, height, rgba };
  return fillRaster(image, color);
}

export function fillRaster(image, color, rect = { x: 0, y: 0, width: image?.width, height: image?.height }) {
  assertRasterImage(image);
  const rgba = normalizeColor(color);
  const clipped = clippedRect(image, rect);
  for (let y = clipped.y; y < clipped.y + clipped.height; y += 1) {
    for (let x = clipped.x; x < clipped.x + clipped.width; x += 1) {
      const offset = (y * image.width + x) * 4;
      image.rgba[offset] = rgba[0];
      image.rgba[offset + 1] = rgba[1];
      image.rgba[offset + 2] = rgba[2];
      image.rgba[offset + 3] = rgba[3];
    }
  }
  return image;
}

export const fillRasterRect = fillRaster;

export function paintCheckerboard(image, rect, options = {}) {
  assertRasterImage(image);
  assertRasterRect(rect);
  const size = options.size ?? 8;
  assertInteger(size, 'checkerboard size', { min: 1 });
  const colors = options.colors ?? [[204, 204, 204, 255], [238, 238, 238, 255]];
  if (!Array.isArray(colors) || colors.length !== 2) {
    throw new TypeError('checkerboard colors must contain two colors');
  }
  const first = normalizeColor(colors[0], 'checkerboard color 0');
  const second = normalizeColor(colors[1], 'checkerboard color 1');
  const clipped = clippedRect(image, rect);
  for (let y = clipped.y; y < clipped.y + clipped.height; y += 1) {
    for (let x = clipped.x; x < clipped.x + clipped.width; x += 1) {
      const localX = x - rect.x;
      const localY = y - rect.y;
      const color = ((Math.floor(localX / size) + Math.floor(localY / size)) & 1) ? second : first;
      const offset = (y * image.width + x) * 4;
      image.rgba[offset] = color[0];
      image.rgba[offset + 1] = color[1];
      image.rgba[offset + 2] = color[2];
      image.rgba[offset + 3] = color[3];
    }
  }
  return image;
}

export function cropRaster(image, rect) {
  assertRasterImage(image);
  assertContainedRect(image, rect);
  const output = createRaster(rect.width, rect.height);
  const bytesPerRow = rect.width * 4;
  for (let y = 0; y < rect.height; y += 1) {
    const sourceOffset = ((rect.y + y) * image.width + rect.x) * 4;
    image.rgba.copy(output.rgba, y * bytesPerRow, sourceOffset, sourceOffset + bytesPerRow);
  }
  return output;
}

export function resizeRasterNearest(image, width, height) {
  assertRasterImage(image);
  const output = createRaster(width, height);
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(image.height - 1, Math.floor(y * image.height / height));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(image.width - 1, Math.floor(x * image.width / width));
      const sourceOffset = (sourceY * image.width + sourceX) * 4;
      const targetOffset = (y * width + x) * 4;
      image.rgba.copy(output.rgba, targetOffset, sourceOffset, sourceOffset + 4);
    }
  }
  return output;
}

export function resizeRasterBox(image, width, height) {
  assertRasterImage(image);
  checkedPixelCount(width, height, 'resized raster');
  const output = createRaster(width, height);
  const xRatio = image.width / width;
  const yRatio = image.height / height;
  for (let y = 0; y < height; y += 1) {
    const sourceY0 = Math.floor(y * yRatio);
    const sourceY1 = Math.min(image.height, Math.ceil((y + 1) * yRatio));
    for (let x = 0; x < width; x += 1) {
      const sourceX0 = Math.floor(x * xRatio);
      const sourceX1 = Math.min(image.width, Math.ceil((x + 1) * xRatio));
      const sums = [0, 0, 0, 0];
      let count = 0;
      for (let sourceY = sourceY0; sourceY < sourceY1; sourceY += 1) {
        for (let sourceX = sourceX0; sourceX < sourceX1; sourceX += 1) {
          const sourceOffset = (sourceY * image.width + sourceX) * 4;
          for (let channel = 0; channel < 4; channel += 1) sums[channel] += image.rgba[sourceOffset + channel];
          count += 1;
        }
      }
      const targetOffset = (y * width + x) * 4;
      for (let channel = 0; channel < 4; channel += 1) output.rgba[targetOffset + channel] = Math.round(sums[channel] / count);
    }
  }
  return output;
}

export function resizeRasterHybrid(image, width, height) {
  assertRasterImage(image);
  return image.width < width || image.height < height
    ? resizeRasterNearest(image, width, height)
    : resizeRasterBox(image, width, height);
}

export function compositeRaster(destination, source, options = {}) {
  assertRasterImage(destination, 'destination');
  assertRasterImage(source, 'source');
  const x = options.x ?? 0;
  const y = options.y ?? 0;
  assertCoordinate(x, 'composite x');
  assertCoordinate(y, 'composite y');
  const sourceRect = options.sourceRect ?? { x: 0, y: 0, width: source.width, height: source.height };
  const mode = options.mode ?? 'source-over';
  if (!['source-over', 'max-alpha', 'opaque', 'copy'].includes(mode)) {
    throw new RangeError('composite mode must be source-over, max-alpha, opaque, or copy');
  }
  assertContainedRect(source, sourceRect, 'sourceRect');

  const sourceStartX = Math.max(0, -x);
  const sourceStartY = Math.max(0, -y);
  const targetX = Math.max(0, x);
  const targetY = Math.max(0, y);
  const drawWidth = Math.max(0, Math.min(sourceRect.width - sourceStartX, destination.width - targetX));
  const drawHeight = Math.max(0, Math.min(sourceRect.height - sourceStartY, destination.height - targetY));
  for (let row = 0; row < drawHeight; row += 1) {
    for (let column = 0; column < drawWidth; column += 1) {
      const sourceOffset = ((sourceRect.y + sourceStartY + row) * source.width + sourceRect.x + sourceStartX + column) * 4;
      const targetOffset = ((targetY + row) * destination.width + targetX + column) * 4;
      if (mode === 'copy') {
        source.rgba.copy(destination.rgba, targetOffset, sourceOffset, sourceOffset + 4);
        continue;
      }
      const sourceAlpha = source.rgba[sourceOffset + 3] / 255;
      if (sourceAlpha === 0) continue;
      if (mode === 'max-alpha' || mode === 'opaque') {
        for (let channel = 0; channel < 3; channel += 1) {
          destination.rgba[targetOffset + channel] = Math.round(
            source.rgba[sourceOffset + channel] * sourceAlpha
            + destination.rgba[targetOffset + channel] * (1 - sourceAlpha)
          );
        }
        destination.rgba[targetOffset + 3] = mode === 'opaque'
          ? 255
          : Math.max(destination.rgba[targetOffset + 3], source.rgba[sourceOffset + 3]);
        continue;
      }
      const targetAlpha = destination.rgba[targetOffset + 3] / 255;
      const outputAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);
      for (let channel = 0; channel < 3; channel += 1) {
        const premultiplied = source.rgba[sourceOffset + channel] * sourceAlpha
          + destination.rgba[targetOffset + channel] * targetAlpha * (1 - sourceAlpha);
        destination.rgba[targetOffset + channel] = outputAlpha === 0 ? 0 : Math.round(premultiplied / outputAlpha);
      }
      destination.rgba[targetOffset + 3] = Math.round(outputAlpha * 255);
    }
  }
  return destination;
}

export function tileRaster(destination, tile, rect = { x: 0, y: 0, width: destination?.width, height: destination?.height }) {
  assertRasterImage(destination, 'destination');
  assertRasterImage(tile, 'tile');
  assertRasterRect(rect);
  const clipped = clippedRect(destination, rect);
  for (let y = clipped.y; y < clipped.y + clipped.height; y += 1) {
    for (let x = clipped.x; x < clipped.x + clipped.width; x += 1) {
      const sourceX = (x - rect.x) % tile.width;
      const sourceY = (y - rect.y) % tile.height;
      compositePixel(destination, (y * destination.width + x) * 4, tile, (sourceY * tile.width + sourceX) * 4);
    }
  }
  return destination;
}

function compositePixel(destination, targetOffset, source, sourceOffset) {
  const sourceAlpha = source.rgba[sourceOffset + 3] / 255;
  if (sourceAlpha === 0) return;
  const targetAlpha = destination.rgba[targetOffset + 3] / 255;
  const outputAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);
  for (let channel = 0; channel < 3; channel += 1) {
    const value = source.rgba[sourceOffset + channel] * sourceAlpha
      + destination.rgba[targetOffset + channel] * targetAlpha * (1 - sourceAlpha);
    destination.rgba[targetOffset + channel] = Math.round(value / outputAlpha);
  }
  destination.rgba[targetOffset + 3] = Math.round(outputAlpha * 255);
}

export function createFrameGrid(image, options) {
  assertRasterImage(image);
  if (!options || typeof options !== 'object') throw new TypeError('frame grid options are required');
  const rows = options.rows;
  const columns = options.columns;
  assertInteger(rows, 'frame grid rows', { min: 1 });
  assertInteger(columns, 'frame grid columns', { min: 1 });
  const frameWidth = options.frameWidth ?? image.width / columns;
  const frameHeight = options.frameHeight ?? image.height / rows;
  assertInteger(frameWidth, 'frame width', { min: 1 });
  assertInteger(frameHeight, 'frame height', { min: 1 });
  if (frameWidth * columns !== image.width || frameHeight * rows !== image.height) {
    throw new RangeError('frame grid must exactly cover the image');
  }
  return { rows, columns, frameWidth, frameHeight };
}

export function frameRect(grid, row, column) {
  if (!grid || typeof grid !== 'object') throw new TypeError('frame grid is required');
  assertInteger(grid.rows, 'frame grid rows', { min: 1 });
  assertInteger(grid.columns, 'frame grid columns', { min: 1 });
  assertInteger(grid.frameWidth, 'frame width', { min: 1 });
  assertInteger(grid.frameHeight, 'frame height', { min: 1 });
  assertInteger(row, 'frame row');
  assertInteger(column, 'frame column');
  if (row >= grid.rows || column >= grid.columns) throw new RangeError('frame coordinates are outside the grid');
  return { x: column * grid.frameWidth, y: row * grid.frameHeight, width: grid.frameWidth, height: grid.frameHeight };
}

export function extractFrame(image, grid, row, column) {
  assertRasterImage(image);
  const rect = frameRect(grid, row, column);
  if (grid.columns * grid.frameWidth !== image.width || grid.rows * grid.frameHeight !== image.height) {
    throw new RangeError('frame grid dimensions do not match the image');
  }
  return cropRaster(image, rect);
}

export function composeFrameGrid(frames, options) {
  if (!Array.isArray(frames) || frames.length === 0) throw new TypeError('frames must be a non-empty array');
  if (!options || typeof options !== 'object') throw new TypeError('frame grid options are required');
  const rows = options.rows;
  const columns = options.columns;
  assertInteger(rows, 'frame grid rows', { min: 1 });
  assertInteger(columns, 'frame grid columns', { min: 1 });
  if (frames.length !== rows * columns) throw new RangeError('frame count must equal rows times columns');
  assertRasterImage(frames[0], 'frame 0');
  const frameWidth = frames[0].width;
  const frameHeight = frames[0].height;
  for (let index = 1; index < frames.length; index += 1) {
    assertRasterImage(frames[index], `frame ${index}`);
    if (frames[index].width !== frameWidth || frames[index].height !== frameHeight) {
      throw new RangeError('all frames must have the same dimensions');
    }
  }
  const output = createRaster(frameWidth * columns, frameHeight * rows, options.color);
  for (let index = 0; index < frames.length; index += 1) {
    compositeRaster(output, frames[index], {
      x: (index % columns) * frameWidth,
      y: Math.floor(index / columns) * frameHeight
    });
  }
  return output;
}

export function chromaKeyRaster(image, keyColor, options = {}) {
  assertRasterImage(image);
  const key = normalizeColor(keyColor, 'keyColor');
  const tolerance = options.tolerance ?? 0;
  if (!Number.isFinite(tolerance) || tolerance < 0) throw new RangeError('chroma tolerance must be a finite number >= 0');
  const output = { width: image.width, height: image.height, rgba: Buffer.from(image.rgba) };
  const toleranceSquared = tolerance ** 2;
  for (let offset = 0; offset < output.rgba.length; offset += 4) {
    const distanceSquared = (output.rgba[offset] - key[0]) ** 2
      + (output.rgba[offset + 1] - key[1]) ** 2
      + (output.rgba[offset + 2] - key[2]) ** 2;
    if (distanceSquared > toleranceSquared) continue;
    if (options.clearRgb !== false) {
      output.rgba[offset] = 0;
      output.rgba[offset + 1] = 0;
      output.rgba[offset + 2] = 0;
    }
    output.rgba[offset + 3] = 0;
  }
  return output;
}

function localAlphaBounds(image, threshold) {
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (image.rgba[(y * image.width + x) * 4 + 3] <= threshold) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return maxX < minX ? null : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

export function trimRasterAlpha(image, options = {}) {
  assertRasterImage(image);
  const threshold = options.threshold ?? 0;
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 255) {
    throw new RangeError('alpha threshold must be an integer in [0, 255]');
  }
  const bounds = localAlphaBounds(image, threshold);
  return bounds ? cropRaster(image, bounds) : createRaster(1, 1);
}

export function padRaster(image, padding, color = [0, 0, 0, 0]) {
  assertRasterImage(image);
  const values = typeof padding === 'number'
    ? { top: padding, right: padding, bottom: padding, left: padding }
    : padding;
  if (!values || typeof values !== 'object') throw new TypeError('padding must be an integer or side object');
  const normalized = {
    top: values.top ?? 0,
    right: values.right ?? 0,
    bottom: values.bottom ?? 0,
    left: values.left ?? 0
  };
  for (const [side, value] of Object.entries(normalized)) assertInteger(value, `${side} padding`);
  const output = createRaster(
    image.width + normalized.left + normalized.right,
    image.height + normalized.top + normalized.bottom,
    color
  );
  return compositeRaster(output, image, { x: normalized.left, y: normalized.top });
}
