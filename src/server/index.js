import { createAssetGachaSimulationService } from '../modules/gacha/simulation-service.js';
import { createHostedCommunityClient } from '../modules/community/client.js';
import { createSocialPreviewCacheService } from '../modules/social-preview/index.js';
import {
  createLoadoutValidationService,
  LOADOUT_VALIDATION_PROVIDER_NAMES
} from '../modules/loadout/validation-service.js';
import { createRunReadinessManager } from './readiness.js';
export { createGhostLoadoutService } from './modules/bot-loadout.js';
export { createServerGachaSimulationService } from './modules/gacha-simulation-service.js';
export { createServerLoadoutUtils } from './modules/loadout-utils.js';
export {
  CHARACTER_XP_LEVEL_CURVE,
  DEFAULT_CHARACTER_XP_LEVEL_CURVE,
  clamp,
  computeCharacterLevel,
  computeProgressLevel,
  createId,
  createRng,
  createSessionKey,
  createShortCode,
  currencyFields,
  dayKey,
  expectedScore,
  hashToSeed,
  kFactor,
  nextUtcReset,
  normalizeLanguage,
  nowIso,
  parseJson,
  runCurrencyFields,
  startOfUtcDay
} from './modules/utils.js';
export {
  createRequestLogger,
  createStructuredLogger,
  log,
  requestLogger
} from './modules/observability.js';
export { createReadyManagerExports } from './modules/ready-manager.js';
export { createMutationClaimService } from './modules/mutation-claim.js';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

const ROUTE_METHODS = new Set([
  'all',
  'delete',
  'get',
  'head',
  'options',
  'patch',
  'post',
  'put'
]);

export const AUTH_ROUTE_NAMES = Object.freeze({
  bootstrap: 'auth.bootstrap',
  devLogin: 'auth.devLogin',
  logout: 'auth.logout',
  providerCode: 'auth.providerCode',
  providerLogin: 'auth.providerLogin',
  providerVerifyCode: 'auth.providerVerifyCode',
  webLogin: 'auth.webLogin'
});

const AUTH_ROUTE_DEFINITIONS = Object.freeze({
  bootstrap: Object.freeze({
    name: AUTH_ROUTE_NAMES.bootstrap,
    method: 'get',
    path: '/bootstrap',
    access: 'auth'
  }),
  devLogin: Object.freeze({
    name: AUTH_ROUTE_NAMES.devLogin,
    method: 'post',
    path: '/auth/dev-login',
    access: 'dev'
  }),
  logout: Object.freeze({
    name: AUTH_ROUTE_NAMES.logout,
    method: 'post',
    path: '/auth/logout',
    access: 'auth'
  }),
  providerCode: Object.freeze({
    name: AUTH_ROUTE_NAMES.providerCode,
    method: 'post',
    path: '/auth/provider/code',
    access: 'public'
  }),
  providerLogin: Object.freeze({
    name: AUTH_ROUTE_NAMES.providerLogin,
    method: 'post',
    path: '/auth/provider-login',
    access: 'public'
  }),
  providerVerifyCode: Object.freeze({
    name: AUTH_ROUTE_NAMES.providerVerifyCode,
    method: 'post',
    path: '/auth/provider/verify-code',
    access: 'public'
  }),
  webLogin: Object.freeze({
    name: AUTH_ROUTE_NAMES.webLogin,
    method: 'post',
    path: '/auth/web-login',
    access: 'public'
  })
});

export const BOT_ROUTE_NAMES = Object.freeze({
  discovery: 'bot.discovery',
  gameScore: 'bot.gameScore',
  start: 'bot.start',
  webhook: 'bot.webhook'
});

const BOT_ROUTE_DEFINITIONS = Object.freeze({
  discovery: Object.freeze({ name: BOT_ROUTE_NAMES.discovery, method: 'get', path: '/bot/discovery', access: 'public' }),
  start: Object.freeze({ name: BOT_ROUTE_NAMES.start, method: 'post', path: '/bot/start', access: 'public' }),
  webhook: Object.freeze({ name: BOT_ROUTE_NAMES.webhook, method: 'post', path: '/bot/webhook', access: 'webhook' }),
  gameScore: Object.freeze({ name: BOT_ROUTE_NAMES.gameScore, method: 'post', path: '/bot/game-score', access: 'auth' })
});

