import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProfileRuntimeService,
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

test('[auth] one profile runtime drives distinct product persistence adapters', async () => {
  const calls = [];
  const runtime = createProfileRuntimeService({
    loginProviders: {
      local: async ({ identityId }) => ({
        session: { token: `token:${identityId}`, playerId: `player:${identityId}` },
        player: { id: `player:${identityId}`, displayName: 'Local Player' }
      })
    },
    adapters: {
      authenticateToken: async ({ authToken }) => ({
        session: { token: authToken, playerId: 'player:1' }
      }),
      getBootstrap: async ({ playerId }) => {
        calls.push(['bootstrap', playerId]);
        return { playerId, source: 'product-adapter' };
      },
      getProfile: async ({ playerId }) => ({ id: playerId }),
      setActiveCharacter: async ({ playerId, characterId }) => ({ playerId, activeCharacterId: characterId }),
      updateSettings: async ({ playerId, settings }) => ({ playerId, settings })
    },
    includeBootstrapOnLogin: true,
    userField: 'player'
  });

  assert.equal(runtime.contract, 'profile-runtime/v1');
  assert.deepEqual(await runtime.login('local', { identityId: 1 }), {
    token: 'token:1',
    player: { id: 'player:1', displayName: 'Local Player' },
    bootstrap: { playerId: 'player:1', source: 'product-adapter' }
  });
  assert.deepEqual(await runtime.getBootstrapForToken('token:1'), {
    playerId: 'player:1',
    source: 'product-adapter'
  });
  assert.deepEqual(await runtime.getProfile('player:1'), { id: 'player:1' });
  assert.deepEqual(await runtime.setActiveCharacter('player:1', 'hero-2'), {
    playerId: 'player:1',
    activeCharacterId: 'hero-2'
  });
  assert.deepEqual(await runtime.updateSettings('player:1', { lang: 'pt' }), {
    playerId: 'player:1',
    settings: { lang: 'pt' }
  });
  assert.deepEqual(calls, [
    ['bootstrap', 'player:1'],
    ['bootstrap', 'player:1']
  ]);
});

test('[auth] profile runtime supports session-key products without bootstrap on login', async () => {
  const runtime = createProfileRuntimeService({
    loginProviders: {
      web: async () => ({
        session: { sessionKey: 'session-1' },
        player: { id: 'player-1', telegram_id: '42', name: 'Player' }
      })
    },
    presentPlayer: shapeAuthUserProfile,
    userField: 'user'
  });

  assert.deepEqual(await runtime.login('web'), {
    sessionKey: 'session-1',
    user: { id: 'player-1', telegramId: '42', name: 'Player' }
  });
});
