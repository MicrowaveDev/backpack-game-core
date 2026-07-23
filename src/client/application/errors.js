const DEFAULT_ERROR_CODE = 'APPLICATION_ERROR';

function finiteStatus(value) {
  return Number.isInteger(value) && value >= 100 && value <= 599 ? value : undefined;
}

export class ApplicationError extends Error {
  constructor(message, options = {}) {
    super(String(message || options.code || DEFAULT_ERROR_CODE), {
      cause: options.cause
    });
    this.name = 'ApplicationError';
    this.code = String(options.code || DEFAULT_ERROR_CODE);
    this.details = options.details;
    this.retriable = options.retriable === true;
    this.status = finiteStatus(options.status);
  }
}

export function isApplicationError(error) {
  return error instanceof ApplicationError;
}

export function normalizeApplicationError(error, fallback = {}) {
  if (isApplicationError(error)) return error;

  const source = error && typeof error === 'object' ? error : {};
  const message = typeof source.message === 'string' && source.message
    ? source.message
    : typeof error === 'string' && error
      ? error
      : fallback.message || 'Application operation failed';

  return new ApplicationError(message, {
    code: source.code || fallback.code || DEFAULT_ERROR_CODE,
    details: source.details ?? fallback.details,
    retriable: source.retriable ?? fallback.retriable,
    status: source.status ?? fallback.status,
    cause: error instanceof Error ? error : fallback.cause
  });
}
