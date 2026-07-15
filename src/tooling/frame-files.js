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

export function prepareIndexedPngAnimation(options = {}) {
  const root = options.root ?? process.cwd();
  const sourcePath = options.sourcePath;
  if (typeof sourcePath !== 'string' || sourcePath.length === 0) {
    throw new TypeError('animation source path must be a non-empty string');
  }
  if (!Number.isSafeInteger(options.expectedFrames) || options.expectedFrames < 1) {
    throw new TypeError('expected animation frame count must be an integer >= 1');
  }
  const sourceSuffix = options.sourceSuffix ?? '.source.png';
  const frameMarker = options.frameMarker ?? '.frame_';
  const frameSuffix = options.frameSuffix ?? sourceSuffix;
  if ([sourceSuffix, frameMarker, frameSuffix].some((value) => typeof value !== 'string')) {
    throw new TypeError('animation source suffix, frame marker, and frame suffix must be strings');
  }
  const hasOutputWidth = options.outputWidth !== undefined;
  const hasOutputHeight = options.outputHeight !== undefined;
  if (hasOutputWidth !== hasOutputHeight) {
    throw new TypeError('animation output width and height must be provided together');
  }
  if (hasOutputWidth && (!Number.isSafeInteger(options.outputWidth) || options.outputWidth < 1
    || !Number.isSafeInteger(options.outputHeight) || options.outputHeight < 1)) {
    throw new TypeError('animation output dimensions must be integers >= 1');
  }

  const sourceDirectory = path.dirname(sourcePath);
  const sourceBaseName = path.basename(sourcePath, sourceSuffix);
  const prefix = `${sourceBaseName}${frameMarker}`;
  const frameFiles = findIndexedFiles(sourceDirectory, { root, prefix, suffix: frameSuffix });
  const absoluteSource = path.isAbsolute(sourcePath) ? sourcePath : path.resolve(root, sourcePath);

  if (frameFiles.length === 0) {
    if (fs.existsSync(absoluteSource)) {
      return { ok: true, kind: 'fallback', sourcePath, frameFiles };
    }
    const framePattern = path.join(sourceDirectory, `${prefix}N${frameSuffix}`);
    return {
      ok: false,
      code: 'frames-and-fallback-missing',
      message: `no indexed frame files matching ${framePattern} and no fallback source at ${sourcePath}`,
      sourcePath,
      framePattern,
      frameFiles
    };
  }

  if (frameFiles.length !== options.expectedFrames) {
    return {
      ok: false,
      code: 'frame-count-mismatch',
      message: `expected ${options.expectedFrames} frame files, found ${frameFiles.length}`,
      expectedFrames: options.expectedFrames,
      actualFrames: frameFiles.length,
      frameFiles
    };
  }

  let image;
  try {
    image = composePngFrameGrid(frameFiles.map(({ file }) => file), {
      root,
      frameWidth: options.frameWidth,
      frameHeight: options.frameHeight,
      rows: options.rows,
      columns: options.columns,
      resize: options.resize,
      mode: options.mode,
      color: options.color
    });
  } catch (error) {
    return {
      ok: false,
      code: 'frame-processing-failed',
      message: error instanceof Error ? error.message : String(error),
      error,
      frameFiles
    };
  }

  if (hasOutputWidth && (image.width !== options.outputWidth || image.height !== options.outputHeight)) {
    return {
      ok: false,
      code: 'output-dimensions-mismatch',
      message: `composed frame grid ${image.width}x${image.height} != expected ${options.outputWidth}x${options.outputHeight}`,
      expectedWidth: options.outputWidth,
      expectedHeight: options.outputHeight,
      actualWidth: image.width,
      actualHeight: image.height,
      image,
      frameFiles
    };
  }

  return { ok: true, kind: 'frames', image, frameFiles };
}
