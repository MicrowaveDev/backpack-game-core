import type { RasterImage, RasterRect, RgbColor } from './raster.js';

export interface AlphaBounds extends RasterRect {
  minX: number; minY: number; maxX: number; maxY: number;
  centerX: number; centerY: number; visiblePixels: number;
}
export interface FrameDifference {
  differentPixels: number; totalPixels: number; ratio: number;
  meanChannelDifference: number; maxChannelDifference: number;
}
export interface ConnectedComponent extends RasterRect {
  pixels: number; minX: number; minY: number; maxX: number; maxY: number;
  touchesRectEdge: boolean;
}
export interface BinaryMask { width: number; height: number; data: ArrayLike<number> }
export interface PaletteColor { rgb: [number, number, number]; hex: string; count: number; ratio: number; pct: number }

export function alphaBounds(image: RasterImage, options?: { rect?: RasterRect; threshold?: number }): AlphaBounds | null;
export function frameHash(image: RasterImage, rect?: RasterRect): string;
export function frameDifference(first: RasterImage, second: RasterImage, options?: { firstRect?: RasterRect; secondRect?: RasterRect; alphaThreshold?: number; colorThreshold?: number; visibleAlphaThreshold?: number }): FrameDifference;
export function connectedComponents(image: RasterImage, options?: { rect?: RasterRect; threshold?: number; connectivity?: 4 | 8 }): ConnectedComponent[];
export function connectedComponentsFromMask(mask: BinaryMask, options?: { rect?: RasterRect; connectivity?: 4 | 8 }): ConnectedComponent[];
export function paletteHistogram(image: RasterImage, options?: { rect?: RasterRect; alphaThreshold?: number; quantizationSteps?: number[]; includePixel?: (rgba: [number, number, number, number], position: { x: number; y: number; index: number }) => boolean }): { totalPixels: number; includedPixels: number; excludedPixels: number; transparentPixels: number; policyExcludedPixels: number; exact: PaletteColor[]; quantized: Record<number, PaletteColor[]> };
export function renderPaletteSwatch(records: PaletteColor[], options?: { columns?: number; cell?: number; gap?: number; limit?: number; background?: import('./raster.js').RasterColor; border?: import('./raster.js').RasterColor }): RasterImage;
export function averageRegionRgb(image: RasterImage, rect?: RasterRect): [number, number, number];
export function averageEdgeRgb(image: RasterImage, side: 'top' | 'right' | 'bottom' | 'left', options?: { thickness?: number; band?: { start: number; end: number } }): [number, number, number];
export function opaqueMatteMetrics(image: RasterImage, options?: { rect?: RasterRect; cornerSize?: number; alphaThreshold?: number }): { alphaCoverage: number; cornerAverages: Array<[number, number, number]>; maximumCornerDistance: number; meanLuminance: number };
export function luminance(rgb: ArrayLike<number>): number;
export function rgbDistance(first: ArrayLike<number>, second: ArrayLike<number>): number;