export const WIKI_ROUTE_NAMES = Object.freeze({
  home: 'wiki.home',
  entry: 'wiki.entry'
});

export const PROFILE_ROUTE_NAMES = Object.freeze({
  activeCharacter: 'profile.activeCharacter',
  profile: 'profile.get',
  settings: 'profile.settings'
});

const PROFILE_ROUTE_DEFINITIONS = Object.freeze({
  profile: Object.freeze({ name: PROFILE_ROUTE_NAMES.profile, method: 'get', path: '/profile', access: 'auth' }),
  activeCharacter: Object.freeze({ name: PROFILE_ROUTE_NAMES.activeCharacter, method: 'put', path: '/active-character', access: 'auth' }),
  settings: Object.freeze({ name: PROFILE_ROUTE_NAMES.settings, method: 'post', path: '/settings', access: 'auth' })
});

export const WALLET_ROUTE_NAMES = Object.freeze({
  bundles: 'wallet.bundles',
  purchaseIntent: 'wallet.purchaseIntent',
  state: 'wallet.state',
  webhook: 'wallet.webhook'
});

const WALLET_ROUTE_DEFINITIONS = Object.freeze({
  state: Object.freeze({ name: WALLET_ROUTE_NAMES.state, method: 'get', path: '/wallet', access: 'auth' }),
  bundles: Object.freeze({ name: WALLET_ROUTE_NAMES.bundles, method: 'get', path: '/wallet/bundles', access: 'auth' }),
  purchaseIntent: Object.freeze({ name: WALLET_ROUTE_NAMES.purchaseIntent, method: 'post', path: '/wallet/purchase-intents', access: 'auth' }),
  webhook: Object.freeze({ name: WALLET_ROUTE_NAMES.webhook, method: 'post', path: '/wallet/purchase-webhook/:provider', access: 'webhook' })
});

export const ASSET_ROUTE_NAMES = Object.freeze({
  burn: 'assets.burn',
  catalog: 'assets.catalog',
  equip: 'assets.equip',
  odds: 'assets.odds',
  purchase: 'assets.purchase',
  roll: 'assets.roll'
});

const ASSET_ROUTE_DEFINITIONS = Object.freeze({
  catalog: Object.freeze({ name: ASSET_ROUTE_NAMES.catalog, method: 'get', path: '/assets/catalog', access: 'auth' }),
  odds: Object.freeze({ name: ASSET_ROUTE_NAMES.odds, method: 'get', path: '/assets/packs/:packId/odds', access: 'auth' }),
  roll: Object.freeze({ name: ASSET_ROUTE_NAMES.roll, method: 'post', path: '/assets/packs/:packId/roll', access: 'mutation' }),
  burn: Object.freeze({ name: ASSET_ROUTE_NAMES.burn, method: 'post', path: '/assets/packs/:packId/burn', access: 'mutation' }),
  purchase: Object.freeze({ name: ASSET_ROUTE_NAMES.purchase, method: 'post', path: '/assets/:assetId/purchase', access: 'purchase' }),
  equip: Object.freeze({ name: ASSET_ROUTE_NAMES.equip, method: 'post', path: '/assets/:assetId/equip', access: 'profileMutation' })
});

function uniqueStrings(values, label) {
  const seen = new Set();
  const normalized = [];
  for (const value of asArray(values)) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`Backpack server module ${label} entries must be non-empty strings`);
    }
    if (seen.has(value)) {
      throw new Error(`Backpack server module ${label} contains duplicate entry ${value}`);
    }
    seen.add(value);
    normalized.push(value);
  }
  return normalized;
}

