export interface RuntimeConfigValidationResult {
  ok: boolean;
  issues: string[];
  summary: Record<string, unknown>;
}

export function shapeRuntimeConfigValidationResult(options?: {
  issues?: unknown[];
  config?: Record<string, unknown>;
  summaryFields?: Array<
    string | {
      key?: string;
      label?: string;
      value?: unknown;
      format?: (value: unknown, config?: Record<string, unknown>) => unknown;
    }
  >;
}): RuntimeConfigValidationResult;

export function formatRuntimeConfigValidationLines(
  validation?: Partial<RuntimeConfigValidationResult>,
  options?: {
    readyMessage?: string;
    notReadyMessage?: string;
    includeSummary?: boolean;
  }
): string[];

export function assertRuntimeConfigValidation(
  validation?: Partial<RuntimeConfigValidationResult>,
  options?: {
    message?: string;
  }
): Partial<RuntimeConfigValidationResult>;
