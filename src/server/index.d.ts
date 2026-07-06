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

export type BackpackRouteMethod =
  | 'all'
  | 'delete'
  | 'get'
  | 'head'
  | 'options'
  | 'patch'
  | 'post'
  | 'put';

export type BackpackRouteHandler = (...args: unknown[]) => unknown;

export interface BackpackRouteDescriptorInput {
  name: string;
  method?: BackpackRouteMethod | string;
  path: string;
  handler?: BackpackRouteHandler;
  handlers?: BackpackRouteHandler[];
  middleware?: BackpackRouteHandler[];
  meta?: Record<string, unknown>;
}

export interface BackpackRouteDescriptor {
  name: string;
  method: BackpackRouteMethod;
  path: string;
  handlers: BackpackRouteHandler[];
  meta: Record<string, unknown>;
}

export interface BackpackRouteGroupInput {
  name: string;
  prefix?: string;
  routes?: BackpackRouteDescriptorInput[];
  meta?: Record<string, unknown>;
}

export interface BackpackRouteGroup {
  name: string;
  prefix: string;
  routes: BackpackRouteDescriptor[];
  meta: Record<string, unknown>;
}

export declare const AUTH_ROUTE_NAMES: Readonly<{
  bootstrap: 'auth.bootstrap';
  devLogin: 'auth.devLogin';
  logout: 'auth.logout';
  providerCode: 'auth.providerCode';
  providerLogin: 'auth.providerLogin';
  providerVerifyCode: 'auth.providerVerifyCode';
  webLogin: 'auth.webLogin';
}>;

export type BackpackAuthRouteKey = keyof typeof AUTH_ROUTE_NAMES;

export interface BackpackAuthRouteConfig extends Partial<BackpackRouteDescriptorInput> {
  enabled?: boolean;
}

export interface AuthRouteGroupOptions {
  name?: string;
  prefix?: string;
  routes?: Partial<Record<BackpackAuthRouteKey, BackpackAuthRouteConfig | BackpackRouteHandler | false>>;
  handlers?: Partial<Record<BackpackAuthRouteKey, BackpackRouteHandler>>;
  middleware?: Partial<Record<BackpackAuthRouteKey | 'all' | 'auth' | 'dev' | 'public', BackpackRouteHandler | BackpackRouteHandler[]>>;
  meta?: Record<string, unknown>;
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
export declare function createBackpackRouteDescriptor(route?: BackpackRouteDescriptorInput): BackpackRouteDescriptor;
export declare function createBackpackRouteGroup(group?: BackpackRouteGroupInput): BackpackRouteGroup;
export declare function flattenBackpackRouteDescriptors(
  routes?: unknown,
  options?: { prefix?: string }
): BackpackRouteDescriptor[];
export declare function bindBackpackRouteDescriptors(
  target: unknown,
  routes?: unknown,
  options?: {
    prefix?: string;
    mountRoute?: (target: unknown, route: BackpackRouteDescriptor) => unknown;
  }
): BackpackRouteDescriptor[];
export declare function createAuthRouteGroup(options?: AuthRouteGroupOptions): BackpackRouteGroup;

export interface AuthRoutesServerModuleOptions extends AuthRouteGroupOptions {
  name?: string;
  routeKey?: string;
  requires?: string[];
  provides?: string[];
  providerKeys?: {
    handlers?: Partial<Record<BackpackAuthRouteKey, string>>;
    middleware?: Partial<Record<BackpackAuthRouteKey | 'all' | 'auth' | 'dev' | 'public', string>>;
  };
  providers?: {
    handlers?: Partial<Record<BackpackAuthRouteKey, BackpackRouteHandler>>;
    middleware?: Partial<Record<BackpackAuthRouteKey | 'all' | 'auth' | 'dev' | 'public', BackpackRouteHandler | BackpackRouteHandler[]>>;
  };
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

export declare function createAuthRoutesServerModule(
  options?: AuthRoutesServerModuleOptions
): BackpackServerModule;

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

export interface SocialPreviewCacheServerModuleOptions {
  name?: string;
  serviceKey?: string;
  requires?: string[];
  provides?: string[];
  providerKeys?: {
    renderPreview?: string;
    ensureOutputDirectory?: string;
    copyFallback?: string;
    logger?: string;
    relativePath?: string;
  };
  providers?: Record<string, unknown>;
  config?: {
    renderOptions?: Record<string, unknown>;
    outputPath?: string | null;
    logKind?: string;
    registerJob?: boolean;
    jobName?: string;
    [key: string]: unknown;
  };
  renderPreview?: (options: Record<string, unknown>) => unknown | Promise<unknown>;
  ensureOutputDirectory?: (input: Record<string, unknown>) => unknown | Promise<unknown>;
  copyFallback?: (input: Record<string, unknown>) => boolean | unknown | Promise<boolean | unknown>;
  logger?: Record<string, unknown> | null;
  relativePath?: ((outputPath: string) => string) | null;
  registerJob?: boolean;
  jobName?: string;
  [key: string]: unknown;
}

export declare function createSocialPreviewCacheServerModule(
  options?: SocialPreviewCacheServerModuleOptions
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
