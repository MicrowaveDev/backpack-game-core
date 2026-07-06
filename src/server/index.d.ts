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

export interface AssetGachaSimulationServerModuleOptions {
  name?: string;
  serviceKey?: string;
  requires?: string[];
  provides?: string[];
  providerKeys?: {
    getStaticPack?: string;
    getStaticCatalog?: string;
    getStaticPackOdds?: string;
    getRuntimePack?: string;
    getRuntimeCatalog?: string;
    shapeRuntimePackOdds?: string;
  };
  providers?: Record<string, unknown>;
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

export declare function createAssetGachaSimulationServerModule(
  options?: AssetGachaSimulationServerModuleOptions
): BackpackServerModule;

export interface LoadoutValidationServerModuleOptions {
  name?: string;
  serviceKey?: string;
  requires?: string[];
  provides?: string[];
  providerKeys?: {
    getArtifactId?: string;
    getArtifact?: string;
    getArtifactPrice?: string;
    getArtifactWidth?: string;
    getArtifactHeight?: string;
    getBagShape?: string;
    getArtifactBonus?: string;
    isBag?: string;
    isContainerItem?: string;
    contributesStats?: string;
  };
  providers?: Record<string, unknown>;
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

export declare function createLoadoutValidationServerModule(
  options?: LoadoutValidationServerModuleOptions
): BackpackServerModule;

export interface RunReadinessServerModuleOptions {
  name?: string;
  serviceKey?: string;
  requires?: string[];
  provides?: string[];
  providerKeys?: {
    now?: string;
  };
  providers?: {
    now?: () => number;
    [key: string]: unknown;
  };
  config?: {
    requiredReadyCount?: number;
    [key: string]: unknown;
  };
  now?: () => number;
  requiredReadyCount?: number;
  [key: string]: unknown;
}

export declare function createRunReadinessServerModule(
  options?: RunReadinessServerModuleOptions
): BackpackServerModule;

export interface HostedCommunityClientServerModuleOptions {
  name?: string;
  serviceKey?: string;
  requires?: string[];
  provides?: string[];
  providerKeys?: {
    fetchImpl?: string;
  };
  providers?: {
    fetchImpl?: typeof fetch;
    [key: string]: unknown;
  };
  config?: {
    runtimeMode?: string;
    communityServerUrl?: string;
    endpoints?: Record<string, string>;
    surfaces?: Record<string, unknown>;
    [key: string]: unknown;
  };
  runtimeMode?: string;
  communityServerUrl?: string;
  fetchImpl?: typeof fetch;
  endpoints?: Record<string, string>;
  surfaces?: Record<string, unknown>;
  [key: string]: unknown;
}

export declare function createHostedCommunityClientServerModule(
  options?: HostedCommunityClientServerModuleOptions
): BackpackServerModule;

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