function moduleConfigFromContext(module, context) {
  const moduleConfigs = context.config?.modules || {};
  return {
    ...module.config,
    ...(moduleConfigs[module.configKey] || moduleConfigs[module.name] || {})
  };
}

function normalizeRouteMethod(method = 'get') {
  const normalized = String(method || 'get').trim().toLowerCase();
  if (!ROUTE_METHODS.has(normalized)) {
    throw new Error(`Backpack route method is not supported: ${method}`);
  }
  return normalized;
}

function normalizePathPart(value, { allowEmpty = false } = {}) {
  const text = String(value || '').trim();
  if (!text) {
    if (allowEmpty) return '';
    throw new Error('Backpack route path is required');
  }
  return text.startsWith('/') ? text : `/${text}`;
}

function joinRoutePaths(prefix = '', path = '') {
  const normalizedPrefix = normalizePathPart(prefix, { allowEmpty: true }).replace(/\/+$/, '');
  const normalizedPath = normalizePathPart(path).replace(/^\/+/, '');
  return `${normalizedPrefix}/${normalizedPath}`.replace(/\/+/g, '/') || '/';
}

function normalizeRouteHandlers(route = {}) {
  const handlers = [
    ...asArray(route.middleware),
    ...asArray(route.handlers),
    ...(route.handler ? [route.handler] : [])
  ];
  if (!handlers.length) {
    throw new Error(`Backpack route ${route.name || route.path || ''} requires at least one handler`);
  }
  for (const handler of handlers) {
    if (typeof handler !== 'function') {
      throw new Error(`Backpack route ${route.name || route.path || ''} handlers must be functions`);
    }
  }
  return handlers;
}

export function createBackpackRouteDescriptor(route = {}) {
  const name = String(route.name || '').trim();
  if (!name) throw new Error('Backpack route descriptor requires a name');
  return {
    name,
    method: normalizeRouteMethod(route.method),
    path: normalizePathPart(route.path),
    handlers: normalizeRouteHandlers(route),
    meta: {
      ...(route.meta || {})
    }
  };
}

export function createBackpackRouteGroup(group = {}) {
  const name = String(group.name || '').trim();
  if (!name) throw new Error('Backpack route group requires a name');
  return {
    name,
    prefix: normalizePathPart(group.prefix || '', { allowEmpty: true }),
    routes: asArray(group.routes).map(createBackpackRouteDescriptor),
    meta: {
      ...(group.meta || {})
    }
  };
}

function isRouteDescriptor(value) {
  return Boolean(value && typeof value === 'object' && value.method && value.path && value.handlers);
}

function isRouteGroup(value) {
  return Boolean(value && typeof value === 'object' && Array.isArray(value.routes));
}

function routeInputsFrom(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (value.routes && !value.method) return [value];
  if (value.routes || value.method || value.path) return [value];
  if (typeof value === 'object') return Object.values(value);
  return [];
}

export function flattenBackpackRouteDescriptors(routes = [], { prefix = '' } = {}) {
  return routeInputsFrom(routes).flatMap((entry) => {
    if (isRouteGroup(entry)) {
      const group = createBackpackRouteGroup(entry);
      const nextPrefix = joinRoutePaths(prefix, group.prefix || '/');
      return group.routes.map((route) => ({
        ...route,
        path: joinRoutePaths(nextPrefix, route.path),
        meta: {
          ...group.meta,
          ...route.meta,
          groupName: route.meta.groupName || group.name
        }
      }));
    }
    if (isRouteDescriptor(entry) || entry?.method || entry?.path) {
      const route = createBackpackRouteDescriptor(entry);
      return [{
        ...route,
        path: joinRoutePaths(prefix, route.path)
      }];
    }
    return flattenBackpackRouteDescriptors(entry, { prefix });
  });
}

