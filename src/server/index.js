function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function createBackpackServerModule(definition = {}) {
  if (!definition.name) throw new Error('Backpack server module requires a name');
  return {
    name: definition.name,
    requires: asArray(definition.requires),
    provides: asArray(definition.provides),
    configSchema: definition.configSchema || null,
    config: definition.config || {},
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
    services: { ...services },
    routes: { ...routes },
    jobs: [...jobs],
    healthChecks: [...healthChecks],
    registry,
    get(key) {
      return registry.get(key);
    },
    provide(key, value) {
      registry.set(key, value);
      return value;
    }
  };
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

export function setupBackpackServerModules(modules = [], baseContext = {}) {
  const context = baseContext.registry ? baseContext : createBackpackServerContext(baseContext);
  const installed = [];

  for (const rawModule of modules) {
    const module = createBackpackServerModule(rawModule);
    requireDependencies(module, context);
    const result = module.setup(context) || {};

    mergeNamed(context.services, result.services);
    mergeNamed(context.routes, result.routes);
    for (const [key, value] of Object.entries(result.services || {})) context.provide(key, value);
    for (const [key, value] of Object.entries(result.routes || {})) context.provide(key, value);
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
