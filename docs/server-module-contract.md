# Server Module Contract

Backpack server modules are product-neutral feature descriptors. They let a
game assemble shared services, route groups, jobs, and health checks from
explicit dependencies while keeping storage, credentials, provider callbacks,
catalogs, final route mounting, and deployment composition in the product repo.

## Descriptor Shape

```js
createBackpackServerModule({
  name: 'core.profile',
  requires: ['repo.players', 'repo.sessions'],
  provides: ['profileService'],
  config: { sessionTtlMs: 3600000 },
  validateConfig(config, ctx) {
    if (!Number.isFinite(config.sessionTtlMs)) return false;
  },
  setup(ctx) {
    return {
      services: {
        profileService: createProfileService({
          players: ctx.get('repo.players'),
          sessions: ctx.get('repo.sessions'),
          config: ctx.getConfig('core.profile')
        })
      },
      routes: {
        profileRoutes: createBackpackRouteGroup({
          name: 'profileRoutes',
          prefix: '/api',
          routes: [{
            name: 'profile.bootstrap',
            method: 'get',
            path: '/bootstrap',
            handler: (req, res) => res.json({ ok: true })
          }]
        })
      }
    };
  }
});
```

Fields:

- `name`: stable module id, usually `core.<feature>` or `<product>.<feature>`.
- `requires`: registry keys that must exist before setup runs.
- `provides`: registry keys setup must create.
- `configKey`: optional key for `config.modules[configKey]`; defaults to
  `name`.
- `config`: defaults merged with `ctx.config.modules[name]` or
  `ctx.config.modules[configKey]`.
- `validateConfig`: optional guard. Returning `false` fails setup.
- `allowOverride`: opt-in escape hatch for product modules that intentionally
  replace an existing provider.

## Context Shape

`createBackpackServerContext()` accepts adapters, config, prebuilt services,
routes, jobs, and health checks. Adapters are registered as `adapter.<name>`,
while services are registered by their given key. Modules should use neutral
keys such as:

- `repo.players`
- `repo.sessions`
- `repo.runs`
- `repo.wallet`
- `repo.assets`
- `repo.gacha`
- `catalog.artifacts`
- `catalog.characters`
- `policy.auth`
- `policy.assets`
- `service.logger`
- `service.clock`
- `service.idGenerator`

Product repos own the concrete objects behind those keys.

## Route Descriptors

Core modules may expose route groups, but route groups are plain descriptors.
They do not import or own the product HTTP framework, middleware ordering,
auth attachment, rate-limit placement, static files, or final path ownership.

```js
const routes = createBackpackRouteGroup({
  name: 'runRoutes',
  prefix: '/api/game-run',
  routes: [{
    name: 'run.start',
    method: 'post',
    path: '/start',
    middleware: [requireAuth],
    handler: startRunHandler
  }]
});
```

Products mount descriptors with `bindBackpackRouteDescriptors()` or their own
adapter:

```js
bindBackpackRouteDescriptors(app, context.routes, {
  mountRoute(app, route) {
    app[route.method](route.path, ...route.handlers);
  }
});
```

This is the target path for moving most Mushroom server files: extract a
feature's service facade and route factory into core, then let Mushroom and
Meat provide repositories, catalogs, policies, and route mounting config.
Avoid moving a product's entire app bootstrap or database layer into core.

## Loader Guarantees

`setupBackpackServerModules()`:

- installs modules in the provided order;
- fails when required keys are missing;
- rejects duplicate module names;
- rejects duplicate `requires` or `provides` descriptor entries;
- resolves and validates per-module config before setup;
- blocks provider overwrite by default;
- verifies every declared `provides` key exists after setup.

These checks intentionally happen before future Mushroom or Meat services move
into core, so product-specific assumptions fail near the module boundary.

## Core Convenience Modules

The stable server facade also exposes provider-driven module factories for
low-risk shared services:

- `createAuthRouteGroup()` and `createAuthRoutesServerModule()`: build the
  provider-neutral auth/bootstrap route family over injected handlers and
  middleware. Product repos still own auth verification, sessions, player
  lookup, provider naming, public/dev/auth rate limits, and final route paths.
