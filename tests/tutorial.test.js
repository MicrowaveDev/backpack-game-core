import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TUTORIAL_VERSION,
  createArtifactBoughtTutorialEvent,
  createArtifactPlacedTutorialEvents,
  createBagBoughtTutorialEvent,
  createPrepTutorialEvents,
  createRoundTutorialEvent,
  createTutorialSession,
  dismissTutorialStep,
  normalizeTutorialPreferences,
  reduceTutorialEvent,
  scheduleTutorialReplay,
  skipTutorial,
  tutorialStepView
} from '../src/modules/tutorial/index.js';
import { createTutorialController } from '../src/client/tutorial/index.js';
import { TutorialPopup } from '../src/vue/components/TutorialPopup.js';
import { SettingsScreen } from '../src/vue/pages/SettingsScreen.js';

test('the first-run tutorial advances from buying to placing to automatic battle use', () => {
  let session = createTutorialSession();
  session = reduceTutorialEvent(session, { type: 'prep_ready' });
  assert.equal(session.activeStepId, 'build_backpack');

  session = reduceTutorialEvent(session, { type: 'artifact_bought', artifactId: 'sword' });
  assert.equal(session.activeStepId, 'place_artifact');
  assert.deepEqual(session.preferences.seenStepIds, ['build_backpack']);

  session = reduceTutorialEvent(session, { type: 'artifact_placed', artifactId: 'sword' });
  assert.equal(session.activeStepId, 'automatic_artifacts');
  assert.deepEqual(session.preferences.seenStepIds, ['build_backpack', 'place_artifact']);

  session = dismissTutorialStep(session);
  session = reduceTutorialEvent(session, {
    type: 'additional_artifact_bought',
    artifactId: 'shield',
    coinsRemaining: 1
  });
  assert.equal(session.activeStepId, 'coin_balance');
});

test('skip permanently suppresses remaining steps', () => {
  let session = reduceTutorialEvent(createTutorialSession(), { type: 'prep_ready' });
  session = skipTutorial(session);
  assert.equal(session.active, false);
  assert.equal(session.preferences.disabled, true);
  assert.equal(session.preferences.versionSeen, TUTORIAL_VERSION);
  assert.equal(reduceTutorialEvent(session, { type: 'bag_offer_visible' }), session);
});

test('one-time replay clears disabled state and is consumed when the controller receives its first event', async () => {
  const saved = [];
  const preferences = scheduleTutorialReplay({ disabled: true, versionSeen: TUTORIAL_VERSION });
  const state = {};
  const controller = createTutorialController({
    preferences,
    state,
    persistPreferences: async (value) => saved.push(value)
  });
  assert.equal(state.preferences.replayPending, false);
  await controller.emit({ type: 'prep_ready' });
  assert.equal(saved.length, 1);
  assert.equal(saved[0].replayPending, false);
  await controller.emit({ type: 'artifact_bought' });
  assert.equal(saved.length, 2);
  assert.deepEqual(saved[1].seenStepIds, ['build_backpack']);
});

test('coin and lost-life copy use authoritative values and localized plural forms', () => {
  const coins = tutorialStepView({
    stepId: 'coin_balance',
    locale: 'en',
    payload: { coinsRemaining: 2 }
  });
  assert.match(coins.body, /2 coins left/);
  assert.equal(coins.anchorSelector, '[data-tutorial-anchor="run-coins"]');

  const english = tutorialStepView({
    stepId: 'lost_life',
    locale: 'en',
    payload: { outcome: 'loss', livesRemaining: 1, roundsRemaining: 2 }
  });
  assert.equal(english.title, 'You lost a life');
  assert.match(english.body, /1 life left/);
  assert.match(english.body, /2 rounds remain/);
  assert.equal(english.anchorSelector, '[data-tutorial-anchor="run-lives"]');
  assert.equal(english.anchorPlacement, 'bottom');

  const russian = tutorialStepView({
    stepId: 'lost_life',
    locale: 'ru',
    payload: { outcome: 'loss', livesRemaining: 3, roundsRemaining: 2 }
  });
  assert.equal(russian.title, 'Потеряна жизнь');
  assert.match(russian.body, /2 раунда/);
});

test('only a non-terminal loss opens the lives tutorial', () => {
  const terminal = reduceTutorialEvent(createTutorialSession(), {
    type: 'round_completed',
    runEnded: true,
    outcome: 'loss',
    livesRemaining: 0,
    roundsRemaining: 3
  });
  assert.equal(terminal.activeStepId, null);
  const win = reduceTutorialEvent(createTutorialSession(), {
    type: 'round_completed',
    outcome: 'win',
    runEnded: false
  });
  assert.equal(win.activeStepId, null);
  const loss = reduceTutorialEvent(createTutorialSession(), {
    type: 'round_completed',
    outcome: 'loss',
    runEnded: false
  });
  assert.equal(loss.activeStepId, 'lost_life');
});

