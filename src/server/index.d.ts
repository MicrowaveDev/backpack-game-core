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

export declare const BOT_ROUTE_NAMES: Readonly<{
  discovery: 'bot.discovery';
  gameScore: 'bot.gameScore';
  start: 'bot.start';
  webhook: 'bot.webhook';
}>;

export type BackpackBotRouteKey = keyof typeof BOT_ROUTE_NAMES;

export declare const WIKI_ROUTE_NAMES: Readonly<{
  home: 'wiki.home';
  entry: 'wiki.entry';
}>;

export type Rng = () => number;

export declare const DEFAULT_CHARACTER_XP_LEVEL_CURVE: readonly number[];
export declare const CHARACTER_XP_LEVEL_CURVE: readonly number[];

export declare function nowIso(): string;
export declare function createId(prefix?: string): string;
export declare function createShortCode(length?: number): string;
export declare function createSessionKey(options?: { prefix?: string; bytes?: number }): string;
export declare function normalizeLanguage(
  value: unknown,
  options?: string | { fallback?: string; supportedLanguages?: readonly string[] }
): string;
export declare function startOfUtcDay(input?: Date | string | number): Date;
export declare function nextUtcReset(input?: Date | string | number): Date;
export declare function dayKey(input?: Date | string | number): string;
export declare function parseJson<T = unknown>(text: unknown, fallback?: T): T;
export declare function hashToSeed(input: unknown): number;
export declare function createRng(seedInput: unknown): Rng;
export declare function clamp(value: number, min: number, max: number): number;
export declare function expectedScore(playerRating: number, opponentRating: number): number;
export declare function kFactor(rating: number, ratedBattles: number, mode?: string): number;
export declare function computeProgressLevel(
  progress: unknown,
  options?: { curve?: readonly number[] }
): { level: number; current: number; next: number | null };
export declare function computeCharacterLevel(
  characterXp: unknown,
  options?: { curve?: readonly number[] }
): { level: number; current: number; next: number | null };
export declare function currencyFields(
  amount: unknown,
  options?: {
    primaryField?: string;
    aliasFields?: readonly string[];
    legacyField?: string | null;
  }
): Record<string, number>;
export declare function runCurrencyFields(
  amount: unknown,
  options?: Parameters<typeof currencyFields>[1]
): Record<string, number>;

export interface StructuredLogger {
  info(payload?: unknown): void;
  warn(payload?: unknown): void;
  error(payload?: unknown): void;
}

export declare const log: StructuredLogger;

export declare function createStructuredLogger(options?: {
  disabled?: boolean;
  now?: () => string;
  writeInfo?: (line: string) => unknown;
  writeError?: (line: string) => unknown;
}): StructuredLogger;

export declare function createRequestLogger(options?: {
  logger?: StructuredLogger;
  createRequestId?: (req?: unknown) => string;
  nowHrtime?: () => bigint;
  routeFromRequest?: (req: any) => string;
  contextFromRequest?: (req: any) => Record<string, unknown>;
}): BackpackRouteHandler;

export declare function requestLogger(options?: Parameters<typeof createRequestLogger>[0]): BackpackRouteHandler;

export interface AuthRouteGroupOptions {
  name?: string;
  prefix?: string;
  routes?: Partial<Record<BackpackAuthRouteKey, BackpackAuthRouteConfig | BackpackRouteHandler | false>>;
  handlers?: Partial<Record<BackpackAuthRouteKey, BackpackRouteHandler>>;
  middleware?: Partial<Record<BackpackAuthRouteKey | 'all' | 'auth' | 'dev' | 'public', BackpackRouteHandler | BackpackRouteHandler[]>>;
  meta?: Record<string, unknown>;
}

export interface BotRouteGroupOptions {
  name?: string;
  prefix?: string;
  routes?: Partial<Record<BackpackBotRouteKey, BackpackAuthRouteConfig | BackpackRouteHandler | false>>;
  handlers?: Partial<Record<BackpackBotRouteKey, BackpackRouteHandler>>;
  middleware?: Partial<Record<BackpackBotRouteKey | 'all' | 'auth' | 'public' | 'webhook', BackpackRouteHandler | BackpackRouteHandler[]>>;
  meta?: Record<string, unknown>;
}

export interface WikiEntryRouteConfig extends Partial<BackpackRouteDescriptorInput> {
  section?: string;
  handler: BackpackRouteHandler;
}

