# Backpack Game Core Release Discipline

`backpack-game-core` is currently consumed as a Git submodule plus local
`file:vendor/backpack-game-core` package dependency. Until registry publishing
is introduced, the Git commit SHA is the release identity.

## Current Channel

- Release channel: **submodule-only**.
- Package version: `0.1.0` remains a package metadata baseline, not the
  consumer release identity.
- Release identity: the full core Git SHA consumed by Mushroom and Meat.
- Supported consumers: `mushroom-master` and `meat-master` on their `main`
  branches.
- Publishing: no npm/GitHub package publish step is required for the current
  channel.
- Hub tracking: `backpack-game-core` stays nested under each consumer for now;
  it should become a top-level hub submodule only when independent release or
  issue tracking needs outweigh the pointer-management cost.

## Compatibility Rules

- Public exports must keep typed subpath declarations in sync with JavaScript
  export targets.
- New shared behavior should be added through explicit subpath exports instead
  of consumer deep imports.
- Existing public helpers should remain backward compatible across the current
  Mushroom and Meat `main` consumers unless the same change updates both
  adapters in one release.
- Browser-safe exports (`client`, `client-view-model`, `vue`) must not import
  Node-only modules, product files, product assets, Express/Sequelize,
  Telegram helpers, payment providers, or support/admin policy code.
- Vue is an optional peer dependency. Core Vue modules provide neutral
  props/events/slots and class hooks; product repos keep routes, copy, images,
  page shells, haptics, auth wrappers, adult-content policy, and final themes.
- Core should return pure plans, DTOs, and render contracts. Product repos own
  SQL transactions, provider callbacks, upload storage, support audit rows,
  route errors, and live operations.

## Release Order

1. Commit and push the core change to `backpack-game-core/main`.
2. Fast-forward both nested consumer submodules to the same core SHA.
3. Run the cross-consumer gate from the hub:

   ```bash
   npm run verify:backpack-core
   ```

   Set `BACKPACK_CORE_MUSHROOM_E2E_COMMAND` when the changed surface needs a
   focused Mushroom Playwright command beyond the default support-admin check.
4. Commit and push the consumer adapter/pointer changes in `mushroom-master`
   and `meat-master`.
5. Update the hub pointers for those consumers on hub `main`.

## Required Evidence

Every core release consumed by both games should have:

- core `npm test`;
- core `npm pack --dry-run`;
- `mushroom-master` `npm run game:core:check`;
- Mushroom build/unit/screenshot evidence, plus focused E2E for affected UI
  surfaces when relevant;
- `meat-master` `npm test`;
- `meat-master` `npm run build`;
- a consumer update-log row in Mushroom while that repo is the primary
  release-record owner.

## Publishing Later

Before switching away from the submodule-only channel:

- introduce semver tags that map to immutable core commits;
- define npm/GitHub package publishing credentials and provenance;
- keep a compatibility window for Mushroom and Meat to update adapters;
- update both consumers to install the published package or explicitly keep a
  submodule override for local development;
- keep the hub cross-consumer gate as the release blocker even after publishing.
