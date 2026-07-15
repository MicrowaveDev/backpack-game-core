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

function resizeRasterWithMode(image, width, height, mode) {
  if (mode === 'nearest') return resizeRasterNearest(image, width, height);
  if (mode === 'box') return resizeRasterBox(image, width, height);
  if (mode === 'hybrid') return resizeRasterHybrid(image, width, height);
  throw new RangeError('resize mode must be nearest, box, or hybrid');
}

export function containRasterRect(image, rect, options = {}) {
  assertRasterImage(image);
  assertRasterRect(rect);
  const alignX = options.alignX ?? 0.5;
  const alignY = options.alignY ?? 0.5;
  if (!Number.isFinite(alignX) || alignX < 0 || alignX > 1
    || !Number.isFinite(alignY) || alignY < 0 || alignY > 1) {
    throw new RangeError('contain alignment must be finite numbers in [0, 1]');
  }
  const scale = Math.min(
    options.allowUpscale === false ? 1 : Number.POSITIVE_INFINITY,
    rect.width / image.width,
    rect.height / image.height
  );
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  return {
    x: rect.x + Math.floor((rect.width - width) * alignX),
    y: rect.y + Math.floor((rect.height - height) * alignY),
    width,
    height
  };
}

export function compositeRasterToRect(destination, source, rect, options = {}) {
  assertRasterImage(destination, 'destination');
  assertRasterImage(source, 'source');
  assertRasterRect(rect);
  const fit = options.fit ?? 'stretch';
  if (fit !== 'stretch' && fit !== 'contain') throw new RangeError('fit mode must be stretch or contain');
  const target = fit === 'contain' ? containRasterRect(source, rect, options) : rect;
  const resized = resizeRasterWithMode(source, target.width, target.height, options.resize ?? 'nearest');
  return compositeRaster(destination, resized, {
    x: target.x,
    y: target.y,
    mode: options.mode ?? 'source-over'
  });
}

export function repeatRasterGrid(destination, source, rect, options = {}) {
  assertRasterImage(destination, 'destination');
  assertRasterImage(source, 'source');
  assertRasterRect(rect);
  const rows = options.rows ?? 1;
  const columns = options.columns ?? 1;
  assertInteger(rows, 'grid rows', { min: 1 });
  assertInteger(columns, 'grid columns', { min: 1 });
  const cellWidth = Math.floor(rect.width / columns);
  const cellHeight = Math.floor(rect.height / rows);
  if (cellWidth < 1 || cellHeight < 1) throw new RangeError('grid cells must be at least one pixel');
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const cell = {
        x: rect.x + column * cellWidth,
        y: rect.y + row * cellHeight,
        width: column === columns - 1 ? rect.width - cellWidth * (columns - 1) : cellWidth,
        height: row === rows - 1 ? rect.height - cellHeight * (rows - 1) : cellHeight
      };
      compositeRasterToRect(destination, source, cell, options);
    }
  }
  return destination;
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
      y: Math.floor(index / columns) * frameHeight,
      mode: options.mode
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

export function createAlphaDiagnosticRaster(image, options = {}) {
  assertRasterImage(image);
  const mode = options.mode ?? 'mask';
  if (!['mask', 'edge'].includes(mode)) throw new RangeError('alpha diagnostic mode must be mask or edge');
  const edgeThreshold = options.edgeThreshold ?? 245;
  if (!Number.isInteger(edgeThreshold) || edgeThreshold < 0 || edgeThreshold > 255) {
    throw new RangeError('edge threshold must be an integer in [0, 255]');
  }
  const edgeColor = normalizeColor(options.edgeColor ?? [255, 0, 255, 255], 'edgeColor');
  const output = createRaster(image.width, image.height);
  for (let offset = 0; offset < image.rgba.length; offset += 4) {
    const alpha = image.rgba[offset + 3];
    if (alpha === 0) continue;
    if (mode === 'mask') {
      output.rgba[offset] = alpha;
      output.rgba[offset + 1] = alpha;
      output.rgba[offset + 2] = alpha;
    } else if (alpha < edgeThreshold) {
      output.rgba[offset] = edgeColor[0];
      output.rgba[offset + 1] = edgeColor[1];
      output.rgba[offset + 2] = edgeColor[2];
    } else {
      output.rgba[offset] = image.rgba[offset];
      output.rgba[offset + 1] = image.rgba[offset + 1];
      output.rgba[offset + 2] = image.rgba[offset + 2];
    }
    output.rgba[offset + 3] = 255;
  }
  return output;
}