- `createGhostLoadoutService()`, `createServerLoadoutUtils()`,
  `createServerGachaSimulationService()`, and `createReadyManagerExports()`:
  the first physically moved server-file cluster. These expose the former
  product service shapes as provider-driven factories while product repos keep
  catalogs, characters, starter presets, image paths, runtime pack providers,
  validation policy, readiness config, and legacy response aliases local.
- `nowIso()`, `createId()`, `createShortCode()`, `createSessionKey()`,
  `normalizeLanguage()`, `createRng()`, `computeProgressLevel()`,
  `computeCharacterLevel()`, `currencyFields()`, `runCurrencyFields()`,
  `createStructuredLogger()`, and `createRequestLogger()`: the second small
  server-file cluster. Core owns neutral helper behavior and logging
  middleware shape; product repos keep legacy aliases, product-specific field
  names, and final log routing/configuration.
- `createLoadoutValidationServerModule()`: registers
  `loadoutValidationService` over injected artifact lookup, pricing, family,
  placement, and stat policy providers.
- `createRunReadinessServerModule()`: registers `runReadinessManager` over
  injected clock/config for ready-state, idle-run detection, and per-run locks.
- `createAssetGachaSimulationServerModule()`: registers
  `assetGachaSimulationService` over injected static/runtime pack, catalog,
  odds, and visibility providers.
- `createHostedCommunityClientServerModule()`: registers `communityClient`
  over a configured hosted community-server URL plus optional injected fetch,
  keeping local apps read-only for leaderboard/friends/challenge surfaces until
  products add explicit hosted write APIs.
- `createSocialPreviewCacheServerModule()`: registers
  `socialPreviewCacheService` and an optional warmup job over injected preview
  renderer, output-directory, fallback-copy, path, and logger adapters. Product
  repos still own artwork paths, copy, renderer implementation, and static-file
  serving.

Apps still decide which providers exist, which module order to use, and how
routes call the registered services.

## Quarantined Ports

Large product service files may move into explicit quarantine subpaths before
they are neutral enough for stable modules. The current quarantine is:

- `server/ports/mushroom/gameplay`: starts with `createGameRunLoadoutPort()`
  and `createArtifactFusionPort()`, the moved Mushroom game-run loadout and
  artifact-fusion services over injected query, catalog, grid, validation,
  fusion matcher, loadout row mutation, clock, and ID providers.

Rules for quarantine:

- A quarantine subpath is a migration surface, not a stable cross-game API.
- Every quarantine file must be listed in the import-boundary allowlist test.
- Product repos must keep compatibility wrappers at old paths.
- The port graduates only after table/query details, product field names,
  catalogs, route errors, and validation policy become explicit repositories or
  config providers.

## Quarantined Model Definitions

`server/models/mushroom` contains the moved Mushroom Sequelize model definition
functions and association setup. This is intentionally different from a stable
repository layer:

- Core may expose the model definitions so Mushroom and Meat can share the same
  temporary schema package while the backend is being split.
- Product repos still create the Sequelize instance, choose Postgres or SQLite,
  run sync/migrations/backfills, own transactions, and execute queries.
- The model package graduates only after product field names and table
  ownership are neutralized or replaced by repository interfaces.
- The import-boundary allowlist is the guardrail: `sequelize` imports are
  permitted only inside this explicit quarantine.

## Target App Composition

The long-term app shape should be a product-declared module list:

```js
const context = setupBackpackServerModules([
  mushroomDbModule(),
  mushroomCatalogModule(),
  coreAuthModule(),
  coreProfileModule(),
  coreRunModule(),
  coreWalletModule(),
  coreAssetsModule(),
  coreGachaModule(),
  mushroomTelegramModule(),
  mushroomPaymentsModule()
], baseContext);
```

Meat declares the same `core.*` modules with Meat repositories, catalogs,
runtime-mode config, and content policy, plus any Meat-only modules. Product
modules should be able to override or extend core providers only by declaring
`allowOverride: true`.

## Boundary Rules

Core modules may expose service factories, route handler factories, validation,
DTO shaping, and jobs/health-check descriptors over injected repositories and
policies.

Core modules must not import product repos, database models, provider SDKs,
Telegram helpers, payment webhook code, product catalogs, generated art,
support secrets, or deploy env directly.

Product apps still own final app composition, middleware ordering, auth
attachment, rate-limit policy, database lifecycle, migrations, static files,
provider callbacks, and route mounting.
