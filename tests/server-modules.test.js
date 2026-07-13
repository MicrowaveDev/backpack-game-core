import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTH_ROUTE_NAMES,
  BOT_ROUTE_NAMES,
  ASSET_ROUTE_NAMES,
  bindBackpackRouteDescriptors,
  createAssetGachaSimulationServerModule,
  createAssetRouteGroup,
  createAuthRouteGroup,
  createBotRouteGroup,
  createAuthRoutesServerModule,
  createBackpackServerContext,
  createBackpackServerModule,
  createBackpackRouteDescriptor,
  createBackpackRouteGroup,
  createGhostLoadoutService,
  createHostedCommunityClientServerModule,
  createLoadoutValidationServerModule,
  createProfileRouteGroup,
  createReadyManagerExports,
  createRunReadinessServerModule,
  createServerGachaSimulationService,
  createServerLoadoutUtils,
  createSocialPreviewCacheServerModule,
  createWikiRouteGroup,
  createWalletRouteGroup,
  flattenBackpackRouteDescriptors,
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

test('[server] auth route group builds product-configurable route descriptors', () => {
  const publicGate = (_req, _res, next) => next?.();
  const authGate = (_req, _res, next) => next?.();
  const providerLogin = () => ({ ok: true });
  const logout = () => ({ ok: true });
  const group = createAuthRouteGroup({
    prefix: '/api',
    handlers: {
      providerLogin,
      logout
    },
    middleware: {
      public: publicGate,
      auth: authGate
    },
    routes: {
      providerLogin: { path: '/auth/provider' },
      logout: { path: '/auth/logout' }
    }
  });

  const routes = flattenBackpackRouteDescriptors([group]);
  assert.deepEqual(routes.map((route) => route.name), [
    AUTH_ROUTE_NAMES.logout,
    AUTH_ROUTE_NAMES.providerLogin
  ]);
  assert.equal(routes[0].path, '/api/auth/logout');
  assert.deepEqual(routes[0].handlers, [authGate, logout]);
  assert.equal(routes[1].path, '/api/auth/provider');
  assert.deepEqual(routes[1].handlers, [publicGate, providerLogin]);
  assert.equal(routes[1].meta.feature, 'auth');
  assert.equal(routes[1].meta.routeKey, 'providerLogin');
});

test('[server] bot and wiki route groups preserve product handlers and access middleware', () => {
  const authGate = () => {};
  const webhookGate = () => {};
  const discovery = () => {};
  const score = () => {};
  const botRoutes = flattenBackpackRouteDescriptors([createBotRouteGroup({
    handlers: { discovery, gameScore: score },
    middleware: { auth: authGate, webhook: webhookGate }
  })]);
  assert.deepEqual(botRoutes.map((route) => route.name), [
    BOT_ROUTE_NAMES.discovery,
    BOT_ROUTE_NAMES.gameScore
  ]);
  assert.deepEqual(botRoutes[1].handlers, [authGate, score]);

  const home = () => {};
  const entry = () => {};
  const wikiRoutes = flattenBackpackRouteDescriptors([createWikiRouteGroup({
    home,
    entries: [{ section: 'characters', handler: entry }]
  })]);
  assert.deepEqual(wikiRoutes.map((route) => route.path), [
    '/api/wiki/home',
    '/api/wiki/characters/:slug'
  ]);
  assert.equal(wikiRoutes[1].meta.section, 'characters');
});

test('[server] profile, wallet, and asset route groups compose access-specific middleware', () => {
  const auth = () => {};
  const mutation = () => {};
  const purchase = () => {};
  const handler = () => {};
  const groups = [
    createProfileRouteGroup({ handlers: { profile: handler }, middleware: { auth } }),
    createWalletRouteGroup({ handlers: { state: handler }, middleware: { auth } }),
    createAssetRouteGroup({
      handlers: { catalog: handler, roll: handler, purchase: handler },
      middleware: { auth, mutation, purchase }
    })
  ];
  const routes = flattenBackpackRouteDescriptors(groups);
  assert.deepEqual(routes.map((route) => route.name), [
    'profile.get',
    'wallet.state',
    ASSET_ROUTE_NAMES.catalog,
    ASSET_ROUTE_NAMES.roll,
    ASSET_ROUTE_NAMES.purchase
  ]);
  assert.deepEqual(routes[3].handlers, [mutation, handler]);
  assert.deepEqual(routes[4].handlers, [purchase, handler]);
});