export function bindBackpackRouteDescriptors(target, routes = [], {
  prefix = '',
  mountRoute
} = {}) {
  if (!target) throw new Error('Backpack route binding requires a target');
  const descriptors = flattenBackpackRouteDescriptors(routes, { prefix });
  for (const descriptor of descriptors) {
    if (mountRoute) {
      mountRoute(target, descriptor);
      continue;
    }
    const mount = target[descriptor.method];
    if (typeof mount !== 'function') {
      throw new Error(`Backpack route target cannot mount method ${descriptor.method}`);
    }
    mount.call(target, descriptor.path, ...descriptor.handlers);
  }
  return descriptors;
}

function routeConfigFor(key, routes) {
  const value = routes?.[key];
  if (value === false) return { disabled: true };
  if (typeof value === 'function') return { handler: value };
  return value && typeof value === 'object' ? value : {};
}

function asHandlerArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function configuredRouteHandlers({ key, definition, routeConfig, handlers, middleware }) {
  const explicitHandlers = [
    ...asHandlerArray(routeConfig.handlers),
    ...(routeConfig.handler ? [routeConfig.handler] : []),
    ...(handlers?.[key] ? [handlers[key]] : [])
  ];
  if (!explicitHandlers.length) return [];
  const routeMiddleware = key === definition.access ? [] : asHandlerArray(middleware?.[key]);
  return [
    ...asHandlerArray(middleware?.all),
    ...asHandlerArray(middleware?.[definition.access]),
    ...routeMiddleware,
    ...asHandlerArray(routeConfig.middleware),
    ...explicitHandlers
  ];
}

function createDefinedRouteGroup({
  name,
  prefix,
  feature,
  definitions,
  routes,
  handlers,
  middleware,
  meta
}) {
  const descriptors = Object.entries(definitions).flatMap(([key, definition]) => {
    const routeConfig = routeConfigFor(key, routes);
    if (routeConfig.disabled || routeConfig.enabled === false) return [];
    const routeHandlers = configuredRouteHandlers({ key, definition, routeConfig, handlers, middleware });
    if (!routeHandlers.length) return [];
    return [createBackpackRouteDescriptor({
      name: routeConfig.name || definition.name,
      method: routeConfig.method || definition.method,
      path: routeConfig.path || definition.path,
      handlers: routeHandlers,
      meta: {
        feature,
        access: definition.access,
        routeKey: key,
        ...(routeConfig.meta || {})
      }
    })];
  });
  return createBackpackRouteGroup({
    name,
    prefix,
    routes: descriptors,
    meta: { feature, ...meta }
  });
}

export function createAuthRouteGroup({
  name = 'authRoutes',
  prefix = '/api',
  routes = {},
  handlers = {},
  middleware = {},
  meta = {}
} = {}) {
  const descriptors = Object.entries(AUTH_ROUTE_DEFINITIONS).flatMap(([key, definition]) => {
    const routeConfig = routeConfigFor(key, routes);
    if (routeConfig.disabled || routeConfig.enabled === false) return [];
    const routeHandlers = configuredRouteHandlers({ key, definition, routeConfig, handlers, middleware });
    if (!routeHandlers.length) return [];
    return [createBackpackRouteDescriptor({
      name: routeConfig.name || definition.name,
      method: routeConfig.method || definition.method,
      path: routeConfig.path || definition.path,
      handlers: routeHandlers,
      meta: {
        feature: 'auth',
        access: definition.access,
        routeKey: key,
        ...(routeConfig.meta || {})
      }
    })];
  });
  return createBackpackRouteGroup({
    name,
    prefix,
    routes: descriptors,
    meta: {
      feature: 'auth',
      ...meta
    }
  });
}

export function createBotRouteGroup({
  name = 'botRoutes',
  prefix = '/api',
  routes = {},
  handlers = {},
  middleware = {},
  meta = {}
} = {}) {
  const descriptors = Object.entries(BOT_ROUTE_DEFINITIONS).flatMap(([key, definition]) => {
    const routeConfig = routeConfigFor(key, routes);
    if (routeConfig.disabled || routeConfig.enabled === false) return [];
    const routeHandlers = configuredRouteHandlers({ key, definition, routeConfig, handlers, middleware });
    if (!routeHandlers.length) return [];
    return [createBackpackRouteDescriptor({
      name: routeConfig.name || definition.name,
      method: routeConfig.method || definition.method,
      path: routeConfig.path || definition.path,
      handlers: routeHandlers,
      meta: {
        feature: 'bot',
        access: definition.access,
        routeKey: key,
        ...(routeConfig.meta || {})
      }
    })];
  });
  return createBackpackRouteGroup({
    name,
    prefix,
    routes: descriptors,
    meta: { feature: 'bot', ...meta }
  });
}

