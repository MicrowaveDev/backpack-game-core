# First-Run Tutorial Plan

## Status

- Implemented on 2026-08-02. This document is now a historical ship record;
  the `Backlog` section is the authoritative list of tutorial work that remains.
- Canonical owner: `backpack-game-core`.
- Consumers: Mushroom Master and Meat Master.
- Initial languages: English and Russian.
- Initial production target: hosted Telegram/web.

## Implementation Record

- Core owns the tutorial reducer, localized step DTOs, browser controller,
  popup component, settings replay control, styles, and public package exports.
- Core gameplay adapters emit semantic preparation and round-result events;
  product adapters supply catalogs, authoritative run values, and persistence.
- Mushroom stores tutorial preferences in profile settings through its
  Sequelize-backed player service and `tutorial_json` compatibility column.
- Meat stores the same normalized profile setting in hosted and local modes.
- Both products mount the same core popup, expose the same one-time Settings
  replay control, and reset the in-memory controller after a Settings save.
- Core tests cover ordering, deduplication, dismissal, skip-all, persistence
  failures, EN/RU copy, pluralization, and one-time replay consumption.
- Consumer tests cover defaults, partial settings updates, persisted skip,
  current-session replay scheduling, replay consumption, and the playable
  preparation/replay/run-complete journey.

## Goal

Teach a player who has never played a backpack game or an auto-battler what
they are expected to do during their first run.

The tutorial must explain, in simple words:

1. The player builds a backpack before each battle.
2. Bags add usable cells to the backpack.
3. Artifacts work automatically during battle; the player does not press or
   activate them.
4. After a round, the player can see the result, remaining lives, and how many
   rounds remain in the run.
5. Every popup can dismiss the current explanation or skip the entire tutorial.
6. Settings can schedule the tutorial to run once more on the player's next
   run.

The tutorial must not fork into separate Mushroom and Meat implementations.
Core owns the state machine, trigger rules, popup component, settings control,
and persistence contract. Products provide content terminology, runtime data,
theme tokens, and optional localized copy overrides.

## UX Rules

- Show one short idea per popup.
- Never interrupt an active battle animation.
- Show a popup only after the relevant screen and data are stable.
- Do not hide the game permanently behind a tutorial sequence. The player can
  close the current popup, continue playing, or skip all future tutorial
  popups.
- Every popup has:
  - a clear title;
  - two or three short sentences at most;
  - one primary `Got it` / `Понятно` action;
  - one `Skip tutorial` / `Пропустить обучение` action.
- `Skip tutorial` suppresses every remaining popup and persists that choice.
- Closing only the current popup marks that step as seen and allows later
  contextual steps to appear.
- Keyboard focus stays inside the popup. Escape closes the current step but
  does not skip the whole tutorial.
- The popup respects reduced-motion settings and Telegram safe areas.
- On mobile, actions remain visible without scrolling and do not cover the
  backpack, shop price, or round result being explained.

## Tutorial Steps

### Step 1: What The Player Does

**Trigger:** the first playable preparation screen of the first run, after the
run and shop have loaded.

**English**

- Title: `Build your backpack`
- Body: `Choose items from the shop and place them in your backpack. When you are ready, start the battle.`

**Russian**

- Title: `Собери рюкзак`
- Body: `Выбирай предметы в магазине и размещай их в рюкзаке. Когда будешь готов, начинай бой.`

### Step 2: Artifacts Fight Automatically

**Trigger:** the first time a tutorial-eligible combat artifact is visible in
the shop or starter inventory. If Step 1 is still open, queue this step rather
than stacking popups.

**English**

- Title: `Items work automatically`
- Body: `You do not use items during battle. Their damage, armor, speed, and other effects work automatically.`

**Russian**

- Title: `Предметы работают сами`
- Body: `Во время боя не нужно нажимать на предметы. Урон, броня, скорость и другие эффекты срабатывают автоматически.`

Product dictionaries may replace `items` with the product's established
player-facing term, but must not expose internal names such as `artifactId`,
`stunChance`, or `loadout`.

### Step 3: Bags Add Space

**Trigger:** the first time a purchasable bag appears in the shop. Do not show
this step for the always-present starter bag unless no purchasable bag can
appear in the product.

**English**

- Title: `Bags add space`
- Body: `A bag opens more cells for your items. Buy it, then place it where it fits without covering another bag.`

**Russian**

- Title: `Сумки добавляют место`
- Body: `Сумка открывает новые клетки для предметов. Купи её и размести так, чтобы она не перекрывала другую сумку.`

The product may optionally provide a bag icon or the actual offered bag image.
The trigger must use artifact capability/family metadata, not Mushroom- or
Meat-specific IDs.

### Step 4: Round Result And Run Progress

**Trigger:** after the first completed round, when replay/result animation has
finished and the next stable result or preparation screen is visible.

