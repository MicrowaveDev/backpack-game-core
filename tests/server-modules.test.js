import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bindBackpackRouteDescriptors,
  createAssetGachaSimulationServerModule,
  createBackpackServerContext,
  createBackpackServerModule,
  createBackpackRouteDescriptor,
  createBackpackRouteGroup,
  flattenBackpackRouteDescriptors,
  createHostedCommunityClientServerModule,
  createLoadoutValidationServerModule,
  createRunReadinessServerModule,
  createSocialPreviewCacheServerModule,
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

test('[server] route descriptors are framework-neutral and bind through adapters', () => {
  const auth = (_req, _res, next) => next?.();
  const handler = () => ({ ok: true });
  const descriptor = createBackpackRouteDescriptor({
    name: 'profile.bootstrap',
    method: 'GET',
    path: 'bootstrap',
    middleware: [auth],
    handler,
    meta: { auth: true }
  });
  assert.equal(descriptor.method, 'get');
  assert.equal(descriptor.path, '/bootstrap');
  assert.deepEqual(descriptor.handlers, [auth, handler]);

  const group = createBackpackRouteGroup({
    name: 'profileRoutes',
    prefix: '/api/profile',
    routes: [descriptor],
    meta: { area: 'profile' }
  });
  const flattened = flattenBackpackRouteDescriptors([group], { prefix: '/v1' });
  assert.equal(flattened[0].path, '/v1/api/profile/bootstrap');
  assert.equal(flattened[0].meta.area, 'profile');
  assert.equal(flattened[0].meta.auth, true);
  assert.equal(flattened[0].meta.groupName, 'profileRoutes');

  const mounted = [];
  const returned = bindBackpackRouteDescriptors({}, [group], {
    prefix: '/v1',
    mountRoute(target, route) {
      assert.ok(target);
      mounted.push(route);
    }
  });
  assert.deepEqual(returned, mounted);
  assert.equal(mounted[0].method, 'get');
});

test('[server] route descriptors can be provided by modules', () => {
  const handler = () => ({ ok: true });
  const result = setupBackpackServerModules([
    {
      name: 'core.profileRoutes',
      provides: ['routes.profile'],
      setup() {
        return {
          routes: {
            'routes.profile': createBackpackRouteGroup({
              name: 'profileRoutes',
              prefix: '/api',
              routes: [{
                name: 'profile.bootstrap',
                method: 'get',
                path: '/bootstrap',
                handler
              }]
            })
          }
        };
      }
    }
  ]);

  assert.deepEqual(result.installed, ['core.profileRoutes']);
  assert.equal(result.get('routes.profile'), result.routes['routes.profile']);
  assert.equal(flattenBackpackRouteDescriptors(result.routes)[0].path, '/api/bootstrap');
});

test('[server] route descriptors reject incomplete routes', () => {
  assert.throws(
    () => createBackpackRouteDescriptor({ name: 'bad', method: 'trace', path: '/bad', handler: () => {} }),
    /method is not supported/
  );
  assert.throws(
    () => createBackpackRouteDescriptor({ name: 'bad', method: 'get', path: '/bad' }),
    /requires at least one handler/
  );
  assert.throws(
    () => createBackpackRouteGroup({ name: '', routes: [] }),
    /route group requires a name/
  );
});

test('[server] gacha simulation module registers provider-driven service', () => {
  const pack = {
    id: 'server_pack',
    active: true,
    rollSize: 1,
    items: [{ assetId: 'skin.common', rarity: 'common', dropWeight: 1 }]
  };
  const catalog = [{ assetId: 'skin.common', rarity: 'common' }];
  const result = setupBackpackServerModules([
    createAssetGachaSimulationServerModule({
      providerKeys: {
        getStaticPack: 'service.gacha.getStaticPack',
        getStaticCatalog: 'service.gacha.getStaticCatalog',
        getStaticPackOdds: 'service.gacha.getStaticPackOdds'
      }
    })
  ], {
    services: {
      'service.gacha.getStaticPack': (packId) => packId === 'server_pack' ? pack : null,
      'service.gacha.getStaticCatalog': () => catalog,
      'service.gacha.getStaticPackOdds': () => ({ active: true })
    }
  });

  assert.deepEqual(result.installed, ['core.gachaSimulation']);
  const service = result.get('assetGachaSimulationService');
  assert.equal(service.simulateAssetPackOdds('server_pack', { trials: 1, rng: () => 0 }).packId, 'server_pack');
});

