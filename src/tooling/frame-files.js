import fs from 'node:fs';
import path from 'node:path';
import { readPngAsRgba } from './image.js';
import {
  composeFrameGrid,
  resizeRasterBox,
  resizeRasterHybrid,
  resizeRasterNearest
} from './raster.js';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resizeFrame(image, width, height, mode) {
  if (mode === 'nearest') return resizeRasterNearest(image, width, height);
  if (mode === 'box') return resizeRasterBox(image, width, height);
  if (mode === 'hybrid') return resizeRasterHybrid(image, width, height);
  throw new RangeError('frame resize mode must be nearest, box, or hybrid');
}

export function findIndexedFiles(directory, options = {}) {
  if (typeof directory !== 'string' || directory.length === 0) {
    throw new TypeError('indexed file directory must be a non-empty string');
  }
  const prefix = options.prefix ?? '';
  const suffix = options.suffix ?? '';
  if (typeof prefix !== 'string' || typeof suffix !== 'string') {
    throw new TypeError('indexed file prefix and suffix must be strings');
  }
  const root = options.root ?? process.cwd();
  const absoluteDirectory = path.isAbsolute(directory) ? directory : path.resolve(root, directory);
  if (!fs.existsSync(absoluteDirectory)) return [];
  const pattern = new RegExp(`^${escapeRegExp(prefix)}(\\d+)${escapeRegExp(suffix)}$`);
  return fs.readdirSync(absoluteDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const match = entry.name.match(pattern);
      if (!match) return null;
      return {
        file: path.join(directory, entry.name),
        index: Number(match[1])
      };
    })
    .filter(Boolean)
    .sort((first, second) => first.index - second.index || first.file.localeCompare(second.file));
}

export function composePngFrameGrid(frameFiles, options = {}) {
  if (!Array.isArray(frameFiles) || frameFiles.length === 0) {
    throw new TypeError('frame files must be a non-empty array');
  }
  const frameWidth = options.frameWidth;
  const frameHeight = options.frameHeight;
  if (!Number.isSafeInteger(frameWidth) || frameWidth < 1) {
    throw new TypeError('frame width must be an integer >= 1');
  }
  if (!Number.isSafeInteger(frameHeight) || frameHeight < 1) {
    throw new TypeError('frame height must be an integer >= 1');
  }
  const root = options.root ?? process.cwd();
  const frames = frameFiles.map((file) => {
    if (typeof file !== 'string' || file.length === 0) {
      throw new TypeError('each frame file must be a non-empty string');
    }
    let frame = readPngAsRgba(path.isAbsolute(file) ? file : path.resolve(root, file));
    if (frame.width === frameWidth && frame.height === frameHeight) return frame;
    if (!options.resize) {
      throw new RangeError(`frame ${file} is ${frame.width}x${frame.height}, expected ${frameWidth}x${frameHeight}`);
    }
    frame = resizeFrame(frame, frameWidth, frameHeight, options.resize);
    return frame;
  });
  const rows = options.rows ?? 1;
  const columns = options.columns ?? frameFiles.length;
  return composeFrameGrid(frames, {
    rows,
    columns,
    color: options.color,
    mode: options.mode ?? 'copy'
  });
}
