import crypto from 'node:crypto';
import { assertRasterImage, assertRasterRect, createRaster, fillRaster } from './raster.js';

function normalizeThreshold(value) {
  const threshold = value ?? 0;
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 255) {
    throw new RangeError('alpha threshold must be an integer in [0, 255]');
  }
  return threshold;
}

function containedRect(image, rect) {
  const normalized = rect ?? { x: 0, y: 0, width: image.width, height: image.height };
  assertRasterRect(normalized);
  if (normalized.x < 0 || normalized.y < 0
    || normalized.x + normalized.width > image.width || normalized.y + normalized.height > image.height) {
    throw new RangeError('rect must be inside image bounds');
  }
  return normalized;
}

export function alphaBounds(image, options = {}) {
  assertRasterImage(image);
  const rect = containedRect(image, options.rect);
  const threshold = normalizeThreshold(options.threshold);
  let minX = rect.x + rect.width;
  let minY = rect.y + rect.height;
  let maxX = -1;
  let maxY = -1;
  let visiblePixels = 0;
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      if (image.rgba[(y * image.width + x) * 4 + 3] <= threshold) continue;
      visiblePixels += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (visiblePixels === 0) return null;
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    minX,
    minY,
    maxX,
    maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    visiblePixels
  };
}

export function frameHash(image, rect) {
  assertRasterImage(image);
  const frame = containedRect(image, rect);
  const hash = crypto.createHash('sha256');
  for (let y = frame.y; y < frame.y + frame.height; y += 1) {
    const offset = (y * image.width + frame.x) * 4;
    hash.update(image.rgba.subarray(offset, offset + frame.width * 4));
  }
  return hash.digest('hex');
}

export function frameDifference(first, second, options = {}) {
  assertRasterImage(first, 'first image');
  assertRasterImage(second, 'second image');
  const firstRect = containedRect(first, options.firstRect);
  const secondRect = containedRect(second, options.secondRect);
  if (firstRect.width !== secondRect.width || firstRect.height !== secondRect.height) {
    throw new RangeError('frame rectangles must have the same dimensions');
  }
  const alphaThreshold = options.alphaThreshold ?? 0;
  const colorThreshold = options.colorThreshold ?? 0;
  const visibleAlphaThreshold = options.visibleAlphaThreshold ?? 0;
  if (!Number.isFinite(alphaThreshold) || alphaThreshold < 0
    || !Number.isFinite(colorThreshold) || colorThreshold < 0
    || !Number.isFinite(visibleAlphaThreshold) || visibleAlphaThreshold < 0) {
    throw new RangeError('difference thresholds must be finite numbers >= 0');
  }
  let differentPixels = 0;
  let totalChannelDifference = 0;
  let maxChannelDifference = 0;
  for (let y = 0; y < firstRect.height; y += 1) {
    for (let x = 0; x < firstRect.width; x += 1) {
      const a = ((firstRect.y + y) * first.width + firstRect.x + x) * 4;
      const b = ((secondRect.y + y) * second.width + secondRect.x + x) * 4;
      const alphaDifference = Math.abs(first.rgba[a + 3] - second.rgba[b + 3]);
      const colorDifference = Math.abs(first.rgba[a] - second.rgba[b])
        + Math.abs(first.rgba[a + 1] - second.rgba[b + 1])
        + Math.abs(first.rgba[a + 2] - second.rgba[b + 2]);
      const channelDifference = colorDifference + alphaDifference;
      totalChannelDifference += channelDifference;
      maxChannelDifference = Math.max(maxChannelDifference, channelDifference);
      const colorsVisible = first.rgba[a + 3] > visibleAlphaThreshold && second.rgba[b + 3] > visibleAlphaThreshold;
      if (alphaDifference > alphaThreshold || (colorsVisible && colorDifference > colorThreshold)) differentPixels += 1;
    }
  }
  const pixels = firstRect.width * firstRect.height;
  return {
    differentPixels,
    totalPixels: pixels,
    ratio: differentPixels / pixels,
    meanChannelDifference: totalChannelDifference / pixels,
    maxChannelDifference
  };
}

