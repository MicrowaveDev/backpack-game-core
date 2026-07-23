export const APPLICATION_SERVICE_NAMES: readonly [
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
];

export type ApplicationServiceName = typeof APPLICATION_SERVICE_NAMES[number];
export type ApplicationServicePort = object | ((...args: unknown[]) => unknown);
export type ApplicationServices = Partial<Record<ApplicationServiceName, ApplicationServicePort>> &
  Record<string, ApplicationServicePort | undefined>;

export interface ApplicationServiceRegistry {
  readonly names: readonly string[];
  has(name: string): boolean;
  get<T extends ApplicationServicePort = ApplicationServicePort>(
    name: string,
    options?: { required?: boolean }
  ): T | undefined;
  getRequired<T extends ApplicationServicePort = ApplicationServicePort>(name: string): T;
  toObject(): ApplicationServices;
}

export interface CreateApplicationServiceRegistryOptions {
  required?: readonly string[];
  allowUnknown?: boolean;
}

export function isApplicationServiceRegistry(value: unknown): value is ApplicationServiceRegistry;
export function createApplicationServiceRegistry(
  services?: ApplicationServices | ApplicationServiceRegistry,
  options?: CreateApplicationServiceRegistryOptions
): ApplicationServiceRegistry;
