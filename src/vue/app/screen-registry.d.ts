import type { ScreenDefinition } from '../../client/application/adapter.js';

export interface ScreenResolution {
  screen?: ScreenDefinition;
  allowed: boolean;
  redirect?: string;
}

export interface ScreenRegistry {
  readonly capabilities: Readonly<Record<string, boolean>>;
  readonly ids: readonly string[];
  has(id: string): boolean;
  get(id: string): ScreenDefinition | undefined;
  getRequired(id: string): ScreenDefinition;
  resolve(id: string, context?: Record<string, unknown>): ScreenResolution;
  list(options?: {
    includeDisabled?: boolean;
    context?: Record<string, unknown>;
  }): ScreenDefinition[];
  first(context?: Record<string, unknown>): ScreenDefinition | undefined;
}

export function createScreenRegistry(
  definitions?: readonly ScreenDefinition[],
  options?: { capabilities?: Record<string, boolean> }
): ScreenRegistry;
