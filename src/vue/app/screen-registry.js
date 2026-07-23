function assertScreenDefinition(definition) {
  if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
    throw new TypeError('Screen definitions must be objects');
  }
  if (typeof definition.id !== 'string' || !definition.id.trim()) {
    throw new TypeError('Screen definition id must be a non-empty string');
  }
  if (!definition.component ||
      (typeof definition.component !== 'object' && typeof definition.component !== 'function')) {
    throw new TypeError(`Screen "${definition.id}" must provide a component`);
  }
  if (definition.capability !== undefined &&
      (typeof definition.capability !== 'string' || !definition.capability)) {
    throw new TypeError(`Screen "${definition.id}" capability must be a non-empty string`);
  }
  if (definition.guard !== undefined && typeof definition.guard !== 'function') {
    throw new TypeError(`Screen "${definition.id}" guard must be a function`);
  }
  if (definition.navigation !== undefined &&
      (!definition.navigation || typeof definition.navigation !== 'object' ||
        Array.isArray(definition.navigation))) {
    throw new TypeError(`Screen "${definition.id}" navigation must be an object`);
  }
}

function normalizeScreenDefinition(definition) {
  assertScreenDefinition(definition);
  return Object.freeze({
    ...definition,
    id: definition.id.trim(),
    navigation: definition.navigation
      ? Object.freeze({ ...definition.navigation })
      : undefined
  });
}

function capabilityAllows(screen, capabilities) {
  return !screen.capability || capabilities[screen.capability] === true;
}

function guardResult(screen, context) {
  if (!screen.guard) return { allowed: true, redirect: undefined };
  const result = screen.guard(context);
  if (typeof result === 'string' && result) {
    return { allowed: false, redirect: result };
  }
  return { allowed: result === true, redirect: undefined };
}

export function createScreenRegistry(definitions = [], options = {}) {
  if (!Array.isArray(definitions)) {
    throw new TypeError('Screen definitions must be an array');
  }
  const capabilities = Object.freeze({ ...(options.capabilities || {}) });
  const ordered = [];
  const byId = new Map();

  for (const input of definitions) {
    const screen = normalizeScreenDefinition(input);
    if (byId.has(screen.id)) {
      throw new TypeError(`Duplicate screen id: ${screen.id}`);
    }
    byId.set(screen.id, screen);
    ordered.push(screen);
  }

  const registry = {
    capabilities,
    ids: Object.freeze(ordered.map((screen) => screen.id)),
    has(id) {
      return byId.has(id);
    },
    get(id) {
      return byId.get(id);
    },
    getRequired(id) {
      const screen = byId.get(id);
      if (!screen) throw new TypeError(`Unknown screen id: ${id}`);
      return screen;
    },
    resolve(id, context = {}) {
      const screen = byId.get(id);
      if (!screen) return { screen: undefined, allowed: false, redirect: undefined };
      if (!capabilityAllows(screen, capabilities)) {
        return { screen, allowed: false, redirect: undefined };
      }
      return { screen, ...guardResult(screen, context) };
    },
    list(listOptions = {}) {
      if (listOptions.includeDisabled === true) return [...ordered];
      const context = listOptions.context || {};
      return ordered.filter((screen) => {
        if (!capabilityAllows(screen, capabilities)) return false;
        return guardResult(screen, context).allowed;
      });
    },
    first(context = {}) {
      return this.list({ context })[0];
    }
  };

  return Object.freeze(registry);
}