export function clusterFramesByDifference(image, rects, options = {}) {
  assertRasterImage(image);
  if (!Array.isArray(rects)) throw new TypeError('frame rects must be an array');
  const minimumDifferentPixels = options.minimumDifferentPixels ?? options.minDifferentPixels ?? 1;
  if (!Number.isSafeInteger(minimumDifferentPixels) || minimumDifferentPixels < 1) {
    throw new RangeError('minimumDifferentPixels must be an integer >= 1');
  }
  const differenceOptions = {
    alphaThreshold: options.alphaThreshold,
    colorThreshold: options.colorThreshold,
    visibleAlphaThreshold: options.visibleAlphaThreshold
  };
  const groups = [];
  rects.forEach((rect, index) => {
    const normalized = containedRect(image, rect);
    const group = groups.find((candidate) => frameDifference(image, image, {
      ...differenceOptions,
      firstRect: normalized,
      secondRect: candidate.representativeRect
    }).differentPixels < minimumDifferentPixels);
    if (group) {
      group.memberIndexes.push(index);
      return;
    }
    groups.push({
      representativeIndex: index,
      representativeRect: { ...normalized },
      memberIndexes: [index]
    });
  });
  return { groups, distinctCount: groups.length };
}

export function connectedComponents(image, options = {}) {
  assertRasterImage(image);
  const rect = containedRect(image, options.rect);
  const threshold = normalizeThreshold(options.threshold);
  const connectivity = options.connectivity ?? 4;
  if (connectivity !== 4 && connectivity !== 8) throw new RangeError('connectivity must be 4 or 8');
  const visited = new Uint8Array(rect.width * rect.height);
  const components = [];
  const neighbors = connectivity === 8
    ? [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]
    : [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const visible = (x, y) => image.rgba[((rect.y + y) * image.width + rect.x + x) * 4 + 3] > threshold;

  for (let y = 0; y < rect.height; y += 1) {
    for (let x = 0; x < rect.width; x += 1) {
      const start = y * rect.width + x;
      if (visited[start] || !visible(x, y)) continue;
      visited[start] = 1;
      const stack = [start];
      let pixels = 0;
      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;
      while (stack.length > 0) {
        const current = stack.pop();
        const currentX = current % rect.width;
        const currentY = Math.floor(current / rect.width);
        pixels += 1;
        minX = Math.min(minX, currentX);
        minY = Math.min(minY, currentY);
        maxX = Math.max(maxX, currentX);
        maxY = Math.max(maxY, currentY);
        for (const [dx, dy] of neighbors) {
          const nextX = currentX + dx;
          const nextY = currentY + dy;
          if (nextX < 0 || nextY < 0 || nextX >= rect.width || nextY >= rect.height) continue;
          const next = nextY * rect.width + nextX;
          if (visited[next] || !visible(nextX, nextY)) continue;
          visited[next] = 1;
          stack.push(next);
        }
      }
      const absoluteMinX = rect.x + minX;
      const absoluteMinY = rect.y + minY;
      const absoluteMaxX = rect.x + maxX;
      const absoluteMaxY = rect.y + maxY;
      components.push({
        pixels,
        x: absoluteMinX,
        y: absoluteMinY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        minX: absoluteMinX,
        minY: absoluteMinY,
        maxX: absoluteMaxX,
        maxY: absoluteMaxY,
        touchesRectEdge: minX === 0 || minY === 0 || maxX === rect.width - 1 || maxY === rect.height - 1
      });
    }
  }
  return components.sort((a, b) => b.pixels - a.pixels || a.y - b.y || a.x - b.x);
}

export function connectedComponentsFromMask(mask, options = {}) {
  if (!mask || typeof mask !== 'object') throw new TypeError('mask must be an object');
  const width = mask.width;
  const height = mask.height;
  if (!Number.isSafeInteger(width) || width < 1 || !Number.isSafeInteger(height) || height < 1) {
    throw new TypeError('mask dimensions must be positive integers');
  }
  if (!mask.data || mask.data.length !== width * height) {
    throw new RangeError('mask data size must match its dimensions');
  }
  const image = { width, height, rgba: Buffer.alloc(width * height * 4) };
  for (let index = 0; index < mask.data.length; index += 1) {
    if (mask.data[index]) image.rgba[index * 4 + 3] = 255;
  }
  return connectedComponents(image, { rect: options.rect, connectivity: options.connectivity });
}

function assertBinaryMask(mask) {
  if (!mask || typeof mask !== 'object') throw new TypeError('mask must be an object');
  if (!Number.isSafeInteger(mask.width) || mask.width < 1
    || !Number.isSafeInteger(mask.height) || mask.height < 1) {
    throw new TypeError('mask dimensions must be positive integers');
  }
  if (!mask.data || mask.data.length !== mask.width * mask.height) {
    throw new RangeError('mask data size must match its dimensions');
  }
  return mask;
}

export function maskBoundaryEdges(mask) {
  assertBinaryMask(mask);
  const edges = [];
  for (let row = 0; row < mask.height; row += 1) {
    for (let column = 0; column < mask.width; column += 1) {
      if (!mask.data[row * mask.width + column]) continue;
      const neighbors = [
        { direction: 'left', emptyColumn: column - 1, emptyRow: row },
        { direction: 'right', emptyColumn: column + 1, emptyRow: row },
        { direction: 'top', emptyColumn: column, emptyRow: row - 1 },
        { direction: 'bottom', emptyColumn: column, emptyRow: row + 1 }
      ];
      for (const edge of neighbors) {
        if (edge.emptyColumn < 0 || edge.emptyColumn >= mask.width
          || edge.emptyRow < 0 || edge.emptyRow >= mask.height
          || mask.data[edge.emptyRow * mask.width + edge.emptyColumn]) {
          continue;
        }
        edges.push({ column, row, ...edge });
      }
    }
  }
  return edges;
}

function longestThresholdRun(values, threshold) {
  let longest = 0;
  let current = 0;
  let count = 0;
  for (const value of values) {
    if (value > threshold) {
      current += 1;
      count += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return { longest, count };
}

export function analyzeMaskBoundaryAlpha(image, mask, options = {}) {
  assertRasterImage(image);
  assertBinaryMask(mask);
  if (image.width % mask.width !== 0 || image.height % mask.height !== 0) {
    throw new RangeError('image dimensions must be divisible by mask dimensions');
  }
  const stripWidth = options.stripWidth ?? options.stripPx ?? 4;
  const alphaThreshold = options.alphaThreshold ?? 48;
  const requestedInset = options.inset;
  if (!Number.isSafeInteger(stripWidth) || stripWidth < 1) {
    throw new RangeError('stripWidth must be an integer >= 1');
  }
  if (!Number.isInteger(alphaThreshold) || alphaThreshold < 0 || alphaThreshold > 255) {
    throw new RangeError('alphaThreshold must be an integer in [0, 255]');
  }
  if (requestedInset != null && (!Number.isSafeInteger(requestedInset) || requestedInset < 0)) {
    throw new RangeError('inset must be an integer >= 0');
  }
  const cellWidth = image.width / mask.width;
  const cellHeight = image.height / mask.height;
  const alphaAt = (x, y) => image.rgba[(y * image.width + x) * 4 + 3];
  const edges = maskBoundaryEdges(mask).map((edge) => {
    const vertical = edge.direction === 'left' || edge.direction === 'right';
    const edgeLength = vertical ? cellHeight : cellWidth;
    const inset = Math.min(requestedInset ?? Math.min(10, Math.floor(edgeLength * 0.08)), Math.floor(edgeLength / 2));
    const maximumAlphas = [];
    for (let position = inset; position < edgeLength - inset; position += 1) {
      let maximumAlpha = 0;
      for (let stripOffset = 0; stripOffset < Math.min(stripWidth, vertical ? cellWidth : cellHeight); stripOffset += 1) {
        let x;
        let y;
        if (edge.direction === 'left') {
          x = edge.column * cellWidth + stripOffset;
          y = edge.row * cellHeight + position;
        } else if (edge.direction === 'right') {
          x = (edge.column + 1) * cellWidth - 1 - stripOffset;
          y = edge.row * cellHeight + position;
        } else if (edge.direction === 'top') {
          x = edge.column * cellWidth + position;
          y = edge.row * cellHeight + stripOffset;
        } else {
          x = edge.column * cellWidth + position;
          y = (edge.row + 1) * cellHeight - 1 - stripOffset;
        }
        maximumAlpha = Math.max(maximumAlpha, alphaAt(x, y));
      }
      maximumAlphas.push(maximumAlpha);
    }
    const { longest, count } = longestThresholdRun(maximumAlphas, alphaThreshold);
    const sampleCount = maximumAlphas.length;
    return {
      ...edge,
      edgeLength,
      inset,
      sampleCount,
      aboveThresholdCount: count,
      aboveThresholdRatio: sampleCount ? count / sampleCount : 0,
      longestAboveThresholdRun: longest,
      longestAboveThresholdRunRatio: sampleCount ? longest / sampleCount : 0,
      maximumAlphas
    };
  });
  return { cellWidth, cellHeight, edges };
}

function colorHex(red, green, blue) {
  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function paletteRecords(counts, total) {
  return [...counts.entries()].map(([key, count]) => {
    const rgb = key.split(',').map(Number);
    return { rgb, hex: colorHex(...rgb), count, ratio: total ? count / total : 0, pct: total ? count / total : 0 };
  }).sort((first, second) => second.count - first.count || first.hex.localeCompare(second.hex));
}

export function paletteHistogram(image, options = {}) {
  assertRasterImage(image);
  const rect = containedRect(image, options.rect);
  const alphaThreshold = normalizeThreshold(options.alphaThreshold);
  const steps = options.quantizationSteps ?? [];
  if (!Array.isArray(steps) || steps.some((step) => !Number.isInteger(step) || step < 1 || step > 255)) {
    throw new RangeError('quantization steps must be integers in [1, 255]');
  }
  const exact = new Map();
  const quantized = new Map(steps.map((step) => [step, new Map()]));
  let includedPixels = 0;
  let transparentPixels = 0;
  let policyExcludedPixels = 0;
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      const index = y * image.width + x;
      const offset = index * 4;
      const rgba = [image.rgba[offset], image.rgba[offset + 1], image.rgba[offset + 2], image.rgba[offset + 3]];
      if (rgba[3] <= alphaThreshold) {
        transparentPixels += 1;
        continue;
      }
      if (options.includePixel && !options.includePixel(rgba, { x, y, index })) {
        policyExcludedPixels += 1;
        continue;
      }
      includedPixels += 1;
      const exactKey = rgba.slice(0, 3).join(',');
      exact.set(exactKey, (exact.get(exactKey) || 0) + 1);
      for (const [step, counts] of quantized) {
        const key = rgba.slice(0, 3).map((channel) => {
          const bucket = Math.floor(channel / step);
          return Math.min(255, bucket * step + Math.floor(step / 2));
        }).join(',');
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
  }
  const totalPixels = rect.width * rect.height;
  return {
    totalPixels,
    includedPixels,
    excludedPixels: totalPixels - includedPixels,
    transparentPixels,
    policyExcludedPixels,
    exact: paletteRecords(exact, includedPixels),
    quantized: Object.fromEntries([...quantized].map(([step, counts]) => [step, paletteRecords(counts, includedPixels)]))
  };
}

export function renderPaletteSwatch(records, options = {}) {
  if (!Array.isArray(records)) throw new TypeError('palette records must be an array');
  const columns = options.columns ?? 12;
  const cell = options.cell ?? 18;
  const gap = options.gap ?? 2;
  const limit = options.limit ?? records.length;
  for (const [label, value] of [['columns', columns], ['cell', cell], ['gap', gap], ['limit', limit]]) {
    if (!Number.isInteger(value) || value < (label === 'gap' ? 0 : 1)) throw new RangeError(`${label} must be a valid integer`);
  }
  const colors = records.slice(0, limit);
  const rows = Math.max(1, Math.ceil(colors.length / columns));
  const image = createRaster(gap + columns * (cell + gap), gap + rows * (cell + gap), options.background ?? [46, 43, 52, 255]);
  colors.forEach((record, index) => {
    if (!record || !record.rgb) throw new TypeError('palette record rgb is required');
    const x = gap + (index % columns) * (cell + gap);
    const y = gap + Math.floor(index / columns) * (cell + gap);
    fillRaster(image, options.border ?? [14, 13, 17, 255], { x, y, width: cell, height: cell });
    if (cell > 2) fillRaster(image, record.rgb, { x: x + 1, y: y + 1, width: cell - 2, height: cell - 2 });
  });
  return image;
}

export function averageRegionRgb(image, rect = { x: 0, y: 0, width: image?.width, height: image?.height }) {
  assertRasterImage(image);
  const region = containedRect(image, rect);
  let red = 0;
  let green = 0;
  let blue = 0;
  const count = region.width * region.height;
  for (let y = region.y; y < region.y + region.height; y += 1) {
    for (let x = region.x; x < region.x + region.width; x += 1) {
      const offset = (y * image.width + x) * 4;
      red += image.rgba[offset];
      green += image.rgba[offset + 1];
      blue += image.rgba[offset + 2];
    }
  }
  return [red / count, green / count, blue / count];
}

export function averageEdgeRgb(image, side, options = {}) {
  assertRasterImage(image);
  if (!['top', 'right', 'bottom', 'left'].includes(side)) {
    throw new RangeError('edge side must be top, right, bottom, or left');
  }
  const thickness = options.thickness ?? 1;
  if (!Number.isInteger(thickness) || thickness < 1) throw new RangeError('edge thickness must be a positive integer');
  const band = options.band;
  if (band != null) {
    if (!band || !Number.isInteger(band.start) || !Number.isInteger(band.end) || band.start < 0 || band.end <= band.start) {
      throw new RangeError('edge band must have integer bounds with 0 <= start < end');
    }
  }
  const horizontal = side === 'top' || side === 'bottom';
  const edgeLength = horizontal ? image.width : image.height;
  const start = band?.start ?? 0;
  const end = band?.end ?? edgeLength;
  if (end > edgeLength) throw new RangeError('edge band must be inside image bounds');
  const depth = Math.min(thickness, horizontal ? image.height : image.width);
  let rect;
  if (side === 'top') rect = { x: start, y: 0, width: end - start, height: depth };
  else if (side === 'bottom') rect = { x: start, y: image.height - depth, width: end - start, height: depth };
  else if (side === 'left') rect = { x: 0, y: start, width: depth, height: end - start };
  else rect = { x: image.width - depth, y: start, width: depth, height: end - start };
  return averageRegionRgb(image, rect);
}

export function opaqueMatteMetrics(image, options = {}) {
  assertRasterImage(image);
  const rect = containedRect(image, options.rect);
  const alphaThreshold = normalizeThreshold(options.alphaThreshold ?? 0);
  const cornerSize = options.cornerSize ?? Math.max(1, Math.floor(Math.min(rect.width, rect.height) * 0.08));
  if (!Number.isInteger(cornerSize) || cornerSize < 1 || cornerSize > rect.width || cornerSize > rect.height) {
    throw new RangeError('corner size must fit inside the analysis rectangle');
  }
  let opaquePixels = 0;
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      if (image.rgba[(y * image.width + x) * 4 + 3] > alphaThreshold) opaquePixels += 1;
    }
  }
  const cornerRects = [
    { x: rect.x, y: rect.y, width: cornerSize, height: cornerSize },
    { x: rect.x + rect.width - cornerSize, y: rect.y, width: cornerSize, height: cornerSize },
    { x: rect.x, y: rect.y + rect.height - cornerSize, width: cornerSize, height: cornerSize },
    { x: rect.x + rect.width - cornerSize, y: rect.y + rect.height - cornerSize, width: cornerSize, height: cornerSize }
  ];
  const cornerAverages = cornerRects.map((corner) => averageRegionRgb(image, corner));
  let maximumCornerDistance = 0;
  for (let first = 0; first < cornerAverages.length; first += 1) {
    for (let second = first + 1; second < cornerAverages.length; second += 1) {
      maximumCornerDistance = Math.max(maximumCornerDistance, rgbDistance(cornerAverages[first], cornerAverages[second]));
    }
  }
  return {
    alphaCoverage: opaquePixels / (rect.width * rect.height),
    cornerAverages,
    maximumCornerDistance,
    meanLuminance: cornerAverages.reduce((sum, rgb) => sum + luminance(rgb), 0) / cornerAverages.length
  };
}

export function luminance(rgb) {
  if ((!Array.isArray(rgb) && !ArrayBuffer.isView(rgb)) || rgb.length < 3) {
    throw new TypeError('rgb must contain at least three channels');
  }
  for (let channel = 0; channel < 3; channel += 1) {
    if (!Number.isFinite(rgb[channel])) throw new TypeError('rgb channels must be finite numbers');
  }
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}

export function rgbDistance(first, second) {
  luminance(first);
  luminance(second);
  return Math.hypot(first[0] - second[0], first[1] - second[1], first[2] - second[2]);
}
