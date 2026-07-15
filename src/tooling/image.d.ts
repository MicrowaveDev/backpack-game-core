export interface PngImage { width: number; height: number; rgba: Buffer }
export interface PngHeader { width: number; height: number; size: number; sha256: string }
export const PNG_SIGNATURE: Buffer;
export function fileSha256(filePath: string): string;
export function bufferSha256(buffer: Buffer): string;
export function escapeHtml(value: unknown): string;
export function imageFileDataUrl(filePath: string, options?: { mime?: string }): string;
export function readPngHeader(filePath: string, options?: { root?: string }): PngHeader;
export function readPngRgba(filePath: string): PngImage;
export function readPngAsRgba(filePath: string): PngImage;
export function decodePngBuffer(buffer: Buffer, options?: { label?: string }): PngImage;
export function pngChunk(type: string, data?: Buffer): Buffer;
export function encodeDeterministicPng(input: PngImage): Buffer;
export function stitchVerticalImages(images: PngImage[]): PngImage;
export function alphaAt(image: PngImage, x: number, y: number): number;
export function alphaStats(image: PngImage, rect: { x: number; y: number; width: number; height: number }, alphaThreshold?: number): Record<string, number | null>;
export function resolveFreshAfterTimestamp(value?: string | number | null): number | null;
export function defaultManifestPathFor(outPath: string): string;
export function tempPngPathFor(outPath: string): string;
export function readPreviousManifest(manifestPath: string): any;
export function inputEntriesFromPaths(entries: Array<{ id: string; filePath: string }>, options?: { root?: string }): any[];
export function inputSetHash(entries: any[]): string;
export function changedIdsFromManifest(currentInputs: any[], previousManifest: any): string[];
export function writeSheetManifest(options: Record<string, any>): any;
export function metadataEntriesHash(entries: any[], fields?: string[]): string;
export function buildMetadataBundle(options: Record<string, any>): any;
export function checkProvenance(options: Record<string, any>): { metadata: any; entries: any[] };
