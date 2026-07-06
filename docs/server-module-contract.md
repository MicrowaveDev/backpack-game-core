# Server Module Contract

Backpack server modules are product-neutral feature descriptors. They let a
game assemble shared services from explicit dependencies while keeping storage,
credentials, provider callbacks, catalogs, product routes, and deployment
composition in the product repo.

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

Apps still decide which providers exist, which module order to use, and how
routes call the registered services.

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
