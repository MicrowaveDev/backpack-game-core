import { ApplicationError } from './errors.js';

export const APPLICATION_SERVICE_NAMES = Object.freeze([
  'session',
  'catalog',
  'profile',
  'run',
  'replay',
  'social',
  'wallet',
  'assets',
  'settings',
  'support'
]);

const knownServiceNames = new Set(APPLICATION_SERVICE_NAMES);
const registryMarker = Symbol('application-service-registry');

function assertServiceName(name, allowUnknown) {
  if (typeof name !== 'string' || !name.trim()) {
    throw new TypeError('Application service names must be non-empty strings');
  }
  if (!allowUnknown && !knownServiceNames.has(name)) {
    throw new TypeError(`Unknown application service: ${name}`);
  }
  return name;
}

function assertServicePort(name, service) {
  if (!service || (typeof service !== 'object' && typeof service !== 'function')) {
    throw new TypeError(`Application service "${name}" must be an object or function`);
  }
}

export function isApplicationServiceRegistry(value) {
  return Boolean(value && value[registryMarker] === true);
}

export function createApplicationServiceRegistry(services = {}, options = {}) {
  if (isApplicationServiceRegistry(services)) {
    for (const name of options.required || []) services.getRequired(name);
    return services;
  }
  if (!services || typeof services !== 'object' || Array.isArray(services)) {
    throw new TypeError('Application services must be provided as an object');
  }

  const allowUnknown = options.allowUnknown === true;
  const ports = {};
  for (const [rawName, service] of Object.entries(services)) {
    const name = assertServiceName(rawName, allowUnknown);
    assertServicePort(name, service);
    ports[name] = service;
  }

  const names = Object.freeze(Object.keys(ports).sort());
  const registry = {
    [registryMarker]: true,
    names,
    has(name) {
      return Object.prototype.hasOwnProperty.call(ports, name);
    },
    get(name, getOptions = {}) {
      assertServiceName(name, allowUnknown);
      const service = ports[name];
      if (!service && getOptions.required === true) {
        throw new ApplicationError(`Required application service is unavailable: ${name}`, {
          code: 'APPLICATION_SERVICE_MISSING',
          details: { service: name }
        });
      }
      return service;
    },
    getRequired(name) {
      return this.get(name, { required: true });
    },
    toObject() {
      return { ...ports };
    }
  };

  Object.freeze(registry);
  for (const name of options.required || []) registry.getRequired(name);
  return registry;
}
