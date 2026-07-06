import { createAssetGachaSimulationService } from '../modules/gacha/simulation-service.js';
import { createHostedCommunityClient } from '../modules/community/client.js';
import { createSocialPreviewCacheService } from '../modules/social-preview/index.js';
import {
  createLoadoutValidationService,
  LOADOUT_VALIDATION_PROVIDER_NAMES
} from '../modules/loadout/validation-service.js';
import { createRunReadinessManager } from './readiness.js';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

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
