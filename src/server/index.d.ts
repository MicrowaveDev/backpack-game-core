export interface BackpackServerModuleDefinition {
  name: string;
  requires?: string[];
  provides?: string[];
  configSchema?: unknown;
  configKey?: string;
  config?: Record<string, unknown>;
  allowOverride?: boolean;
  validateConfig?: (config: Record<string, unknown>, ctx: BackpackServerContext) => boolean | void;
  setup?: (ctx: BackpackServerContext) => BackpackServerModuleSetupResult;
}

export interface BackpackServerModule {
  name: string;
  requires: string[];
  provides: string[];
  configSchema: unknown;
  configKey: string;
  config: Record<string, unknown>;
  allowOverride: boolean;
  validateConfig: ((config: Record<string, unknown>, ctx: BackpackServerContext) => boolean | void) | null;
  setup: (ctx: BackpackServerContext) => BackpackServerModuleSetupResult;
}

export interface BackpackServerContext {
  adapters: Record<string, unknown>;
  config: Record<string, unknown>;
  moduleConfigs: Record<string, Record<string, unknown>>;
  services: Record<string, unknown>;
  routes: Record<string, unknown>;
  jobs: unknown[];
  healthChecks: unknown[];
  registry: Map<string, unknown>;
  get(key: string): unknown;
  getConfig(key: string, fallback?: unknown): unknown;
  provide(key: string, value: unknown, options?: { override?: boolean }): unknown;
}

export interface BackpackServerModuleSetupResult {
  services?: Record<string, unknown>;
  routes?: Record<string, unknown>;
  jobs?: unknown[];
  healthChecks?: unknown[];
}

export declare function createBackpackServerModule(definition?: BackpackServerModuleDefinition): BackpackServerModule;
export declare function createBackpackServerContext(options?: {
  adapters?: Record<string, unknown>;
  config?: Record<string, unknown>;
  services?: Record<string, unknown>;
  routes?: Record<string, unknown>;
  jobs?: unknown[];
  healthChecks?: unknown[];
}): BackpackServerContext;
export declare function setupBackpackServerModules(
  modules?: BackpackServerModuleDefinition[],
  baseContext?: BackpackServerContext | Parameters<typeof createBackpackServerContext>[0]
): BackpackServerContext & { installed: string[] };

export {
  createKeyedAsyncMutex,
  createRunReadinessManager
} from './readiness.js';

export {
  clearIdempotencyCache,
  idempotency
} from './middleware/idempotency.js';

export {
  clearRateLimitBuckets,
  rateLimit
} from './middleware/rate-limit.js';