test('[server] auth route module resolves handlers and middleware from providers', () => {
  const devGate = () => {};
  const devLogin = () => ({ ok: true });
  const installed = setupBackpackServerModules([
    createAuthRoutesServerModule({
      providerKeys: {
        handlers: {
          devLogin: 'handler.auth.devLogin'
        },
        middleware: {
          dev: 'middleware.auth.dev'
        }
      },
      routes: {
        devLogin: { path: '/auth/dev-session' }
      }
    })
  ], {
    services: {
      'handler.auth.devLogin': devLogin,
      'middleware.auth.dev': devGate
    }
  });

  assert.deepEqual(installed.installed, ['core.authRoutes']);
  const routes = flattenBackpackRouteDescriptors(installed.routes);
  assert.equal(routes.length, 1);
  assert.equal(routes[0].name, AUTH_ROUTE_NAMES.devLogin);
  assert.equal(routes[0].path, '/api/auth/dev-session');
  assert.deepEqual(routes[0].handlers, [devGate, devLogin]);
});

test('[server] moved loadout utils build a provider-backed validator', () => {
  const artifacts = new Map([
    ['bag', { id: 'bag', family: 'bag', width: 2, height: 2, price: 1 }],
    ['blade', { id: 'blade', family: 'damage', width: 1, height: 1, price: 2, bonus: { damage: 1 } }]
  ]);
  const utils = createServerLoadoutUtils({
    gridWidth: 4,
    gridHeight: 4,
    defaultCoinBudget: 5,
    maxStunChance: 40,
    getArtifact: (id) => artifacts.get(id),
    getArtifactPrice: (artifact) => artifact.price,
    isBag: (artifact) => artifact?.family === 'bag',
    isContainerItem: (item) => Number(item.x) < 0 || Number(item.y) < 0,
    contributesStats: (artifact, item) => artifact?.family !== 'bag' && Number(item?.x) >= 0 && Number(item?.y) >= 0
  });

  assert.equal(typeof utils.validateLoadoutItems, 'function');
  const result = utils.validateLoadoutItems([
    { artifactId: 'bag', x: 0, y: 0, width: 2, height: 2, active: true },
    { artifactId: 'blade', x: 0, y: 0, width: 1, height: 1 }
  ]);
  assert.equal(result.totalCoins, 3);
  assert.equal(result.totals.damage, 1);
});

test('[server] moved gacha simulation service delegates through injected providers', async () => {
  const pack = { id: 'pack_1', active: true, rollSize: 1, items: [{ assetId: 'skin_1', rarity: 'common', dropWeight: 1 }] };
  const catalog = [{ assetId: 'skin_1', rarity: 'common' }];
  const service = createServerGachaSimulationService({
    getStaticPack: () => pack,
    getStaticCatalog: () => catalog,
    getStaticPackOdds: () => ({ common: 1 }),
    getRuntimePack: () => ({ ...pack, source: 'runtime' }),
    getRuntimeCatalog: () => catalog,
    shapeRuntimePackOdds: (runtimePack, context) => ({ id: runtimePack.id, context })
  });

  const staticResult = service.simulateAssetPackOdds('pack_1', { trials: 1, rng: () => 0 });
  assert.equal(staticResult.packId, 'pack_1');
  const runtimeResult = await service.simulateRuntimeAssetPackOdds('pack_1', { planAssetVisibility: 'review' });
  assert.equal(runtimeResult.packId, 'pack_1');
  assert.equal(runtimeResult.source, 'runtime');
});

test('[server] moved ready manager exports configured readiness helpers', () => {
  const ready = createReadyManagerExports({ requiredReadyCount: 1 });
  ready.setReady('run_1', 'player_1');
  assert.equal(ready.isReady('run_1', 'player_1'), true);
  assert.deepEqual(ready.areBothReady('run_1'), { ready: true, playerIds: ['player_1'] });
  assert.equal(typeof ready.withRunLock, 'function');
});

test('[server] moved ghost loadout service is product-data driven', () => {
  const artifacts = [
    { id: 'starter_bag', family: 'bag', width: 2, height: 2, price: 0 },
    { id: 'blade', family: 'damage', width: 1, height: 1, price: 1, bonus: { damage: 1 } }
  ];
  const characters = [{ id: 'hero_1', affinity: { strong: ['damage'], medium: [], weak: [] } }];
  const service = createGhostLoadoutService({
    artifacts,
    characters,
    getArtifactById: (id) => artifacts.find((artifact) => artifact.id === id),
    getArtifactPrice: (artifact) => artifact.price,
    getStarterPreset: () => [],
    getStarterPresetCost: () => 0,
    gridColumns: 4,
    gridRows: 4,
    defaultBudget: 3,
    createRng: () => () => 0.1,
    isBag: (artifact) => artifact?.family === 'bag',
    validateLoadout: () => ({ valid: true }),
    imagePathForCharacter: (characterId) => `/characters/${characterId}.png`
  });

  const snapshot = service.createBotGhostSnapshot('seed');
  assert.equal(snapshot.characterId, 'hero_1');
  assert.equal(snapshot.imagePath, '/characters/hero_1.png');
  assert.ok(snapshot.loadout.items.length >= 1);
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