export function createProfileRouteGroup(options = {}) {
  return createDefinedRouteGroup({
    name: options.name || 'profileRoutes',
    prefix: options.prefix || '/api',
    feature: 'profile',
    definitions: PROFILE_ROUTE_DEFINITIONS,
    routes: options.routes || {},
    handlers: options.handlers || {},
    middleware: options.middleware || {},
    meta: options.meta || {}
  });
}

export function createWalletRouteGroup(options = {}) {
  return createDefinedRouteGroup({
    name: options.name || 'walletRoutes',
    prefix: options.prefix || '/api',
    feature: 'wallet',
    definitions: WALLET_ROUTE_DEFINITIONS,
    routes: options.routes || {},
    handlers: options.handlers || {},
    middleware: options.middleware || {},
    meta: options.meta || {}
  });
}

export function createAssetRouteGroup(options = {}) {
  return createDefinedRouteGroup({
    name: options.name || 'assetRoutes',
    prefix: options.prefix || '/api',
    feature: 'assets',
    definitions: ASSET_ROUTE_DEFINITIONS,
    routes: options.routes || {},
    handlers: options.handlers || {},
    middleware: options.middleware || {},
    meta: options.meta || {}
  });
}

export function createWikiRouteGroup({
  name = 'wikiRoutes',
  prefix = '/api/wiki',
  home,
  entries = [],
  middleware = [],
  meta = {}
} = {}) {
  const commonMiddleware = asHandlerArray(middleware);
  const descriptors = [];
  if (home) {
    const homeConfig = typeof home === 'function' ? { handler: home } : home;
    descriptors.push(createBackpackRouteDescriptor({
      name: homeConfig.name || WIKI_ROUTE_NAMES.home,
      method: homeConfig.method || 'get',
      path: homeConfig.path || '/home',
      handlers: [...commonMiddleware, ...asHandlerArray(homeConfig.middleware), homeConfig.handler],
      meta: { feature: 'wiki', routeKey: 'home', ...(homeConfig.meta || {}) }
    }));
  }
  for (const entry of asArray(entries)) {
    if (!entry?.handler) throw new Error('Wiki entry route requires a handler');
    descriptors.push(createBackpackRouteDescriptor({
      name: entry.name || `${WIKI_ROUTE_NAMES.entry}.${entry.section || 'default'}`,
      method: entry.method || 'get',
      path: entry.path || `/${entry.section}/:slug`,
      handlers: [...commonMiddleware, ...asHandlerArray(entry.middleware), entry.handler],
      meta: {
        feature: 'wiki',
        routeKey: 'entry',
        section: entry.section || null,
        ...(entry.meta || {})
      }
    }));
  }
  return createBackpackRouteGroup({
    name,
    prefix,
    routes: descriptors,
    meta: { feature: 'wiki', ...meta }
  });
}

export function createBackpackServerModule(definition = {}) {
  if (!definition.name) throw new Error('Backpack server module requires a name');
  if (typeof definition.name !== 'string') throw new Error('Backpack server module name must be a string');
  return {
    name: definition.name,
    requires: uniqueStrings(definition.requires, 'requires'),
    provides: uniqueStrings(definition.provides, 'provides'),
    configSchema: definition.configSchema || null,
    configKey: definition.configKey || definition.name,
    config: definition.config || {},
    allowOverride: definition.allowOverride === true,
    validateConfig: typeof definition.validateConfig === 'function' ? definition.validateConfig : null,
    setup: typeof definition.setup === 'function' ? definition.setup : () => ({})
  };
}