export interface WikiRouteGroupOptions {
  name?: string;
  prefix?: string;
  home?: BackpackRouteHandler | (Partial<BackpackRouteDescriptorInput> & { handler: BackpackRouteHandler });
  entries?: WikiEntryRouteConfig[];
  middleware?: BackpackRouteHandler | BackpackRouteHandler[];
  meta?: Record<string, unknown>;
}

export interface GhostLoadoutServiceOptions {
  artifacts?: unknown[] | (() => unknown[]);
  characters?: unknown[] | (() => unknown[]);
  getArtifactById?: (artifactId: string) => unknown;
  getArtifactPrice?: (artifact: unknown) => number;
  getCharacterById?: (characterId: string) => unknown;
  getStarterPreset?: (characterId: string) => unknown[];
  getStarterPresetCost?: (characterId: string) => number;
  gridColumns?: number;
  gridRows?: number;
  defaultBudget?: number;
  starterBagId?: string;
  starterBagPlacement?: Record<string, unknown>;
  attempts?: number;
  createRng?: (seedInput: string) => () => number;
  isBag?: (artifact: unknown) => boolean;
  getBagShape?: (artifact: unknown, rotation?: unknown) => unknown;
  validateLoadout?: (placements: unknown[], ceiling?: number) => unknown;
  weightForItem?: (character: unknown, artifact: unknown) => number;
  imagePathForCharacter?: (characterId: string, context?: Record<string, unknown>) => string | null;
  defaultPortraitId?: string;
  defaultActivePortrait?: string;
  failureMessage?: string;
}

export interface GhostLoadoutService {
  createBotLoadout(character: unknown, rng: () => number, budget?: number): unknown;
  createBotGhostSnapshot(seedInput: string, characterId?: string | null, budget?: number): Record<string, unknown>;
}

export declare function createGhostLoadoutService(options?: GhostLoadoutServiceOptions): GhostLoadoutService;

export interface ServerLoadoutUtilsOptions {
  gridWidth?: number;
  gridHeight?: number;
  defaultCoinBudget?: number;
  maxStunChance?: number;
  getArtifact?: (artifactId: string) => unknown;
  getArtifactPrice?: (artifact: unknown) => number;
  isBag?: (artifact: unknown) => boolean;
  isContainerItem?: (item: unknown) => boolean;
  contributesStats?: (artifact: unknown, item?: unknown) => boolean;
  statClamps?: Record<string, unknown>;
}

export declare function createServerLoadoutUtils(options?: ServerLoadoutUtilsOptions): Record<string, unknown>;

export interface ServerGachaSimulationServiceOptions {
  defaultPlanAssetVisibility?: string;
  [key: string]: unknown;
}

export declare function createServerGachaSimulationService(options?: ServerGachaSimulationServiceOptions): {
  simulateAssetPackOdds(packId: string, options?: Record<string, unknown>): unknown;
  simulateRuntimeAssetPackOdds(packId: string, options?: Record<string, unknown>): Promise<unknown>;
};

export declare function createReadyManagerExports(options?: {
  now?: () => number;
  requiredReadyCount?: number;
}): Record<string, unknown>;

export interface MutationClaim {
  scope: string;
  claimKey: string;
  claimToken: string;
  acquiredAt: string;
  reclaimed: boolean;
}

export interface MutationClaimServiceOptions {
  query: (sql: string, params?: unknown[]) => Promise<{ rows?: unknown[]; rowCount?: number }>;
  createId: (prefix: string) => string;
  nowIso: () => string;
  nowMs?: () => number;
  sleep?: (ms: number) => Promise<unknown>;
  httpError?: (message: string, statusCode?: number) => Error;
  claimTtlMs?: number | (() => number);
  waitTimeoutMs?: number | (() => number);
  waitIntervalMs?: number | (() => number);
}

export interface MutationClaimService {
  acquireMutationClaim(scope: string, claimKey: string): Promise<MutationClaim>;
  releaseMutationClaim(claim?: Partial<MutationClaim> | null): Promise<void>;
  withMutationClaim<T>(scope: string, claimKey: string, work: (claim: MutationClaim) => T | Promise<T>): Promise<T>;
}

export declare function createMutationClaimService(options?: MutationClaimServiceOptions): MutationClaimService;

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
export declare function createBotRouteGroup(options?: BotRouteGroupOptions): BackpackRouteGroup;
export declare function createWikiRouteGroup(options?: WikiRouteGroupOptions): BackpackRouteGroup;

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
