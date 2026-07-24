import type {
  GameApplicationAdapter,
  GameApplicationAdapterInput,
  ScreenDefinition
} from '../../client/application/adapter.js';
import type { VueComponentOption } from '../components.js';
import type { ScreenRegistry } from './screen-registry.js';

export interface CreateGameApplicationOptions {
  screens?: readonly ScreenDefinition[];
  initialScreenId?: string;
  initialScreenProps?: Record<string, unknown>;
  routeContext?: Record<string, unknown>;
  labels?: Record<string, string>;
  title?: string;
  authenticated?: boolean;
  authStatus?: string;
  locale?: string;
  locales?: readonly (string | { id: string; label: string })[];
  menuOpen?: boolean;
  showLogout?: boolean;
  requiredServices?: readonly string[];
  allowUnknownServices?: boolean;
}

export interface GameApplicationDefinition {
  rootComponent: VueComponentOption;
  rootProps: {
    adapter: GameApplicationAdapter;
    registry: ScreenRegistry;
    initialScreenId: string;
    initialScreenProps: Record<string, unknown>;
    routeContext: Record<string, unknown>;
    labels: Record<string, string>;
    title: string;
    authenticated: boolean;
    authStatus: string;
    locale: string;
    locales: readonly (string | { id: string; label: string })[];
    menuOpen: boolean;
    showLogout: boolean;
  };
  adapter: GameApplicationAdapter;
  registry: ScreenRegistry;
}

export function createGameApplication(
  adapter: GameApplicationAdapterInput,
  options?: CreateGameApplicationOptions
): GameApplicationDefinition;