export function createBackpackServerContext({
  adapters = {},
  config = {},
  services = {},
  routes = {},
  jobs = [],
  healthChecks = []
} = {}) {
  const registry = new Map();
  for (const [key, value] of Object.entries(adapters)) registry.set(`adapter.${key}`, value);
  for (const [key, value] of Object.entries(services)) registry.set(key, value);
  return {
    adapters,
    config,
    moduleConfigs: {},
    services: { ...services },
    routes: { ...routes },
    jobs: [...jobs],
    healthChecks: [...healthChecks],
    registry,
    get(key) {
      return registry.get(key);
    },
    getConfig(key, fallback = undefined) {
      return this.moduleConfigs[key] ?? this.config?.modules?.[key] ?? fallback;
    },
    provide(key, value, { override = false } = {}) {
      if (!override && registry.has(key)) {
        throw new Error(`Backpack server context already provides ${key}`);
      }
      registry.set(key, value);
      return value;
    }
  };
}

function providerFromContext(ctx, providers, providerKeys, name) {
  return providers?.[name] || (providerKeys?.[name] ? ctx.get(providerKeys[name]) : null);
}

function providerOptionsFromContext(ctx, providers, providerKeys, names) {
  return Object.fromEntries(
    names
      .map((providerName) => [
        providerName,
        providerFromContext(ctx, providers, providerKeys, providerName)
      ])
      .filter(([, provider]) => provider)
  );
}

function providerMapFromContext(ctx, providers = {}, providerKeys = {}, mapName) {
  return Object.fromEntries(Object.entries(providerKeys?.[mapName] || {}).map(([key, providerKey]) => [
    key,
    providers?.[mapName]?.[key] || ctx.get(providerKey)
  ]).filter(([, provider]) => provider));
}

export function createAuthRoutesServerModule({
  name = 'core.authRoutes',
  routeKey = 'authRoutes',
  requires = [],
  provides = [routeKey],
  providerKeys = {},
  providers = {},
  config = {},
  ...routeOptions
} = {}) {
  const requiredProviderKeys = [
    ...Object.values(providerKeys.handlers || {}),
    ...Object.values(providerKeys.middleware || {})
  ].filter((key) => key);
  return createBackpackServerModule({
    name,
    requires: [...requires, ...requiredProviderKeys],
    provides,
    config,
    setup(ctx) {
      const moduleConfig = ctx.getConfig(name, {});
      const routeGroup = createAuthRouteGroup({
        ...routeOptions,
        ...moduleConfig,
        handlers: {
          ...(routeOptions.handlers || {}),
          ...(moduleConfig.handlers || {}),
          ...(providers.handlers || {}),
          ...providerMapFromContext(ctx, providers, providerKeys, 'handlers')
        },
        middleware: {
          ...(routeOptions.middleware || {}),
          ...(moduleConfig.middleware || {}),
          ...(providers.middleware || {}),
          ...providerMapFromContext(ctx, providers, providerKeys, 'middleware')
        },
        routes: {
          ...(routeOptions.routes || {}),
          ...(moduleConfig.routes || {})
        }
      });
      return {
        routes: {
          [routeKey]: routeGroup
        }
      };
    }
  });
}