test('[server] loadout validation module registers provider-driven service', () => {
  const catalog = new Map([
    ['starter_bag', { id: 'starter_bag', family: 'bag', width: 2, height: 2, price: 0, bonus: {} }],
    ['cleaver', { id: 'cleaver', family: 'damage', width: 1, height: 1, price: 3, bonus: { damage: 2 } }]
  ]);
  const result = setupBackpackServerModules([
    createLoadoutValidationServerModule({
      providerKeys: {
        getArtifact: 'service.loadout.getArtifact',
        getArtifactPrice: 'service.loadout.getArtifactPrice',
        isBag: 'service.loadout.isBag',
        isContainerItem: 'service.loadout.isContainerItem',
        contributesStats: 'service.loadout.contributesStats'
      },
      config: {
        gridWidth: 3,
        gridHeight: 3,
        defaultCoinBudget: 5
      }
    })
  ], {
    services: {
      'service.loadout.getArtifact': (artifactId) => catalog.get(artifactId),
      'service.loadout.getArtifactPrice': (artifact) => artifact.price,
      'service.loadout.isBag': (artifact) => artifact?.family === 'bag',
      'service.loadout.isContainerItem': (item) => Number(item.x) < 0 || Number(item.y) < 0,
      'service.loadout.contributesStats': (artifact, item, { isBag, isContainerItem }) => (
        !!artifact && !isBag(artifact) && !isContainerItem(item)
      )
    }
  });

  assert.deepEqual(result.installed, ['core.loadoutValidation']);
  const service = result.get('loadoutValidationService');
  assert.equal(service.validateLoadoutItems([
    { id: 'row_bag', artifactId: 'starter_bag', x: 0, y: 0, width: 2, height: 2, active: 1 },
    { id: 'row_item', artifactId: 'cleaver', x: 0, y: 0, width: 1, height: 1 }
  ]).totalCoins, 3);
});

test('[server] run readiness module registers configurable manager', () => {
  let clock = 1000;
  const result = setupBackpackServerModules([
    createRunReadinessServerModule({
      providerKeys: {
        now: 'service.clock.now'
      },
      config: {
        requiredReadyCount: 2
      }
    })
  ], {
    services: {
      'service.clock.now': () => clock
    }
  });

  assert.deepEqual(result.installed, ['core.runReadiness']);
  const manager = result.get('runReadinessManager');
  manager.setReady('run_1', 'player_1');
  manager.setReady('run_1', 'player_2');
  assert.deepEqual(manager.readyStatus('run_1'), {
    ready: true,
    playerIds: ['player_1', 'player_2']
  });
  clock += 5000;
  assert.deepEqual(manager.getIdleRunIds(4000), ['run_1']);
});

test('[server] hosted community module registers a configurable client', async () => {
  let requestedUrl = null;
  const result = setupBackpackServerModules([
    createHostedCommunityClientServerModule({
      providerKeys: {
        fetchImpl: 'service.fetch'
      },
      config: {
        runtimeMode: 'local',
        communityServerUrl: 'https://community.example.test',
        surfaces: {
          friends: true
        }
      }
    })
  ], {
    services: {
      'service.fetch': async (url) => {
        requestedUrl = String(url);
        return {
          ok: true,
          json: async () => ({ data: [{ id: 'ranked-player' }] })
        };
      }
    }
  });

  assert.deepEqual(result.installed, ['core.hostedCommunity']);
  const client = result.get('communityClient');
  assert.equal(client.status().surfaces.friends, true);
  assert.deepEqual(await client.leaderboard(), {
    available: true,
    source: 'hosted',
    entries: [{ id: 'ranked-player' }]
  });
  assert.equal(requestedUrl, 'https://community.example.test/api/leaderboard');
});

test('[server] social preview cache module registers a service and job', async () => {
  const rendered = [];
  const result = setupBackpackServerModules([
    createSocialPreviewCacheServerModule({
      providerKeys: {
        renderPreview: 'service.preview.render',
        ensureOutputDirectory: 'service.preview.ensureDir',
        copyFallback: 'service.preview.copyFallback'
      },
      config: {
        renderOptions: {
          title: 'Core Consumer',
          out: '/tmp/social-preview.jpg'
        },
        jobName: 'warmSocialPreview'
      }
    })
  ], {
    services: {
      'service.preview.render': async (options) => {
        rendered.push(options);
      },
      'service.preview.ensureDir': async ({ outputPath }) => {
        rendered.push({ ensureDir: outputPath });
      },
      'service.preview.copyFallback': async () => false
    }
  });

  assert.deepEqual(result.installed, ['core.socialPreviewCache']);
  assert.equal(result.jobs[0].name, 'warmSocialPreview');
  const service = result.get('socialPreviewCacheService');
  const cacheResult = await service.ensureSocialPreviewCache();
  assert.equal(cacheResult.outcome, 'generated');
  assert.deepEqual(rendered, [
    { ensureDir: '/tmp/social-preview.jpg' },
    { title: 'Core Consumer', out: '/tmp/social-preview.jpg' }
  ]);

  rendered.length = 0;
  await result.jobs[0].run({ title: 'Override' });
  assert.deepEqual(rendered, [
    { ensureDir: '/tmp/social-preview.jpg' },
    { title: 'Override', out: '/tmp/social-preview.jpg' }
  ]);
});