The popup uses live values supplied in the event payload. It must never derive
remaining rounds from labels or hard-coded game balance.

**English**

- Win title: `Round won`
- Loss title: `Round lost`
- Body with rounds remaining: `You have {lives} {lifeWord} left. {rounds} {roundWord} remain in this run.`
- Body when this was the last round: `You have {lives} {lifeWord} left. That was the last round of this run.`

**Russian**

- Win title: `Раунд выигран`
- Loss title: `Раунд проигран`
- Body with rounds remaining: `Осталось жизней: {lives}. До конца забега: {rounds} {roundWord}.`
- Body when this was the last round: `Осталось жизней: {lives}. Это был последний раунд забега.`

Core owns plural selection for `life/lives`, `round/rounds`, and Russian round
forms. Products supply:

- `outcome`;
- `livesRemaining`;
- `completedRounds`;
- `maxRounds`;
- `roundsRemaining`, when the server already returns it;
- `runEnded` and `endReason`.

If the run ended because no lives remain, the final result screen takes
priority and this tutorial step is not shown as a misleading intermediate
popup.

## Core Architecture

### Pure Tutorial Domain

Add `src/modules/tutorial/` and export it as
`@microwavedev/backpack-game-core/modules/tutorial`.

Core domain responsibilities:

- declare stable step IDs and the current tutorial revision;
- normalize persisted tutorial preferences;
- decide whether a tutorial session should start;
- accept semantic events and return the next eligible step;
- enforce ordering, deduplication, and popup priority;
- mark a step seen, dismiss the current step, complete the flow, or skip all;
- compute one-time replay consumption;
- format neutral interpolation and plural values without importing product
  stores, endpoints, or locale files.

Suggested public API:

```js
createTutorialSession(options)
reduceTutorialEvent(session, event)
dismissTutorialStep(session, stepId)
skipTutorial(session)
completeTutorial(session)
normalizeTutorialPreferences(value)
scheduleTutorialReplay(value)
consumeTutorialReplay(value)
```

Suggested semantic events:

```text
prep_ready
shop_offer_visible
artifact_available
bag_offer_visible
round_completed
run_completed
route_left
```

Events contain data, not rendered copy. For example, `round_completed` carries
the round outcome and authoritative run progress values.

### Client Controller And View Models

Add a browser-safe controller under `src/client/tutorial/` or the nearest
existing client application domain. It should:

- own the active popup queue for the current browser session;
- translate gameplay and route state into semantic tutorial events;
- expose `activeStep`, `dismissCurrent`, and `skipAll`;
- call an injected settings service when persisted state changes;
- prevent duplicate popups after refresh, reconnect, or repeated bootstrap;
- survive navigation between prep, replay, result, and settings screens;
- fail open: a persistence error must not block gameplay.

Provide a pure DTO shaper so Vue components receive resolved title, body,
image/icon, button labels, and accessibility labels.

### Shared Vue UI

Add a reusable component under `src/vue/components/`, for example
`TutorialPopup`.

Core owns:

- modal semantics, focus management, backdrop, and close behavior;
- stable structural classes;
- responsive layout and safe-area handling;
- primary dismiss and secondary skip events;
- optional contextual image/icon slot;
- reduced-motion behavior.

Do not create one popup component per tutorial step. The component renders a
step DTO from the core controller.

Integrate the popup once at the shared application/gameplay shell level so
products do not duplicate it on every page. The shell should render at most one
tutorial popup at a time.

### Shared Settings UI

Extend the core `SettingsScreen` with a tutorial replay control.

Recommended UI:

- Toggle label: `Show tutorial on next run` / `Показать обучение в следующем забеге`
- Supporting state: `The tutorial will be shown once.` / `Обучение будет показано один раз.`

The control emits a neutral event such as
`update:tutorial-replay-pending`. Saving Settings persists the value through
the existing settings service. Turning it on does not immediately open tutorial
popups inside Settings; it schedules one complete tutorial session for the next
new run.

After that session begins, core consumes the pending flag immediately. The
tutorial therefore runs once even if the player completes it, skips it, closes
the browser, or starts another run later.

## Persistence Contract

Store tutorial state on the user profile, not per character and not only in
browser local storage.

Suggested normalized settings shape:

```json
{
  "tutorial": {
    "versionSeen": 0,
    "disabled": false,
    "replayPending": false,
    "seenStepIds": []
  }
}
```

Rules:

- A new player with no state is eligible for the current tutorial.
- Completing all steps sets `versionSeen` to the current revision.
- Skipping sets `disabled: true`, records the current revision, and prevents
  future automatic tutorial versions unless product policy explicitly changes.
- Closing a single popup adds only that step to `seenStepIds`.
- Enabling the Settings control sets `replayPending: true` and clears
  `disabled` for the scheduled session.
