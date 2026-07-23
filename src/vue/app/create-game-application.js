import { validateGameApplicationAdapter } from '../../client/application/adapter.js';
import { GameApplicationRoot } from './GameApplicationRoot.js';
import { createScreenRegistry } from './screen-registry.js';

export function createGameApplication(adapterInput, options = {}) {
  const adapter = validateGameApplicationAdapter(adapterInput, {
    requiredServices: options.requiredServices,
    allowUnknownServices: options.allowUnknownServices
  });
  const screens = [
    ...(options.screens || []),
    ...adapter.routeExtensions
  ];
  const registry = createScreenRegistry(screens, {
    capabilities: adapter.capabilities
  });
  const routeContext = {
    ...(options.routeContext || {}),
    adapter
  };
  const firstScreen = registry.first(routeContext);
  if (!firstScreen) {
    throw new TypeError('Game application requires at least one available screen');
  }

  const initialScreenId = options.initialScreenId || firstScreen.id;
  const initialResolution = registry.resolve(initialScreenId, routeContext);
  if (!initialResolution.allowed) {
    throw new TypeError(`Initial screen is unavailable: ${initialScreenId}`);
  }

  return Object.freeze({
    rootComponent: GameApplicationRoot,
    rootProps: Object.freeze({
      adapter,
      registry,
      initialScreenId,
      initialScreenProps: options.initialScreenProps || {},
      routeContext: options.routeContext || {},
      labels: options.labels || {},
      title: options.title || ''
    }),
    adapter,
    registry
  });
}
