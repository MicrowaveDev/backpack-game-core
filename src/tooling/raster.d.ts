export interface RasterImage { width: number; height: number; rgba: Buffer }
export interface RasterRect { x: number; y: number; width: number; height: number }
export type RgbColor = readonly [number, number, number];
export type RgbaColor = readonly [number, number, number, number];
export type RasterColor = RgbColor | RgbaColor;
export interface FrameGrid { rows: number; columns: number; frameWidth: number; frameHeight: number }
export interface RasterPadding { top?: number; right?: number; bottom?: number; left?: number }

export function assertRasterImage<T extends RasterImage>(image: T, label?: string): T;
export function assertRasterRect<T extends RasterRect>(rect: T, label?: string): T;
export function createRaster(width: number, height: number, color?: RasterColor): RasterImage;
export function fillRaster(image: RasterImage, color: RasterColor, rect?: RasterRect): RasterImage;
export const fillRasterRect: typeof fillRaster;
export function paintCheckerboard(image: RasterImage, rect: RasterRect, options?: { size?: number; colors?: readonly [RasterColor, RasterColor] }): RasterImage;
export function cropRaster(image: RasterImage, rect: RasterRect): RasterImage;
export function resizeRasterNearest(image: RasterImage, width: number, height: number): RasterImage;
export function resizeRasterBox(image: RasterImage, width: number, height: number): RasterImage;
export function resizeRasterHybrid(image: RasterImage, width: number, height: number): RasterImage;
export function compositeRaster(destination: RasterImage, source: RasterImage, options?: { x?: number; y?: number; sourceRect?: RasterRect; mode?: 'source-over' | 'max-alpha' | 'opaque' | 'copy' }): RasterImage;
export function tileRaster(destination: RasterImage, tile: RasterImage, rect?: RasterRect): RasterImage;
export function createFrameGrid(image: RasterImage, options: { rows: number; columns: number; frameWidth?: number; frameHeight?: number }): FrameGrid;
export function frameRect(grid: FrameGrid, row: number, column: number): RasterRect;
export function extractFrame(image: RasterImage, grid: FrameGrid, row: number, column: number): RasterImage;
export function composeFrameGrid(frames: RasterImage[], options: { rows: number; columns: number; color?: RasterColor }): RasterImage;
export function chromaKeyRaster(image: RasterImage, keyColor: RasterColor, options?: { tolerance?: number; clearRgb?: boolean }): RasterImage;
export function trimRasterAlpha(image: RasterImage, options?: { threshold?: number }): RasterImage;
export function padRaster(image: RasterImage, padding: number | RasterPadding, color?: RasterColor): RasterImage;