- Starting the scheduled session consumes `replayPending` before showing the
  first popup.
- A completed player does not see the same revision again unless replay was
  scheduled.
- Anonymous/local development may mirror state in local storage through an
  adapter, but authenticated server profile state is authoritative.

Core provides normalization and transition planning only. Each product owns
its persistence implementation and migration:

- Mushroom: extend profile settings read/write and PostgreSQL schema/migration.
- Meat: extend its profile settings DTO plus JSON development store and
  Sequelize-backed PostgreSQL/SQLite snapshot representations.
- Both: preserve tutorial settings through login, refresh, and profile updates.

## Product Integration

### Mushroom Master

- Mount the core controller at the shared game application level.
- Emit tutorial events from the existing prep/shop/run lifecycle after state is
  stable.
- Pass authoritative Mushroom run limits and lives to `round_completed`.
- Extend the existing core Settings wrapper with tutorial replay state.
- Add EN/RU labels to the Mushroom locale dictionary only where product terms
  differ from core defaults.

### Meat Master

- Mount the same core controller in the configured application/gameplay shell.
- Use artifact family/capability metadata to identify bags and combat items.
- Pass authoritative Meat run limits and lives to `round_completed`.
- Extend the existing core Settings wrapper with the same replay setting.
- Add EN/RU labels to the Meat locale dictionary only where product terms
  differ from core defaults.

Neither product may implement its own tutorial queue, popup state machine, or
step-seen rules.

## Implementation Phases

### Phase 1: Core Domain And Copy Contract

1. Add the tutorial module, types, exports, revision, step IDs, state reducer,
   preference normalization, and one-time replay transitions.
2. Add default EN/RU dictionaries and interpolation/plural helpers.
3. Add unit tests for ordering, deduplication, skip, per-step dismissal,
   completion, replay consumption, and refresh-safe restoration.

### Phase 2: Shared Client And Vue UI

1. Add the tutorial controller and step DTO shaper.
2. Add `TutorialPopup` with focus, keyboard, mobile, safe-area, and
   reduced-motion behavior.
3. Mount it in the shared shell/configured gameplay integration point.
4. Extend core `SettingsScreen` with the one-time replay control.
5. Add component and controller tests, including no stacked popups.

### Phase 3: Persistence Adapters

1. Add tutorial settings to Mushroom's profile settings schema, migration,
   bootstrap DTO, update endpoint, and client save flow.
2. Add the same normalized shape to Meat's profile settings, hosted and local
   stores, bootstrap DTO, and settings save flow.
3. Ensure partial settings updates do not erase tutorial state.
4. Add migration/default tests for existing users and new users.

### Phase 4: Gameplay Triggers

1. Wire `prep_ready` after first-run preparation is rendered.
2. Wire artifact explanation from capability/family data.
3. Wire bag explanation when a purchasable bag first appears.
4. Wire round progress after replay/result completion using authoritative
   values.
5. Prevent tutorial rendering during battle animation, loading, authentication,
   or terminal run-summary transitions.

### Phase 5: Consumer Parity And Visual QA

1. Run core tests and package checks.
2. Pin the same core commit in Mushroom and Meat.
3. Add equivalent browser journeys for a fresh user in both languages.
4. Verify skip from every step, refresh behavior, and one-time replay from
   Settings.
5. Capture desktop and mobile screenshots in both products and verify no popup
   overlap with navigation, shop actions, Telegram safe areas, or result text.

## Acceptance Criteria

- A fresh user sees the tutorial during the first run only.
- Tutorial guidance is shown as a compact non-blocking coachmark beside the
  backpack, relevant shop item, or run HUD instead of a full-screen modal.
- A player understands that they arrange items but do not control the battle
  directly.
- The bag popup appears only when a bag is relevant and explains that it adds
  usable cells.
- The post-round popup displays correct live values for lives and remaining
  rounds in both games.
- English and Russian are complete and contain no internal camelCase names.
- Every popup offers `Skip tutorial`, which suppresses all remaining steps and
  persists across devices after login.
- Closing one popup does not disable later contextual steps.
- Settings can schedule exactly one future tutorial session.
- Starting that session consumes the setting so it cannot repeat forever.
- No popup appears over an active replay or battle animation.
- Mushroom and Meat import the same core state machine and popup component.
- Product code contains only adapters, event payload construction, product
  labels, persistence wiring, and theme configuration.
- Core unit/component tests and both consumer browser journeys pass against the
  same pinned core commit.

## Backlog

- Audio narration and screen-reader verbosity modes.
- Additional languages.
- Telemetry for step completion and abandonment, with product-controlled
  consent and privacy policy.
- Tutorial revisions for future mechanics such as fusion, gacha, trading, and
  profile currency.
- Optional practice battle with deterministic shop contents.
