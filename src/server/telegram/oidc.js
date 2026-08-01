import {
  createHash,
  createPublicKey,
  randomBytes,
  verify as verifySignature
} from 'node:crypto';

const defaultIssuer = 'https://oauth.telegram.org';
const defaultAuthorizationUrl = `${defaultIssuer}/auth`;
const defaultTokenUrl = `${defaultIssuer}/token`;
const defaultJwksUrl = `${defaultIssuer}/.well-known/jwks.json`;

function base64Url(bytes) {
  return Buffer.from(bytes).toString('base64url');
}

function required(value, name) {
  const normalized = String(value || '').trim();
  if (!normalized) throw new Error(`${name} is required`);
  return normalized;
}

function decodeJwtPart(value) {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Telegram OIDC token contains invalid JSON');
  }
}

function audienceMatches(audience, clientId) {
  if (Array.isArray(audience)) return audience.map(String).includes(String(clientId));
  return String(audience || '') === String(clientId);
}

export function createTelegramOidcTransaction({ randomBytesImpl = randomBytes } = {}) {
  const codeVerifier = base64Url(randomBytesImpl(48));
  return {
    state: base64Url(randomBytesImpl(32)),
    nonce: base64Url(randomBytesImpl(32)),
    codeVerifier,
    codeChallenge: base64Url(createHash('sha256').update(codeVerifier).digest())
  };
}

export function buildTelegramOidcAuthorizationUrl({
  clientId,
  redirectUri,
  state,
  nonce,
  codeChallenge,
  scopes = ['openid', 'profile'],
  authorizationUrl = defaultAuthorizationUrl
} = {}) {
  const url = new URL(authorizationUrl);
  url.searchParams.set('client_id', required(clientId, 'Telegram OIDC client ID'));
  url.searchParams.set('redirect_uri', required(redirectUri, 'Telegram OIDC redirect URI'));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scopes.map(String).filter(Boolean).join(' '));
  url.searchParams.set('state', required(state, 'Telegram OIDC state'));
  url.searchParams.set('nonce', required(nonce, 'Telegram OIDC nonce'));
  url.searchParams.set('code_challenge', required(codeChallenge, 'Telegram OIDC code challenge'));
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

export async function exchangeTelegramOidcCode({
  code,
  clientId,
  clientSecret,
  redirectUri,
  codeVerifier,
  tokenUrl = defaultTokenUrl,
  fetchImpl = globalThis.fetch
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('Telegram OIDC token exchange requires fetch');
  const normalizedClientId = required(clientId, 'Telegram OIDC client ID');
  const normalizedClientSecret = required(clientSecret, 'Telegram OIDC client secret');
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: required(code, 'Telegram OIDC authorization code'),
    redirect_uri: required(redirectUri, 'Telegram OIDC redirect URI'),
    client_id: normalizedClientId,
    code_verifier: required(codeVerifier, 'Telegram OIDC code verifier')
  });
  const response = await fetchImpl(tokenUrl, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      authorization: `Basic ${Buffer.from(`${normalizedClientId}:${normalizedClientSecret}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) {
    const error = new Error(payload.error_description || payload.error || `Telegram OIDC token exchange failed (${response.status})`);
    error.status = 401;
    throw error;
  }
  if (!payload.id_token) throw new Error('Telegram OIDC token response is missing id_token');
  return payload;
}

export async function verifyTelegramOidcIdToken(idToken, {
  clientId,
  nonce,
  issuer = defaultIssuer,
  jwksUrl = defaultJwksUrl,
  fetchImpl = globalThis.fetch,
  nowSeconds = Math.floor(Date.now() / 1000),
  clockToleranceSeconds = 30
} = {}) {
  const parts = required(idToken, 'Telegram OIDC ID token').split('.');
  if (parts.length !== 3) throw new Error('Telegram OIDC ID token is malformed');
  const header = decodeJwtPart(parts[0]);
  const claims = decodeJwtPart(parts[1]);
  if (header.alg !== 'RS256') throw new Error(`Unsupported Telegram OIDC signing algorithm: ${header.alg || 'missing'}`);
  if (!header.kid) throw new Error('Telegram OIDC ID token is missing kid');
  if (typeof fetchImpl !== 'function') throw new Error('Telegram OIDC verification requires fetch');

  const response = await fetchImpl(jwksUrl, { headers: { accept: 'application/json' } });
  const jwks = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Telegram OIDC JWKS request failed (${response.status})`);
  const jwk = jwks.keys?.find((key) => key.kid === header.kid && key.kty === 'RSA');
  if (!jwk) throw new Error('Telegram OIDC signing key was not found');
  const signatureValid = verifySignature(
    'RSA-SHA256',
    Buffer.from(`${parts[0]}.${parts[1]}`),
    createPublicKey({ key: jwk, format: 'jwk' }),
    Buffer.from(parts[2], 'base64url')
  );
  if (!signatureValid) throw new Error('Telegram OIDC ID token signature is invalid');
  if (claims.iss !== issuer) throw new Error('Telegram OIDC ID token issuer is invalid');
  if (!audienceMatches(claims.aud, required(clientId, 'Telegram OIDC client ID'))) {
    throw new Error('Telegram OIDC ID token audience is invalid');
  }
  if (!Number.isFinite(Number(claims.exp)) || Number(claims.exp) < nowSeconds - clockToleranceSeconds) {
    throw new Error('Telegram OIDC ID token is expired');
  }
  if (Number.isFinite(Number(claims.iat)) && Number(claims.iat) > nowSeconds + clockToleranceSeconds) {
    throw new Error('Telegram OIDC ID token was issued in the future');
  }
  if (nonce && claims.nonce !== nonce) throw new Error('Telegram OIDC ID token nonce is invalid');
  if (!claims.sub && !claims.id) throw new Error('Telegram OIDC ID token is missing the user identifier');
  return claims;
}

export async function completeTelegramOidcAuthorization(options = {}) {
  const tokens = await exchangeTelegramOidcCode(options);
  const claims = await verifyTelegramOidcIdToken(tokens.id_token, options);
  return { tokens, claims };
}