export function compositeAlphaDiagnosticRaster(destination, source, options = {}) {
  assertRasterImage(destination, 'destination');
  assertRasterImage(source, 'source');
  const x = options.x ?? 0;
  const y = options.y ?? 0;
  assertCoordinate(x, 'diagnostic x');
  assertCoordinate(y, 'diagnostic y');
  const mode = options.mode ?? 'mask';
  const clip = options.clip !== false;
  if (!['color', 'mask', 'edge'].includes(mode)) {
    throw new RangeError('alpha diagnostic composite mode must be color, mask, or edge');
  }
  const edgeThreshold = options.edgeThreshold ?? 245;
  if (!Number.isInteger(edgeThreshold) || edgeThreshold < 0 || edgeThreshold > 255) {
    throw new RangeError('edge threshold must be an integer in [0, 255]');
  }
  const edgeColor = normalizeColor(options.edgeColor ?? [255, 0, 255, 255], 'edgeColor');
  for (let sourceY = 0; sourceY < source.height; sourceY += 1) {
    const targetY = y + sourceY;
    if (clip && (targetY < 0 || targetY >= destination.height)) continue;
    for (let sourceX = 0; sourceX < source.width; sourceX += 1) {
      const targetX = x + sourceX;
      if (clip && (targetX < 0 || targetX >= destination.width)) continue;
      const sourceOffset = (sourceY * source.width + sourceX) * 4;
      const alphaByte = source.rgba[sourceOffset + 3];
      if (alphaByte === 0) continue;
      const targetOffset = (targetY * destination.width + targetX) * 4;
      if (mode === 'mask') {
        destination.rgba[targetOffset] = alphaByte;
        destination.rgba[targetOffset + 1] = alphaByte;
        destination.rgba[targetOffset + 2] = alphaByte;
      } else if (mode === 'edge') {
        const color = alphaByte < edgeThreshold ? edgeColor : source.rgba.subarray(sourceOffset, sourceOffset + 3);
        destination.rgba[targetOffset] = color[0];
        destination.rgba[targetOffset + 1] = color[1];
        destination.rgba[targetOffset + 2] = color[2];
      } else {
        const alpha = alphaByte / 255;
        for (let channel = 0; channel < 3; channel += 1) {
          destination.rgba[targetOffset + channel] = Math.round(
            source.rgba[sourceOffset + channel] * alpha
            + destination.rgba[targetOffset + channel] * (1 - alpha)
          );
        }
      }
      destination.rgba[targetOffset + 3] = 255;
    }
  }
  return destination;
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

export function fitRasterAlphaToCanvas(image, options = {}) {
  assertRasterImage(image);
  const width = options.width ?? image.width;
  const height = options.height ?? image.height;
  const margin = options.margin ?? 0;
  const threshold = options.threshold ?? 0;
  checkedPixelCount(width, height, 'fitted raster');
  assertInteger(margin, 'fit margin');
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 255) {
    throw new RangeError('alpha threshold must be an integer in [0, 255]');
  }
  if (margin * 2 >= width || margin * 2 >= height) throw new RangeError('fit margin leaves no target area');
  const bounds = localAlphaBounds(image, threshold);
  if (!bounds) return { image: createRaster(width, height, options.color), bounds: null, scale: null };
  const scale = Math.min((width - margin * 2) / bounds.width, (height - margin * 2) / bounds.height);
  const fittedWidth = Math.max(1, Math.round(bounds.width * scale));
  const fittedHeight = Math.max(1, Math.round(bounds.height * scale));
  const target = createRaster(width, height, options.color);
  const cropped = cropRaster(image, bounds);
  const resized = resizeRasterWithMode(cropped, fittedWidth, fittedHeight, options.resize ?? 'nearest');
  compositeRaster(target, resized, {
    x: Math.round((width - fittedWidth) / 2),
    y: Math.round((height - fittedHeight) / 2),
    mode: options.mode ?? 'copy'
  });
  return { image: target, bounds, scale };
}

