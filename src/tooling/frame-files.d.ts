import type { RasterColor, RasterImage } from './raster.js';

export interface IndexedFile {
  file: string;
  index: number;
}

export function findIndexedFiles(directory: string, options?: {
  root?: string;
  prefix?: string;
  suffix?: string;
}): IndexedFile[];

export function composePngFrameGrid(frameFiles: string[], options: {
  root?: string;
  frameWidth: number;
  frameHeight: number;
  rows?: number;
  columns?: number;
  resize?: 'nearest' | 'box' | 'hybrid';
  mode?: 'source-over' | 'max-alpha' | 'opaque' | 'copy';
  color?: RasterColor;
}): RasterImage;

export interface IndexedAnimationOptions {
  root?: string;
  sourcePath: string;
  sourceSuffix?: string;
  frameMarker?: string;
  frameSuffix?: string;
  expectedFrames: number;
  frameWidth: number;
  frameHeight: number;
  outputWidth?: number;
  outputHeight?: number;
  rows?: number;
  columns?: number;
  resize?: 'nearest' | 'box' | 'hybrid';
  mode?: 'source-over' | 'max-alpha' | 'opaque' | 'copy';
  color?: RasterColor;
}

export type IndexedAnimationResult =
  | { ok: true; kind: 'fallback'; sourcePath: string; frameFiles: IndexedFile[] }
  | { ok: true; kind: 'frames'; image: RasterImage; frameFiles: IndexedFile[] }
  | {
      ok: false;
      code: 'frames-and-fallback-missing' | 'frame-count-mismatch' | 'frame-processing-failed' | 'output-dimensions-mismatch';
      message: string;
      frameFiles: IndexedFile[];
      sourcePath?: string;
      framePattern?: string;
      expectedFrames?: number;
      actualFrames?: number;
      expectedWidth?: number;
      expectedHeight?: number;
      actualWidth?: number;
      actualHeight?: number;
      image?: RasterImage;
      error?: unknown;
    };

export function prepareIndexedPngAnimation(options: IndexedAnimationOptions): IndexedAnimationResult;