export function createAssetGachaSimulationServerModule({
  name = 'core.gachaSimulation',
  serviceKey = 'assetGachaSimulationService',
  requires = [],
  provides = [serviceKey],
  providerKeys = {},
  providers = {},
  config = {},
  ...serviceOptions
} = {}) {
  const requiredProviderKeys = Object.entries(providerKeys)
    .filter(([providerName, key]) => key && !providers?.[providerName])
    .map(([, key]) => key);
  return createBackpackServerModule({
    name,
    requires: [...requires, ...requiredProviderKeys],
    provides,
    config,
    setup(ctx) {
      const moduleConfig = ctx.getConfig(name, {});
      const service = createAssetGachaSimulationService({
        ...serviceOptions,
        getStaticPack: providerFromContext(ctx, providers, providerKeys, 'getStaticPack'),
        getStaticCatalog: providerFromContext(ctx, providers, providerKeys, 'getStaticCatalog'),
        getStaticPackOdds: providerFromContext(ctx, providers, providerKeys, 'getStaticPackOdds'),
        getRuntimePack: providerFromContext(ctx, providers, providerKeys, 'getRuntimePack'),
        getRuntimeCatalog: providerFromContext(ctx, providers, providerKeys, 'getRuntimeCatalog'),
        shapeRuntimePackOdds: providerFromContext(ctx, providers, providerKeys, 'shapeRuntimePackOdds'),
        maxTrials: moduleConfig.maxTrials ?? serviceOptions.maxTrials
      });
      return {
        services: {
          [serviceKey]: service
        }
      };
    }
  });
}

export function createLoadoutValidationServerModule({
  name = 'core.loadoutValidation',
  serviceKey = 'loadoutValidationService',
  requires = [],
  provides = [serviceKey],
  providerKeys = {},
  providers = {},
  config = {},
  ...serviceOptions
} = {}) {
  const requiredProviderKeys = Object.entries(providerKeys)
    .filter(([providerName, key]) => key && !providers?.[providerName] && !serviceOptions?.[providerName])
    .map(([, key]) => key);
  return createBackpackServerModule({
    name,
    requires: [...requires, ...requiredProviderKeys],
    provides,
    config,
    setup(ctx) {
      const moduleConfig = ctx.getConfig(name, {});
      const service = createLoadoutValidationService({
        ...serviceOptions,
        ...moduleConfig,
        ...providerOptionsFromContext(ctx, providers, providerKeys, LOADOUT_VALIDATION_PROVIDER_NAMES)
      });
      return {
        services: {
          [serviceKey]: service
        }
      };
    }
  });
}

export function createRunReadinessServerModule({
  name = 'core.runReadiness',
  serviceKey = 'runReadinessManager',
  requires = [],
  provides = [serviceKey],
  providerKeys = {},
  providers = {},
  config = {},
  ...serviceOptions
} = {}) {
  const requiredProviderKeys = Object.entries(providerKeys)
    .filter(([providerName, key]) => key && !providers?.[providerName] && !serviceOptions?.[providerName])
    .map(([, key]) => key);
  return createBackpackServerModule({
    name,
    requires: [...requires, ...requiredProviderKeys],
    provides,
    config,
    setup(ctx) {
      const moduleConfig = ctx.getConfig(name, {});
      const now = providerFromContext(ctx, providers, providerKeys, 'now') || serviceOptions.now;
      const service = createRunReadinessManager({
        ...serviceOptions,
        ...moduleConfig,
        ...(now ? { now } : {})
      });
      return {
        services: {
          [serviceKey]: service
        }
      };
    }
  });
}

export function createHostedCommunityClientServerModule({
  name = 'core.hostedCommunity',
  serviceKey = 'communityClient',
  requires = [],
  provides = [serviceKey],
  providerKeys = {},
  providers = {},
  config = {},
  ...clientOptions
} = {}) {
  const fetchKey = providerKeys.fetchImpl;
  return createBackpackServerModule({
    name,
    requires: fetchKey && !providers?.fetchImpl && !clientOptions?.fetchImpl
      ? [...requires, fetchKey]
      : requires,
    provides,
    config,
    setup(ctx) {
      const moduleConfig = ctx.getConfig(name, {});
      const fetchImpl = providerFromContext(ctx, providers, providerKeys, 'fetchImpl') || clientOptions.fetchImpl;
      const client = createHostedCommunityClient({
        ...clientOptions,
        ...moduleConfig,
        ...(fetchImpl ? { fetchImpl } : {})
      });
      return {
        services: {
          [serviceKey]: client
        }
      };
    }
  });
}

