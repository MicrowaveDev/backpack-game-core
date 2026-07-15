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
export function cropRasterNormalized(image: RasterImage, options: { center: { x: number; y: number }; widthRatio: number; heightRatio: number }): { image: RasterImage; rect: RasterRect };
export function resizeRaster(image: RasterImage, width: number, height: number, options?: { mode?: 'nearest' | 'box' | 'hybrid' }): RasterImage;
export function resizeRasterNearest(image: RasterImage, width: number, height: number): RasterImage;
export function resizeRasterBox(image: RasterImage, width: number, height: number): RasterImage;
export function resizeRasterHybrid(image: RasterImage, width: number, height: number): RasterImage;
export function containRasterRect(image: RasterImage, rect: RasterRect, options?: { alignX?: number; alignY?: number; allowUpscale?: boolean }): RasterRect;
export function compositeRasterToRect(destination: RasterImage, source: RasterImage, rect: RasterRect, options?: { resize?: 'nearest' | 'box' | 'hybrid'; mode?: 'source-over' | 'max-alpha' | 'opaque' | 'copy'; fit?: 'stretch' | 'contain'; alignX?: number; alignY?: number }): RasterImage;
export function repeatRasterGrid(destination: RasterImage, source: RasterImage, rect: RasterRect, options?: { rows?: number; columns?: number; resize?: 'nearest' | 'box' | 'hybrid'; mode?: 'source-over' | 'max-alpha' | 'opaque' | 'copy'; fit?: 'stretch' | 'contain'; alignX?: number; alignY?: number }): RasterImage;
export function compositeRaster(destination: RasterImage, source: RasterImage, options?: { x?: number; y?: number; sourceRect?: RasterRect; mode?: 'source-over' | 'max-alpha' | 'opaque' | 'copy' }): RasterImage;
export function tileRaster(destination: RasterImage, tile: RasterImage, rect?: RasterRect): RasterImage;
export function createFrameGridFromDimensions(dimensions: { width: number; height: number }, options: { rows: number; columns: number; frameWidth?: number; frameHeight?: number }): FrameGrid;
export function createFrameGrid(image: RasterImage, options: { rows: number; columns: number; frameWidth?: number; frameHeight?: number }): FrameGrid;
export function frameRect(grid: FrameGrid, row: number, column: number): RasterRect;
export function extractFrame(image: RasterImage, grid: FrameGrid, row: number, column: number): RasterImage;
export function composeFrameGrid(frames: RasterImage[], options: { rows: number; columns: number; color?: RasterColor; mode?: 'source-over' | 'max-alpha' | 'opaque' | 'copy' }): RasterImage;
export function chromaKeyRaster(image: RasterImage, keyColor: RasterColor, options?: { tolerance?: number; clearRgb?: boolean }): RasterImage;
export function createAlphaDiagnosticRaster(image: RasterImage, options?: { mode?: 'mask' | 'edge'; edgeThreshold?: number; edgeColor?: RasterColor }): RasterImage;
export function compositeAlphaDiagnosticRaster(destination: RasterImage, source: RasterImage, options?: { x?: number; y?: number; mode?: 'color' | 'mask' | 'edge'; edgeThreshold?: number; edgeColor?: RasterColor; clip?: boolean }): RasterImage;
export function trimRasterAlpha(image: RasterImage, options?: { threshold?: number }): RasterImage;
export function padRaster(image: RasterImage, padding: number | RasterPadding, color?: RasterColor): RasterImage;
export function fitRasterAlphaToCanvas(image: RasterImage, options?: { width?: number; height?: number; margin?: number; threshold?: number; resize?: 'nearest' | 'box' | 'hybrid'; mode?: 'source-over' | 'max-alpha' | 'opaque' | 'copy'; color?: RasterColor }): { image: RasterImage; bounds: RasterRect | null; scale: number | null };
export function shiftRasterRgb(image: RasterImage, target: RasterColor, options?: { strength?: number }): RasterImage;
export function blendRasterTowardAverage(image: RasterImage, strength: number): RasterImage;
export function blendRasterOppositeEdges(image: RasterImage, options?: { margin?: number; strength?: number; axes?: Array<'horizontal' | 'vertical'> }): RasterImage;
export function neutralizeRasterEdges(image: RasterImage, options?: { margin?: number; strength?: number; target?: RasterColor }): RasterImage;
export function normalizeRasterDetail(image: RasterImage, options: { quantizeStep: number; neighborBlend: number; minimumAlpha: number }): RasterImage;