function smootherstep(value) {
  const x = Math.max(0, Math.min(1, value));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function rasterAverageRgb(image) {
  const sums = [0, 0, 0];
  const count = image.width * image.height;
  for (let offset = 0; offset < image.rgba.length; offset += 4) {
    for (let channel = 0; channel < 3; channel += 1) sums[channel] += image.rgba[offset + channel];
  }
  return sums.map((sum) => sum / count);
}

export function shiftRasterRgb(image, target, options = {}) {
  assertRasterImage(image);
  const color = normalizeColor(target, 'target');
  const strength = options.strength ?? 1;
  if (!Number.isFinite(strength) || strength < 0 || strength > 1) {
    throw new RangeError('shift strength must be a finite number in [0, 1]');
  }
  const current = rasterAverageRgb(image);
  const delta = current.map((value, channel) => (color[channel] - value) * strength);
  const output = { width: image.width, height: image.height, rgba: Buffer.from(image.rgba) };
  for (let offset = 0; offset < output.rgba.length; offset += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      output.rgba[offset + channel] = clampByte(output.rgba[offset + channel] + delta[channel]);
    }
  }
  return output;
}

export function blendRasterTowardAverage(image, strength) {
  assertRasterImage(image);
  if (!Number.isFinite(strength) || strength < 0 || strength > 1) {
    throw new RangeError('blend strength must be a finite number in [0, 1]');
  }
  const average = rasterAverageRgb(image);
  const output = { width: image.width, height: image.height, rgba: Buffer.from(image.rgba) };
  for (let offset = 0; offset < output.rgba.length; offset += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      output.rgba[offset + channel] = Math.round(
        output.rgba[offset + channel] * (1 - strength) + average[channel] * strength
      );
    }
  }
  return output;
}

export function blendRasterOppositeEdges(image, options = {}) {
  assertRasterImage(image);
  const margin = options.margin ?? 1;
  const strength = options.strength ?? 1;
  const axes = options.axes ?? ['horizontal', 'vertical'];
  assertInteger(margin, 'edge blend margin', { min: 1 });
  if (!Number.isFinite(strength) || strength < 0 || strength > 1) {
    throw new RangeError('edge blend strength must be a finite number in [0, 1]');
  }
  if (!Array.isArray(axes) || axes.some((axis) => axis !== 'horizontal' && axis !== 'vertical')) {
    throw new RangeError('edge blend axes must contain horizontal or vertical');
  }
  const edge = Math.max(1, Math.min(margin, Math.floor(Math.min(image.width, image.height) / 3)));
  const output = { width: image.width, height: image.height, rgba: Buffer.from(image.rgba) };
  const blendPair = (first, second, weight) => {
    for (let channel = 0; channel < 4; channel += 1) {
      const average = Math.round((output.rgba[first + channel] + output.rgba[second + channel]) / 2);
      output.rgba[first + channel] = Math.round(output.rgba[first + channel] * (1 - weight) + average * weight);
      output.rgba[second + channel] = Math.round(output.rgba[second + channel] * (1 - weight) + average * weight);
    }
  };
  if (axes.includes('horizontal')) {
    for (let y = 0; y < image.height; y += 1) {
      for (let distance = 0; distance < edge; distance += 1) {
        blendPair((y * image.width + distance) * 4, (y * image.width + image.width - 1 - distance) * 4, (1 - smootherstep(distance / edge)) * strength);
      }
    }
  }
  if (axes.includes('vertical')) {
    for (let x = 0; x < image.width; x += 1) {
      for (let distance = 0; distance < edge; distance += 1) {
        blendPair((distance * image.width + x) * 4, ((image.height - 1 - distance) * image.width + x) * 4, (1 - smootherstep(distance / edge)) * strength);
      }
    }
  }
  return output;
}

export function neutralizeRasterEdges(image, options = {}) {
  assertRasterImage(image);
  const margin = options.margin ?? 1;
  const strength = options.strength ?? 1;
  assertInteger(margin, 'edge neutralization margin', { min: 1 });
  if (!Number.isFinite(strength) || strength < 0 || strength > 1) {
    throw new RangeError('edge neutralization strength must be a finite number in [0, 1]');
  }
  const target = options.target ? normalizeColor(options.target, 'target') : rasterAverageRgb(image);
  const edge = Math.max(1, Math.min(margin, Math.floor(Math.min(image.width, image.height) / 2)));
  const output = { width: image.width, height: image.height, rgba: Buffer.from(image.rgba) };
  for (let y = 0; y < image.height; y += 1) {
    const dy = Math.min(y, image.height - 1 - y);
    for (let x = 0; x < image.width; x += 1) {
      const dx = Math.min(x, image.width - 1 - x);
      const weight = (1 - smootherstep(Math.min(dx, dy) / edge)) * strength;
      if (weight <= 0) continue;
      const offset = (y * image.width + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        output.rgba[offset + channel] = clampByte(output.rgba[offset + channel] * (1 - weight) + target[channel] * weight);
      }
    }
  }
  return output;
}