export function createSocialPreviewCacheServerModule({
  name = 'core.socialPreviewCache',
  serviceKey = 'socialPreviewCacheService',
  requires = [],
  provides = [serviceKey],
  providerKeys = {},
  providers = {},
  config = {},
  registerJob = true,
  jobName = 'socialPreviewCache',
  ...serviceOptions
} = {}) {
  const providerNames = [
    'renderPreview',
    'ensureOutputDirectory',
    'copyFallback',
    'logger',
    'relativePath'
  ];
  const requiredProviderKeys = providerNames
    .map((providerName) => providerKeys[providerName])
    .filter((key, index) => {
      const providerName = providerNames[index];
      return key && !providers?.[providerName] && !serviceOptions?.[providerName];
    });
  return createBackpackServerModule({
    name,
    requires: [...requires, ...requiredProviderKeys],
    provides,
    config,
    setup(ctx) {
      const moduleConfig = ctx.getConfig(name, {});
      const serviceProviders = providerOptionsFromContext(ctx, providers, providerKeys, providerNames);
      const service = createSocialPreviewCacheService({
        ...serviceOptions,
        ...moduleConfig,
        ...serviceProviders
      });
      return {
        services: {
          [serviceKey]: service
        },
        jobs: registerJob === false || moduleConfig.registerJob === false
          ? []
          : [{
              name: moduleConfig.jobName || jobName,
              run: (options) => service.ensureSocialPreviewCache(options)
            }]
      };
    }
  });
}

function requireDependencies(module, context) {
  const missing = module.requires.filter((key) => !context.registry.has(key));
  if (missing.length) {
    throw new Error(`Backpack server module ${module.name} missing dependencies: ${missing.join(', ')}`);
  }
}

function mergeNamed(target, values = {}) {
  for (const [key, value] of Object.entries(values || {})) target[key] = value;
}

function assertCanProvide(module, context, keys) {
  if (module.allowOverride) return;
  for (const key of keys) {
    if (context.registry.has(key)) {
      throw new Error(`Backpack server module ${module.name} cannot override existing provider ${key}`);
    }
  }
}

function validateModuleConfig(module, context) {
  const resolvedConfig = moduleConfigFromContext(module, context);
  context.moduleConfigs[module.name] = resolvedConfig;
  context.provide(`config.${module.name}`, resolvedConfig, { override: true });
  if (module.configKey !== module.name) {
    context.provide(`config.${module.configKey}`, resolvedConfig, { override: true });
  }
  if (module.validateConfig) {
    const validation = module.validateConfig(resolvedConfig, context);
    if (validation === false) {
      throw new Error(`Backpack server module ${module.name} config validation failed`);
    }
  }
  return resolvedConfig;
}

export function setupBackpackServerModules(modules = [], baseContext = {}) {
  const context = baseContext.registry ? baseContext : createBackpackServerContext(baseContext);
  const installed = [];
  const installedNames = new Set();

  for (const rawModule of modules) {
    const module = createBackpackServerModule(rawModule);
    if (installedNames.has(module.name)) {
      throw new Error(`Backpack server module ${module.name} is registered more than once`);
    }
    installedNames.add(module.name);
    requireDependencies(module, context);
    validateModuleConfig(module, context);
    assertCanProvide(module, context, module.provides);
    const result = module.setup(context) || {};
    assertCanProvide(module, context, [
      ...Object.keys(result.services || {}),
      ...Object.keys(result.routes || {})
    ]);

    mergeNamed(context.services, result.services);
    mergeNamed(context.routes, result.routes);
    for (const [key, value] of Object.entries(result.services || {})) {
      context.provide(key, value, { override: module.allowOverride });
    }
    for (const [key, value] of Object.entries(result.routes || {})) {
      context.provide(key, value, { override: module.allowOverride });
    }
    context.jobs.push(...asArray(result.jobs));
    context.healthChecks.push(...asArray(result.healthChecks));

    for (const provided of module.provides) {
      if (!context.registry.has(provided)) {
        throw new Error(`Backpack server module ${module.name} did not provide ${provided}`);
      }
    }
    installed.push(module.name);
  }

  return { ...context, installed };
}

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
