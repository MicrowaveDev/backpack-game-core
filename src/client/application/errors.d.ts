export interface ApplicationErrorOptions {
  code?: string;
  details?: unknown;
  retriable?: boolean;
  status?: number;
  cause?: unknown;
}

export interface NormalizeApplicationErrorFallback extends ApplicationErrorOptions {
  message?: string;
}

export class ApplicationError extends Error {
  code: string;
  details?: unknown;
  retriable: boolean;
  status?: number;
  constructor(message: string, options?: ApplicationErrorOptions);
}

export function isApplicationError(error: unknown): error is ApplicationError;
export function normalizeApplicationError(
  error: unknown,
  fallback?: NormalizeApplicationErrorFallback
): ApplicationError;
