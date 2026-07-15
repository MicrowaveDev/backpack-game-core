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
