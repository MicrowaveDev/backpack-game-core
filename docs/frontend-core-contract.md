# Frontend Core Contract

`backpack-game-core` may expose browser-safe DTO helpers, headless state
helpers, and neutral Vue component primitives. Product repos own page shells,
themes, routes, copy, haptics, images, payment UX, and policy.

## Public Vue Exports

- `@microwavedev/backpack-game-core/vue`
- `@microwavedev/backpack-game-core/vue/components`

The root package export stays framework-neutral. Vue components are plain Vue 3
option objects so the core package does not require a build step.

## Peer Dependency

Vue 3 is an optional peer dependency. Consumers that render the Vue components
must provide Vue; consumers that only use mechanics or DTO helpers do not need
Vue installed.

## Component Rules

- Components accept DTOs shaped by `client-view-model` helpers.
- Components emit neutral product-agnostic events such as `roll`, `burn`,
  `select`, `buy`, `place`, `remove`, or `open`.
- Components may expose slots for product copy, visuals, and per-row rendering.
- Components may ship minimal structural markup and optional class hooks.
- Product repos own final CSS, responsive page layout, route callbacks,
  localization, image resolvers, Telegram wrappers, haptics, and policy.

## Forbidden Imports

Core client/Vue exports must not import product repos, product assets, Express,
Sequelize, Telegram helpers, payment provider SDKs/webhook code, or Node-only
modules from browser-safe entry points.

## Validation

Each shared frontend slice should include:

- core package export/type tests;
- core component smoke or render tests;
- Mushroom adoption evidence, including screenshots when visual behavior
  changes;
- Meat import/build/test evidence against the same core commit.
