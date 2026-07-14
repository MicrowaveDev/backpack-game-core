import type { PngImage } from './image.js';
export function captureTallPage(options: Record<string, any>): Promise<PngImage>;
export function renderHtmlReview(options: Record<string, any>): Promise<PngImage & { buffer: Buffer; outputPath: string | null }>;
export function runImageReview(options: Record<string, any>): Promise<Record<string, any>>;
