function firstDefined(...values) {
  return values.find((value) => value !== undefined);
}

function omitUndefined(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined)
  );
}

export function shapeAuthUserProfile(user = {}, {
  id = user.id,
  telegramId = firstDefined(user.telegramId, user.telegram_id),
  telegramUsername = firstDefined(user.telegramUsername, user.telegram_username),
  name = firstDefined(user.name, user.displayName),
  lang = user.lang,
  extra = {}
} = {}) {
  return omitUndefined({
    id,
    telegramId,
    telegramUsername,
    name,
    lang,
    ...extra
  });
}

export function shapeAuthSessionResult({
  session = {},
  sessionKey,
  token,
  authToken,
  user,
  player,
  bootstrap,
  tokenField,
  userField
} = {}) {
  const resolvedToken = firstDefined(
    authToken,
    sessionKey,
    token,
    session.sessionKey,
    session.session_key,
    session.token
  );
  const resolvedTokenField = tokenField || (
    sessionKey !== undefined || session.sessionKey !== undefined || session.session_key !== undefined
      ? 'sessionKey'
      : 'token'
  );
  const resolvedUser = firstDefined(user, player);
  const resolvedUserField = userField || (user === undefined && player !== undefined ? 'player' : 'user');
  const result = {};
  if (resolvedToken !== undefined) result[resolvedTokenField] = resolvedToken;
  if (resolvedUser !== undefined) result[resolvedUserField] = resolvedUser;
  if (bootstrap !== undefined) result.bootstrap = bootstrap;
  return result;
}

export function shapeAuthLogoutResult({ loggedOut = true } = {}) {
  return { loggedOut: Boolean(loggedOut) };
}

function requireAdapter(adapters, name) {
  const adapter = adapters?.[name];
  if (typeof adapter !== 'function') {
    throw new TypeError(`Profile runtime adapter "${name}" is required`);
  }
  return adapter;
}

function defaultPlayer(loginResult = {}) {
  return firstDefined(loginResult.player, loginResult.user);
}

function defaultPlayerId(value = {}) {
  return firstDefined(
    value.playerId,
    value.player?.id,
    value.user?.id,
    value.session?.playerId,
    value.session?.player_id
  );
}

/**
 * Owns the shared profile/session workflow while products provide persistence,
 * provider verification, and presentation adapters.
 */
export function createProfileRuntimeService({
  loginProviders = {},
  adapters = {},
  presentPlayer = (player) => player,
  resolvePlayer = defaultPlayer,
  resolvePlayerId = defaultPlayerId,
  tokenField,
  userField,
  includeBootstrapOnLogin = false
} = {}) {
  async function completeLogin(loginResult = {}, options = {}) {
    const player = (options.resolvePlayer || resolvePlayer)(loginResult);
    const playerId = (options.resolvePlayerId || resolvePlayerId)({
      ...loginResult,
      player
    });
    const shouldIncludeBootstrap = options.includeBootstrap ?? includeBootstrapOnLogin;
    const bootstrap = loginResult.bootstrap !== undefined
      ? loginResult.bootstrap
      : shouldIncludeBootstrap
        ? await requireAdapter(adapters, 'getBootstrap')({
          playerId,
          loginResult
        })
        : undefined;
    const playerPresenter = options.presentPlayer || presentPlayer;
    const publicPlayer = player === undefined ? undefined : await playerPresenter(player, loginResult);

    return shapeAuthSessionResult({
      session: loginResult.session,
      sessionKey: loginResult.sessionKey,
      token: loginResult.token,
      authToken: loginResult.authToken,
      player: publicPlayer,
      bootstrap,
      tokenField: options.tokenField || tokenField,
      userField: options.userField || userField
    });
  }

  async function login(provider, payload = {}, options = {}) {
    const loginProvider = loginProviders[provider];
    if (typeof loginProvider !== 'function') {
      throw new TypeError(`Profile runtime login provider "${provider}" is not configured`);
    }
    return completeLogin(await loginProvider(payload, options), options);
  }

  async function authenticateToken(authToken, context = {}) {
    return requireAdapter(adapters, 'authenticateToken')({ authToken, ...context });
  }

  async function getBootstrap(playerId, context = {}) {
    return requireAdapter(adapters, 'getBootstrap')({ playerId, ...context });
  }

  async function getBootstrapForToken(authToken, context = {}) {
    const authenticated = await authenticateToken(authToken, context);
    const playerId = resolvePlayerId(authenticated);
    return getBootstrap(playerId, { ...context, authToken, authenticated });
  }

  async function getProfile(playerId, context = {}) {
    return requireAdapter(adapters, 'getProfile')({ playerId, ...context });
  }

  async function setActiveCharacter(playerId, characterId, context = {}) {
    return requireAdapter(adapters, 'setActiveCharacter')({
      playerId,
      characterId,
      ...context
    });
  }

  async function updateSettings(playerId, settings, context = {}) {
    return requireAdapter(adapters, 'updateSettings')({
      playerId,
      settings,
      ...context
    });
  }

  return Object.freeze({
    contract: 'profile-runtime/v1',
    login,
    completeLogin,
    authenticateToken,
    getBootstrap,
    getBootstrapForToken,
    getProfile,
    setActiveCharacter,
    updateSettings
  });
}
