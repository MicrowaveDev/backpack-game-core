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
