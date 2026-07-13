const TELEGRAM_INIT_DATA_MAX_AGE_SECONDS = 24 * 60 * 60;
const TELEGRAM_INIT_DATA_FUTURE_SKEW_SECONDS = 5 * 60;

function requiredDependency(name) {
  return () => {
    throw new Error(`createMushroomAuthServicePort requires ${name}`);
  };
}

export function createMushroomAuthServicePort(options = {}) {
  const {
    crypto,
    query = requiredDependency('query'),
    withTransaction = requiredDependency('withTransaction'),
    createId = requiredDependency('createId'),
    createSessionKey = requiredDependency('createSessionKey'),
    createShortCode = requiredDependency('createShortCode'),
    normalizeLanguage = (value, fallback) => value || fallback,
    nowIso = () => new Date().toISOString(),
    nowDate = () => new Date(),
    random = Math.random,
    characters = [],
    sessionTtlHours = 24
  } = options;

  if (!crypto?.createHmac || !crypto?.randomUUID) {
    throw new Error('createMushroomAuthServicePort requires crypto.createHmac and crypto.randomUUID');
  }

function telegramSecret(botToken) {
  return crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
}

function verifyTelegramInitData(initData, botToken) {
  if (!initData || !botToken) {
    return false;
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) {
    return false;
  }
  const authDate = Number(params.get('auth_date'));
  const nowSeconds = Math.floor(nowDate().getTime() / 1000);
  if (
    !Number.isFinite(authDate) ||
    authDate < nowSeconds - TELEGRAM_INIT_DATA_MAX_AGE_SECONDS ||
    authDate > nowSeconds + TELEGRAM_INIT_DATA_FUTURE_SKEW_SECONDS
  ) {
    return false;
  }

  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const calculated = crypto
    .createHmac('sha256', telegramSecret(botToken))
    .update(dataCheckString)
    .digest('hex');

  return calculated === hash;
}

function parseTelegramUser(initData) {
  const params = new URLSearchParams(initData);
  const userRaw = params.get('user');
  if (!userRaw) {
    throw new Error('Missing Telegram user');
  }
  return JSON.parse(userRaw);
}

async function ensurePlayerCharacters(client, playerId) {
  for (const character of characters) {
    await client.query(
      `INSERT INTO player_mushrooms (player_id, mushroom_id)
       VALUES ($1, $2)
       ON CONFLICT (player_id, mushroom_id) DO NOTHING`,
      [playerId, character.id]
    );
  }
}

async function ensurePlayerDefaults(client, playerId, defaultLang = 'ru') {
  await client.query(
    `INSERT INTO player_settings (player_id, lang)
     VALUES ($1, $2)
     ON CONFLICT (player_id) DO NOTHING`,
    [playerId, defaultLang]
  );
  await ensurePlayerCharacters(client, playerId);
}

async function upsertTelegramPlayerWithClient(client, telegramUser) {
  const lookup = await client.query(
    `SELECT * FROM players WHERE telegram_id = $1`,
    [String(telegramUser.id)]
  );

  const name =
    [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' ') ||
    telegramUser.username ||
    `Telegram User ${telegramUser.id}`;
  const lang = normalizeLanguage(telegramUser.language_code, 'ru');
  const timestamp = nowIso();
  let player;

  if (lookup.rowCount) {
    player = lookup.rows[0];
    await client.query(
      `UPDATE players
       SET telegram_username = $2, name = $3, lang = $4, updated_at = $5
       WHERE id = $1`,
      [player.id, telegramUser.username || null, name, lang, timestamp]
    );
  } else {
    player = {
      id: createId('player'),
      friend_code: await createUniqueFriendCode(client)
    };
    await client.query(
      `INSERT INTO players (id, telegram_id, telegram_username, name, lang, friend_code, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
      [player.id, String(telegramUser.id), telegramUser.username || null, name, lang, player.friend_code, timestamp]
    );
  }

  await ensurePlayerDefaults(client, player.id, lang);
  const hydrated = await client.query(`SELECT * FROM players WHERE id = $1`, [player.id]);
  return hydrated.rows[0];
}

async function createSession(client, playerId, provider) {
  const createdAt = nowDate();
  const expiresAt = new Date(createdAt);
  expiresAt.setHours(expiresAt.getHours() + sessionTtlHours);
  const session = {
    id: createId('session'),
    sessionKey: createSessionKey(),
    playerId,
    provider,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString()
  };

  await client.query(
    `INSERT INTO sessions (id, session_key, player_id, provider, created_at, expires_at, last_seen_at)
     VALUES ($1, $2, $3, $4, $5, $6, $5)`,
    [session.id, session.sessionKey, session.playerId, session.provider, session.createdAt, session.expiresAt]
  );

  return session;
}

async function upsertTelegramPlayer(telegramUser, provider = 'telegram') {
  return withTransaction(async (client) => {
    const player = await upsertTelegramPlayerWithClient(client, telegramUser);
    const session = await createSession(client, player.id, provider);
    return { player, session };
  });
}

async function loginWithDevSession(payload = {}) {
  return withTransaction(async (client) => {
    const syntheticTelegramUser = {
      id: payload.telegramId || `dev:${payload.username || 'local_player'}`,
      username: payload.username || 'local_player',
      first_name: payload.name || 'Local',
      last_name: payload.lastName || 'Player',
      language_code: payload.lang || 'ru'
    };
    const player = await upsertTelegramPlayerWithClient(client, syntheticTelegramUser);
    const session = await createSession(client, player.id, 'dev_mock');
    return { player, session };
  });
}

async function loginWithWebSession(payload = {}) {
  const clientId = String(payload.clientId || '').trim();
  if (!/^[a-zA-Z0-9:_-]{8,80}$/.test(clientId)) {
    throw new Error('Invalid browser session id');
  }
  return withTransaction(async (client) => {
    const syntheticWebUser = {
      id: `web:${clientId}`,
      username: null,
      first_name: payload.name || 'Web',
      last_name: payload.lastName || 'Player',
      language_code: payload.lang || 'ru'
    };
    const player = await upsertTelegramPlayerWithClient(client, syntheticWebUser);
    const session = await createSession(client, player.id, 'web');
    return { player, session };
  });
}

async function loginWithTelegram(initData, botToken) {
  if (!verifyTelegramInitData(initData, botToken)) {
    throw new Error('Invalid Telegram signature');
  }
  const telegramUser = parseTelegramUser(initData);
  return upsertTelegramPlayer(telegramUser, 'telegram');
}

async function logoutSession(sessionKey) {
  if (!sessionKey) return;
  await query(`DELETE FROM sessions WHERE session_key = $1`, [sessionKey]);
}

async function pruneExpiredAuthRecords(now = nowIso()) {
  const sessionCount = await query(`SELECT COUNT(*) AS count FROM sessions WHERE expires_at < $1`, [now]);
  const authCodeCount = await query(`SELECT COUNT(*) AS count FROM auth_codes WHERE expires_at < $1`, [now]);
  const expiredSessions = await query(`DELETE FROM sessions WHERE expires_at < $1`, [now]);
  const expiredAuthCodes = await query(`DELETE FROM auth_codes WHERE expires_at < $1`, [now]);
  return {
    prunedSessions: Number(sessionCount.rows[0]?.count || expiredSessions.rowCount || 0),
    prunedAuthCodes: Number(authCodeCount.rows[0]?.count || expiredAuthCodes.rowCount || 0)
  };
}

async function createUniqueFriendCode(client) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const code = String(Math.floor(100000 + random() * 900000));
    const found = await client.query('SELECT 1 FROM players WHERE friend_code = $1', [code]);
    if (!found.rowCount) {
      return code;
    }
  }
  throw new Error('Could not allocate unique friend code');
}

async function createTelegramAuthCode() {
  return withTransaction(async (client) => {
    const createdAt = nowDate();
    const expiresAt = new Date(createdAt.getTime() + 10 * 60 * 1000);
    const row = {
      id: createId('authcode'),
      privateCode: crypto.randomUUID(),
      publicCode: createShortCode(8),
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString()
    };
    await client.query(
      `INSERT INTO auth_codes (id, provider, private_code, public_code, expires_at, created_at)
       VALUES ($1, 'telegram', $2, $3, $4, $5)`,
      [row.id, row.privateCode, row.publicCode, row.expiresAt, row.createdAt]
    );
    return row;
  });
}

async function confirmTelegramAuthCode(publicCode, telegramUser) {
  return withTransaction(async (client) => {
    const lookup = await client.query(
      `SELECT * FROM auth_codes WHERE public_code = $1 AND provider = 'telegram'`,
      [publicCode]
    );
    if (!lookup.rowCount) {
      throw new Error('Unknown auth code');
    }
    const authCode = lookup.rows[0];
    if (authCode.used || new Date(authCode.expires_at) < nowDate()) {
      throw new Error('Auth code expired');
    }

    const player = await upsertTelegramPlayerWithClient(client, telegramUser);
    await client.query(
      `UPDATE auth_codes
       SET user_id = $2
       WHERE id = $1`,
      [authCode.id, player.id]
    );
    return player;
  });
}

async function verifyTelegramAuthCode(privateCode) {
  return withTransaction(async (client) => {
    const lookup = await client.query(
      `SELECT * FROM auth_codes WHERE private_code = $1 AND provider = 'telegram'`,
      [privateCode]
    );

    if (!lookup.rowCount) {
      return { success: false, needsBotAuth: false, error: 'Code invalid' };
    }

    const authCode = lookup.rows[0];
    if (authCode.used || new Date(authCode.expires_at) < nowDate()) {
      return { success: false, needsBotAuth: false, error: 'Code expired or already used' };
    }
    if (!authCode.user_id) {
      return { success: false, needsBotAuth: true };
    }

    const session = await createSession(client, authCode.user_id, 'telegram_code');
    await client.query('UPDATE auth_codes SET used = 1 WHERE id = $1', [authCode.id]);
    const playerLookup = await client.query('SELECT * FROM players WHERE id = $1', [authCode.user_id]);
    return {
      success: true,
      session,
      player: playerLookup.rows[0]
    };
  });
}

async function authenticateRequest(req, _res, next) {
  const sessionKey =
    req.header('x-session-key') ||
    req.header('authorization')?.replace(/^Bearer\s+/i, '') ||
    req.query?.sessionKey;

  req.authenticated = false;
  if (!sessionKey) {
    return next();
  }

  const sessionResult = await query(
    `SELECT sessions.*, players.telegram_id, players.telegram_username, players.name, players.lang, players.friend_code,
            players.spore, players.rating, players.rated_battle_count, players.wins, players.losses, players.draws, players.id AS player_id
     FROM sessions
     JOIN players ON players.id = sessions.player_id
     WHERE sessions.session_key = $1`,
    [sessionKey]
  );

  if (!sessionResult.rowCount) {
    return next();
  }

  const session = sessionResult.rows[0];
  if (new Date(session.expires_at) < nowDate()) {
    return next();
  }

  await query(`UPDATE sessions SET last_seen_at = $2 WHERE id = $1`, [session.id, nowIso()]);
  req.authenticated = true;
  req.session = session;
  req.user = {
    id: session.player_id,
    telegramId: session.telegram_id,
    telegramUsername: session.telegram_username,
    name: session.name,
    lang: session.lang,
    friendCode: session.friend_code,
    spore: session.spore,
    rating: session.rating,
    ratedBattleCount: session.rated_battle_count,
    wins: session.wins,
    losses: session.losses,
    draws: session.draws
  };
  return next();
}

function requireAuth(req, res, next) {
  if (!req.authenticated) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  return next();
}

  return {
    verifyTelegramInitData,
    upsertTelegramPlayer,
    loginWithDevSession,
    loginWithWebSession,
    loginWithTelegram,
    logoutSession,
    pruneExpiredAuthRecords,
    createTelegramAuthCode,
    confirmTelegramAuthCode,
    verifyTelegramAuthCode,
    authenticateRequest,
    requireAuth
  };
}
