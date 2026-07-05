import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createBackpackServerContext,
  createBackpackServerModule,
  setupBackpackServerModules
} from '@microwavedev/backpack-game-core/server';

test('[server] module descriptors validate dependencies and register services', () => {
  const db = { players: [] };
  const context = createBackpackServerContext({
    adapters: { db },
    services: {
      'repo.players': { find: () => null }
    }
  });
  const module = createBackpackServerModule({
    name: 'core.profile',
    requires: ['repo.players'],
    provides: ['profileService'],
    setup(ctx) {
      assert.equal(ctx.get('adapter.db'), db);
      return {
        services: {
          profileService: { bootstrap: () => ({ ok: true }) }
        },
        healthChecks: [{ name: 'profile' }]
      };
    }
  });

  const result = setupBackpackServerModules([module], context);

  assert.deepEqual(result.installed, ['core.profile']);
  assert.equal(result.get('profileService').bootstrap().ok, true);
  assert.equal(result.healthChecks[0].name, 'profile');
  assert.deepEqual(module.requires, ['repo.players']);
  assert.deepEqual(module.provides, ['profileService']);
});

test('[server] module setup fails fast for missing dependencies and provides', () => {
  assert.throws(
    () => setupBackpackServerModules([
      { name: 'core.run', requires: ['repo.runs'], setup: () => ({}) }
    ]),
    /missing dependencies: repo\.runs/
  );

  assert.throws(
    () => setupBackpackServerModules([
      { name: 'core.wallet', provides: ['walletService'], setup: () => ({}) }
    ]),
    /did not provide walletService/
  );
});

test('[server] module descriptors resolve and validate module config', () => {
  const result = setupBackpackServerModules([
    {
      name: 'core.auth',
      config: { sessionTtlMs: 1000, loginMode: 'dev' },
      validateConfig(config) {
        assert.equal(config.sessionTtlMs, 2500);
        assert.equal(config.loginMode, 'telegram');
      },
      provides: ['authService'],
      setup(ctx) {
        return {
          services: {
            authService: {
              config: ctx.getConfig('core.auth')
            }
          }
        };
      }
    }
  ], {
    config: {
      modules: {
        'core.auth': { sessionTtlMs: 2500, loginMode: 'telegram' }
      }
    }
  });

  assert.equal(result.get('config.core.auth').sessionTtlMs, 2500);
  assert.equal(result.get('authService').config.loginMode, 'telegram');
});

test('[server] module descriptors reject duplicate metadata and registrations', () => {
  assert.throws(
    () => createBackpackServerModule({ name: 'core.bad', requires: ['repo.players', 'repo.players'] }),
    /requires contains duplicate entry repo\.players/
  );
  assert.throws(
    () => createBackpackServerModule({ name: 'core.bad', provides: ['service', 'service'] }),
    /provides contains duplicate entry service/
  );
  assert.throws(
    () => createBackpackServerModule({ name: 'core.bad', requires: [''] }),
    /requires entries must be non-empty strings/
  );
  assert.throws(
    () => setupBackpackServerModules([
      { name: 'core.auth' },
      { name: 'core.auth' }
    ]),
    /core\.auth is registered more than once/
  );
});

test('[server] module setup protects existing providers unless override is explicit', () => {
  assert.throws(
    () => setupBackpackServerModules([
      {
        name: 'core.profile',
        provides: ['profileService'],
        setup: () => ({
          services: {
            profileService: { version: 2 }
          }
        })
      }
    ], {
      services: {
        profileService: { version: 1 }
      }
    }),
    /cannot override existing provider profileService/
  );

  const result = setupBackpackServerModules([
    {
      name: 'product.profile',
      allowOverride: true,
      provides: ['profileService'],
      setup: () => ({
        services: {
          profileService: { version: 2 }
        }
      })
    }
  ], {
    services: {
      profileService: { version: 1 }
    }
  });

  assert.equal(result.get('profileService').version, 2);
});
