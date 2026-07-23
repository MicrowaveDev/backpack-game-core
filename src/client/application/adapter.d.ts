import type { VueComponentOption } from '../../vue/components.js';
import type {
  ApplicationServiceRegistry,
  ApplicationServices
} from './services.js';

export interface LocaleService {
  getLocale(): string;
  setLocale(locale: string): void | Promise<void>;
  translate(key: string, params?: Record<string, unknown>): string;
  subscribe?(listener: (locale: string) => void): () => void;
}

export interface AssetResolver {
  resolve(kind: string, id: string, variant?: string): string | null;
}

export interface NavigationItem {
  label?: string;
  labelKey?: string;
  order?: number;
  group?: string;
  icon?: string;
  hidden?: boolean;
  [key: string]: unknown;
}

export interface RouteGuardContext {
  adapter: GameApplicationAdapter;
  [key: string]: unknown;
}

export interface ScreenDefinition {
  id: string;
  component: VueComponentOption;
  capability?: string;
  public?: boolean;
  navigation?: NavigationItem;
  guard?: (context: RouteGuardContext) => boolean | string;
}

export interface HostIntegrations {
  [name: string]: unknown;
}

export interface GameApplicationAdapterInput {
  id: string;
  defaultLocale: string;
  locale: LocaleService;
  assets: AssetResolver;
  services: ApplicationServices | ApplicationServiceRegistry;
  capabilities?: Record<string, boolean>;
  serviceRequirements?: Record<string, readonly string[]>;
  routeExtensions?: ScreenDefinition[];
  integrations?: HostIntegrations;
  themeClass?: string;
}

export interface GameApplicationAdapter extends Omit<GameApplicationAdapterInput, 'services'> {
  services: ApplicationServiceRegistry;
  capabilities: Readonly<Record<string, boolean>>;
  serviceRequirements: Readonly<Record<string, readonly string[]>>;
  routeExtensions: readonly ScreenDefinition[];
  integrations: Readonly<HostIntegrations>;
  themeClass: string;
}

export interface ValidateGameApplicationAdapterOptions {
  requiredServices?: readonly string[];
  allowUnknownServices?: boolean;
}

export function validateGameApplicationAdapter(
  adapter: GameApplicationAdapterInput,
  options?: ValidateGameApplicationAdapterOptions
): GameApplicationAdapter;
