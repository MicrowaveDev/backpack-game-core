import { createApplicationServiceRegistry } from './services.js';

function assertRecord(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value;
}

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return value;
}

function normalizeCapabilities(capabilities = {}) {
  assertRecord(capabilities, 'Adapter capabilities');
  const normalized = {};
  for (const [name, enabled] of Object.entries(capabilities)) {
    assertNonEmptyString(name, 'Capability name');
    if (typeof enabled !== 'boolean') {
      throw new TypeError(`Capability "${name}" must be boolean`);
    }
    normalized[name] = enabled;
  }
  return Object.freeze(normalized);
}

function normalizeServiceRequirements(requirements = {}) {
  assertRecord(requirements, 'Adapter service requirements');
  const normalized = {};
  for (const [capability, services] of Object.entries(requirements)) {
    if (!Array.isArray(services) || services.some((name) => typeof name !== 'string' || !name)) {
      throw new TypeError(`Service requirements for "${capability}" must be an array of service names`);
    }
    normalized[capability] = Object.freeze(Array.from(new Set(services)));
  }
  return Object.freeze(normalized);
}

function requiredServicesFor(capabilities, requirements, requiredServices) {
  const required = new Set(requiredServices || []);
  for (const [capability, services] of Object.entries(requirements)) {
    if (capabilities[capability] !== true) continue;
    for (const service of services) required.add(service);
  }
  return Array.from(required);
}

export function validateGameApplicationAdapter(adapter, options = {}) {
  assertRecord(adapter, 'Game application adapter');
  const id = assertNonEmptyString(adapter.id, 'Adapter id');
  const defaultLocale = assertNonEmptyString(adapter.defaultLocale, 'Adapter defaultLocale');

  const locale = assertRecord(adapter.locale, 'Adapter locale service');
  if (typeof locale.getLocale !== 'function' ||
      typeof locale.setLocale !== 'function' ||
      typeof locale.translate !== 'function') {
    throw new TypeError('Adapter locale service must implement getLocale, setLocale, and translate');
  }
  if (locale.subscribe !== undefined && typeof locale.subscribe !== 'function') {
    throw new TypeError('Adapter locale subscribe must be a function when provided');
  }

  const assets = assertRecord(adapter.assets, 'Adapter asset resolver');
  if (typeof assets.resolve !== 'function') {
    throw new TypeError('Adapter asset resolver must implement resolve');
  }

  const capabilities = normalizeCapabilities(adapter.capabilities);
  const serviceRequirements = normalizeServiceRequirements(adapter.serviceRequirements);
  const requiredServices = requiredServicesFor(
    capabilities,
    serviceRequirements,
    options.requiredServices
  );
  const services = createApplicationServiceRegistry(adapter.services, {
    required: requiredServices,
    allowUnknown: options.allowUnknownServices === true
  });

  const routeExtensions = adapter.routeExtensions || [];
  if (!Array.isArray(routeExtensions)) {
    throw new TypeError('Adapter routeExtensions must be an array');
  }
  if (adapter.integrations !== undefined) {
    assertRecord(adapter.integrations, 'Adapter integrations');
  }
  if (adapter.themeClass !== undefined && typeof adapter.themeClass !== 'string') {
    throw new TypeError('Adapter themeClass must be a string');
  }

  return Object.freeze({
    id,
    defaultLocale,
    locale,
    assets,
    services,
    capabilities,
    serviceRequirements,
    routeExtensions: Object.freeze([...routeExtensions]),
    integrations: Object.freeze({ ...(adapter.integrations || {}) }),
    themeClass: adapter.themeClass || ''
  });
}
