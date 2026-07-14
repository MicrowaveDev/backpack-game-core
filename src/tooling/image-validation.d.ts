import type { PngImage } from './image.js';
export interface ValidationIssue { code: string; message: string; sourcePath?: string; outputPath?: string }
export function validateImagePolicy(image: PngImage, policy?: Record<string, any>): { issues: ValidationIssue[]; stats: Record<string, number | null> };
export function validateOutputFreshness(outputPath: string, sourcePaths?: string[]): ValidationIssue[];
