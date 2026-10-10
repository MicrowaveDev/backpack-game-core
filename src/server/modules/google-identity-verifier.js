import { normalizeGoogleIdentityClaims } from '../../modules/auth/index.js';

/** The consumer supplies its maintained Google OAuth client, never decoded claims. */
export function createGoogleIdentityVerifier({ clientId, oauthClient } = {}) {
  const audience = String(clientId || '').trim();
  if (!audience || typeof oauthClient?.verifyIdToken !== 'function') {
    throw new TypeError('Google identity verifier requires a client ID and OAuth client');
  }
  return async (credential) => {
    const idToken = typeof credential === 'string' ? credential.trim() : '';
    if (!idToken) {
      const error = new Error('Google credential is required');
      error.status = 400;
      throw error;
    }
    try {
      const ticket = await oauthClient.verifyIdToken({ idToken, audience });
      return normalizeGoogleIdentityClaims(ticket.getPayload() || {});
    } catch {
      const error = new Error('Google sign-in could not be verified');
      error.status = 401;
      throw error;
    }
  };
}
