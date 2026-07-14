import crypto from 'node:crypto';
import { assertRasterImage, assertRasterRect } from './raster.js';

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