test('shared event shapers follow successful item actions and authoritative round progress', () => {
  const events = createPrepTutorialEvents({
    shopItems: [
      { artifact: { id: 'sword', family: 'combat', image: '/sword.png' } },
      { artifact: { id: 'pouch', family: 'bag', image: '/pouch.png' } }
    ]
  });
  assert.deepEqual(events.map((event) => event.type), ['prep_ready', 'bag_offer_visible']);

  const waitingEvents = createPrepTutorialEvents({
    inventoryItems: [{ artifactId: 'sword' }],
    getArtifact: (entry) => ({ id: entry.artifactId, family: 'combat', image: '/sword.png' })
  });
  assert.deepEqual(waitingEvents.map((event) => event.type), [
    'prep_ready',
    'artifact_bought'
  ]);
  let restored = createTutorialSession({
    preferences: { seenStepIds: ['build_backpack'] }
  });
  for (const event of waitingEvents) restored = reduceTutorialEvent(restored, event);
  assert.equal(restored.activeStepId, 'place_artifact');
  assert.equal(restored.activePayload.imageSrc, '/sword.png');

  const placedOnReloadEvents = createPrepTutorialEvents({
    placedItems: [{ artifactId: 'sword' }],
    getArtifact: (entry) => ({ id: entry.artifactId, family: 'combat' })
  });
  assert.deepEqual(placedOnReloadEvents.map((event) => event.type), [
    'prep_ready',
    'artifact_bought',
    'artifact_placed'
  ]);
  restored = createTutorialSession({
    preferences: { seenStepIds: ['build_backpack'] }
  });
  for (const event of placedOnReloadEvents) restored = reduceTutorialEvent(restored, event);
  assert.equal(restored.activeStepId, 'automatic_artifacts');
  assert.ok(restored.preferences.seenStepIds.includes('place_artifact'));

  const bagOnlyEvents = createPrepTutorialEvents({
    inventoryItems: [{ artifact: { id: 'pouch', family: 'bag' } }]
  });
  assert.deepEqual(bagOnlyEvents.map((event) => event.type), ['prep_ready', 'bag_bought']);

  assert.deepEqual(createArtifactBoughtTutorialEvent({
    artifact: { id: 'sword', image: '/sword.png' }
  }), {
    type: 'artifact_bought',
    artifactId: 'sword',
    imageSrc: '/sword.png',
    imageAlt: ''
  });

  assert.deepEqual(createArtifactBoughtTutorialEvent({
    artifact: { id: 'shield' },
    purchaseCount: 2,
    coinsRemaining: 1
  }), {
    type: 'additional_artifact_bought',
    artifactId: 'shield',
    imageSrc: '',
    imageAlt: '',
    coinsRemaining: 1
  });

  assert.equal(createBagBoughtTutorialEvent({
    artifact: { id: 'pouch', family: 'bag' }
  }).type, 'bag_bought');

  const placedEvents = createArtifactPlacedTutorialEvents({
    artifact: { id: 'sword', image: '/sword.png' },
    shopItems: [{ artifact: { id: 'pouch', family: 'bag', image: '/pouch.png' } }]
  });
  assert.deepEqual(placedEvents.map((event) => event.type), [
    'artifact_placed',
    'bag_offer_visible'
  ]);
  assert.equal(placedEvents[1].imageSrc, '/pouch.png');

  const restoredLaterRound = createPrepTutorialEvents({
    inventoryItems: [
      { artifact: { id: 'sword', family: 'combat' } },
      { artifact: { id: 'shield', family: 'combat' } },
      { artifact: { id: 'pouch', family: 'bag' } }
    ],
    currentRound: 2,
    coinsRemaining: 1
  });
  assert.deepEqual(restoredLaterRound.map((event) => event.type), [
    'prep_ready',
    'artifact_bought',
    'additional_artifact_bought',
    'later_round_prep',
    'bag_bought'
  ]);

  assert.deepEqual(createRoundTutorialEvent({
    outcome: 'win',
    player: { completedRounds: 2, livesRemaining: 4 },
    maxRounds: 7
  }), {
    type: 'round_completed',
    outcome: 'win',
    livesRemaining: 4,
    completedRounds: 2,
    maxRounds: 7,
    roundsRemaining: 5,
    runEnded: false,
    endReason: ''
  });
});

test('bag placement completes its required tutorial step', () => {
  let session = createTutorialSession({
    preferences: {
      seenStepIds: [
        'build_backpack',
        'place_artifact',
        'automatic_artifacts',
        'coin_balance',
        'refresh_shop'
      ]
    }
  });
  session = reduceTutorialEvent(session, { type: 'bag_offer_visible' });
  assert.equal(session.activeStepId, 'bags_add_space');
  session = dismissTutorialStep(session);
  session = reduceTutorialEvent(session, { type: 'bag_bought', artifactId: 'pouch' });
  assert.equal(session.activeStepId, 'place_bag');
  session = reduceTutorialEvent(session, { type: 'bag_placed', artifactId: 'pouch' });
  assert.equal(session.activeStepId, null);
  assert.ok(session.preferences.seenStepIds.includes('place_bag'));
});

test('preferences normalization drops unknown steps and invalid values', () => {
  assert.deepEqual(normalizeTutorialPreferences({
    versionSeen: -2,
    disabled: 1,
    replayPending: 0,
    seenStepIds: ['build_backpack', 'unknown', 'build_backpack']
  }), {
    versionSeen: 0,
    disabled: true,
    replayPending: false,
    seenStepIds: ['build_backpack']
  });
});

test('shared Vue surfaces expose tutorial popup and replay setting contracts', () => {
  assert.equal(TutorialPopup.name, 'TutorialPopup');
  assert.deepEqual(TutorialPopup.emits, ['dismiss', 'skip']);
  assert.match(TutorialPopup.template, /role="dialog"/);
  assert.doesNotMatch(TutorialPopup.template, /aria-modal="true"/);
  assert.match(TutorialPopup.template, /data-placement/);
  assert.match(TutorialPopup.template, /!step\.actionRequired/);
  assert.match(TutorialPopup.template, /tutorial-popup--with-image/);
  assert.ok(SettingsScreen.emits.includes('update:tutorial-replay-pending'));
  assert.match(SettingsScreen.template, /tutorialReplayPending/);
});
