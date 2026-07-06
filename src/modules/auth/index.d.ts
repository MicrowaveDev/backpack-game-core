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
