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
