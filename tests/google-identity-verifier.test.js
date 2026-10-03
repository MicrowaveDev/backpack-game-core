import test from 'node:test';
import assert from 'node:assert/strict';
import { createGoogleIdentityVerifier } from '../src/server/index.js';

test('Google verifier passes audience to the SDK and normalizes verified claims', async () => {
  const verify = createGoogleIdentityVerifier({ clientId: 'client.apps.googleusercontent.com', oauthClient: {
    async verifyIdToken(options) {
      assert.deepEqual(options, { idToken: 'signed-token', audience: 'client.apps.googleusercontent.com' });
      return { getPayload: () => ({ sub: '123', name: 'Player', email_verified: true }) };
    }
  } });
  assert.deepEqual(await verify(' signed-token '), { provider: 'google', subject: '123', displayName: 'Player', emailVerified: true });
});

test('Google verifier rejects missing credentials, invalid tokens and missing subject', async () => {
  for (const oauthClient of [
    { verifyIdToken: async () => { throw new Error('signature or audience mismatch'); } },
    { verifyIdToken: async () => ({ getPayload: () => ({ name: 'Untrusted' }) }) }
  ]) {
    const verify = createGoogleIdentityVerifier({ clientId: 'client', oauthClient });
    await assert.rejects(verify(''), { status: 400 });
    await assert.rejects(verify('invalid'), { status: 401 });
  }
});
