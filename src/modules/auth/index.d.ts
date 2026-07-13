export interface AuthUserProfileOptions {
  id?: unknown;
  telegramId?: unknown;
  telegramUsername?: unknown;
  name?: unknown;
  lang?: unknown;
  extra?: Record<string, unknown>;
}

export function shapeAuthUserProfile(
  user?: Record<string, unknown>,
  options?: AuthUserProfileOptions
): Record<string, unknown>;

export function shapeAuthSessionResult(options?: {
  session?: Record<string, unknown>;
  sessionKey?: unknown;
  token?: unknown;
  authToken?: unknown;
  user?: unknown;
  player?: unknown;
  bootstrap?: unknown;
  tokenField?: string;
  userField?: string;
}): Record<string, unknown>;

export function shapeAuthLogoutResult(options?: {
  loggedOut?: boolean;
}): {
  loggedOut: boolean;
};

export interface ProfileRuntimeLoginResult {
  session?: Record<string, unknown>;
  sessionKey?: unknown;
  token?: unknown;
  authToken?: unknown;
  user?: unknown;
  player?: unknown;
  bootstrap?: unknown;
  [key: string]: unknown;
}

export interface ProfileRuntimeContext {
  [key: string]: unknown;
}

export interface ProfileRuntimeAdapters {
  authenticateToken?: (context: ProfileRuntimeContext & { authToken: unknown }) => unknown | Promise<unknown>;
  getBootstrap?: (context: ProfileRuntimeContext & { playerId: unknown }) => unknown | Promise<unknown>;
  getProfile?: (context: ProfileRuntimeContext & { playerId: unknown }) => unknown | Promise<unknown>;
  setActiveCharacter?: (context: ProfileRuntimeContext & {
    playerId: unknown;
    characterId: unknown;
  }) => unknown | Promise<unknown>;
  updateSettings?: (context: ProfileRuntimeContext & {
    playerId: unknown;
    settings: unknown;
  }) => unknown | Promise<unknown>;
}

export interface ProfileRuntimeLoginOptions {
  includeBootstrap?: boolean;
  tokenField?: string;
  userField?: string;
  presentPlayer?: (player: unknown, result: ProfileRuntimeLoginResult) => unknown | Promise<unknown>;
  resolvePlayer?: (result: ProfileRuntimeLoginResult) => unknown;
  resolvePlayerId?: (result: ProfileRuntimeLoginResult) => unknown;
  [key: string]: unknown;
}

export interface ProfileRuntimeService {
  readonly contract: 'profile-runtime/v1';
  login(provider: string, payload?: unknown, options?: ProfileRuntimeLoginOptions): Promise<Record<string, unknown>>;
  completeLogin(result?: ProfileRuntimeLoginResult, options?: ProfileRuntimeLoginOptions): Promise<Record<string, unknown>>;
  authenticateToken(authToken: unknown, context?: ProfileRuntimeContext): Promise<unknown>;
  getBootstrap(playerId: unknown, context?: ProfileRuntimeContext): Promise<unknown>;
  getBootstrapForToken(authToken: unknown, context?: ProfileRuntimeContext): Promise<unknown>;
  getProfile(playerId: unknown, context?: ProfileRuntimeContext): Promise<unknown>;
  setActiveCharacter(playerId: unknown, characterId: unknown, context?: ProfileRuntimeContext): Promise<unknown>;
  updateSettings(playerId: unknown, settings: unknown, context?: ProfileRuntimeContext): Promise<unknown>;
}

export function createProfileRuntimeService(options?: {
  loginProviders?: Record<string, (payload: unknown, options: ProfileRuntimeLoginOptions) => ProfileRuntimeLoginResult | Promise<ProfileRuntimeLoginResult>>;
  adapters?: ProfileRuntimeAdapters;
  presentPlayer?: (player: unknown, result: ProfileRuntimeLoginResult) => unknown | Promise<unknown>;
  resolvePlayer?: (result: ProfileRuntimeLoginResult) => unknown;
  resolvePlayerId?: (result: ProfileRuntimeLoginResult) => unknown;
  tokenField?: string;
  userField?: string;
  includeBootstrapOnLogin?: boolean;
}): ProfileRuntimeService;
