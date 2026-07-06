import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shapeAuthLogoutResult,
  shapeAuthSessionResult,
  shapeAuthUserProfile
} from '../src/modules/auth/index.js';

test('[auth] shapes public auth user profiles from product rows', () => {
  assert.deepEqual(shapeAuthUserProfile({
    id: 'player_1',
    telegram_id: '42',
    telegram_username: 'button',
    name: 'Button',
    lang: 'en'
  }), {
    id: 'player_1',
    telegramId: '42',
    telegramUsername: 'button',
    name: 'Button',
    lang: 'en'
  });

  assert.deepEqual(shapeAuthUserProfile({
    id: 'dev:1',
    displayName: 'Dev Player'
  }, {
    extra: { activeCharacterId: 'sienna' }
  }), {
    id: 'dev:1',
    name: 'Dev Player',
    activeCharacterId: 'sienna'
  });
});

test('[auth] shapes session payloads for session-key and bearer-token apps', () => {
  assert.deepEqual(shapeAuthSessionResult({
    session: { sessionKey: 'session_1' },
    user: { id: 'player_1' }
  }), {
    sessionKey: 'session_1',
    user: { id: 'player_1' }
  });

  assert.deepEqual(shapeAuthSessionResult({
    token: 'token_1',
    player: { id: 'dev:1' },
    bootstrap: { activeRun: null },
    userField: 'player'
  }), {
    token: 'token_1',
    player: { id: 'dev:1' },
    bootstrap: { activeRun: null }
  });
});

test('[auth] shapes logout acknowledgements', () => {
  assert.deepEqual(shapeAuthLogoutResult(), { loggedOut: true });
  assert.deepEqual(shapeAuthLogoutResult({ loggedOut: false }), { loggedOut: false });
});
