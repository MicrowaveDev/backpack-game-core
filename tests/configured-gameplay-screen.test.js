import assert from 'node:assert/strict';
import test from 'node:test';
import { createConfiguredGameplayScreen } from '../src/vue/configured/index.js';

function options(overrides = {}) {
  return {
    gridColumns: 6,
    gridRows: 5,
    getArtifactById: (id) => ({ id }),
    findBagPlacement: () => ({ x: 1, y: 1 }),
    findPlacement: () => ({ x: 2, y: 2 }),
    loadoutGridProps: () => ({ items: [], totalRows: 5, bagRows: [] }),
    artifactFigureComponent: { name: 'TestArtifactFigure' },
    replayDuelComponent: { name: 'TestReplayDuel' },
    ...overrides
  };
}

test('[configured gameplay] creates the shared prep, replay, and summary composition', () => {
  const component = createConfiguredGameplayScreen(options({ name: 'ProductGameplay' }));

  assert.equal(component.name, 'ProductGameplay');
  assert.equal(component.components.PrepScreen.name, 'PrepScreen');
  assert.equal(component.components.ReplayDetailScreen.name, 'ReplayDetailScreen');
  assert.equal(component.components.RunSummaryScreen.name, 'RunSummaryScreen');
  assert.equal(component.components.RunCompleteScreen.name, 'RunCompleteScreen');
  assert.equal(component.components.ArtifactFigure.name, 'TestArtifactFigure');
  assert.equal(component.components.ReplayDuel.name, 'TestReplayDuel');
  assert.match(component.template, /<PrepScreen/);
  assert.match(component.template, /<ReplayDetailScreen/);
  assert.match(component.template, /<RunSummaryScreen/);
  assert.match(component.template, /<RunCompleteScreen/);
  assert.doesNotMatch(component.template, /Meat/);
});

test('[configured gameplay] exposes configured grid and presentation values through setup', () => {
  const component = createConfiguredGameplayScreen(options());

  assert.deepEqual(component.setup(), {
    ArtifactFigure: { name: 'TestArtifactFigure' },
    gridColumns: 6,
    gridRows: 5,
    replaySpeedOptions: [
      { speed: 2, count: 1 },
      { speed: 4, count: 2 },
      { speed: 8, count: 3 }
    ]
  });
});

test('[configured gameplay] supports product-configured readable replay timing', () => {
  const speedOptions = [
    { speed: 1, count: 1 },
    { speed: 2, count: 2 },
    { speed: 4, count: 3 }
  ];
  const component = createConfiguredGameplayScreen(options({
    replaySpeedOptions: speedOptions,
    defaultReplaySpeed: 1,
    replayEventDelayMs: 900,
    replayMinDelayMs: 100
  }));
  let capturedDelay = null;
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (_callback, delay) => {
    capturedDelay = delay;
    return 1;
  };

  try {
    component.methods.scheduleReplayAdvance.call({
      clearReplayTimer() {},
      showReplay: true,
      replayTimeline: { longBattleSpeedBoost: 1 },
      replayState: {
        currentBattle: { events: [{}, {}, {}] },
        replayIndex: 0,
        replaySpeed: 1
      },
      scheduleReplayAdvance() {}
    });
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }

  assert.equal(capturedDelay, 900);
  assert.deepEqual(component.setup().replaySpeedOptions, speedOptions);
});

test('[configured gameplay] delegates product data, locale, text, and services through options', () => {
  const services = { services: { run: {} } };
  const component = createConfiguredGameplayScreen(options({
    getArtifactById: (id) => (id === 'known' ? { id, name: { pt: 'Conhecido' } } : null),
    getLocale: () => 'pt',
    getText: () => ({ startRun: 'Comecar' }),
    getClientServices: () => services
  }));
  const controller = {
    artifacts: [{ id: 'fallback' }],
    state: { bootstrap: {}, locale: 'en' },
    text: {},
    clientServices: null
  };
  const context = { controller };

  assert.equal(component.computed.locale.call(context), 'pt');
  assert.deepEqual(component.computed.text.call(context), { startRun: 'Comecar' });
  assert.equal(component.computed.clientServices.call(context), services);
  assert.deepEqual(
    component.methods.getArtifact.call({ controller }, 'known'),
    { id: 'known', name: { pt: 'Conhecido' } }
  );
  assert.deepEqual(
    component.methods.getArtifact.call({ controller }, 'fallback'),
    { id: 'fallback' }
  );
});

test('[configured gameplay] emits contextual prep tutorial events through the configured controller', () => {
  const tutorialEvents = [];
  const component = createConfiguredGameplayScreen(options({
    getArtifactById: (id) => ({ id, family: id === 'bag' ? 'bag' : 'combat' }),
    getTutorialController: () => ({ emit: (event) => tutorialEvents.push(event) })
  }));
  component.methods.emitPrepTutorial.call({
    controller: {},
    runIsActive: true,
    showReplay: false,
    run: {
      shopItems: [
        { artifact: { id: 'blade', family: 'combat' } },
        { artifact: { id: 'bag', family: 'bag' } }
      ],
      loadoutItems: []
    },
    getArtifact: (id) => ({ id, family: id === 'bag' ? 'bag' : 'combat' }),
    artifactImage: () => ''
  });
  assert.deepEqual(tutorialEvents.map((event) => event.type), [
    'prep_ready'
  ]);
});

test('[configured gameplay] delegates rich completion summary shaping to the product adapter', () => {
  const calls = [];
  const component = createConfiguredGameplayScreen(options({
    shapeRunCompleteSummary(context) {
      calls.push(context);
      return { title: 'Arena cleared' };
    }
  }));
  const context = {
    runSummary: { title: 'Fallback' },
    run: { id: 'run_1', characterId: 'fighter_1' },
    characters: [{ id: 'fighter_1' }],
    bootstrap: { season: { totalPoints: 10 } },
    text: { playAgain: 'Play again' },
    locale: 'en'
  };

  assert.deepEqual(component.computed.runCompleteSummary.call(context), { title: 'Arena cleared' });
  assert.equal(calls[0].run.id, 'run_1');
  assert.equal(calls[0].character.id, 'fighter_1');
  assert.equal(calls[0].fallbackSummary.title, 'Fallback');
});

test('[configured gameplay] localizes backend-shaped shop stat keys for display', () => {
  const component = createConfiguredGameplayScreen(options());
  const rows = component.computed.shopRows.call({
    run: {
      shopItems: [{
        artifact: { id: 'snare' },
        statRows: [{ key: 'stunChance', label: 'stunChance', value: '+8' }]
      }]
    },
    statLabels: { stunChance: 'Stun chance' },
    artifactName: () => 'Snare',
    artifactDescription: () => 'A trap'
  });

  assert.equal(rows[0].statRows[0].label, 'Stun chance');
});

test('[configured gameplay] returns home after closing a run summary', async () => {
  const component = createConfiguredGameplayScreen(options());
  const calls = [];
  const context = {
    activeRun: { id: 'completed-run' },
    controller: {
      state: { selectedHistoryRun: { id: 'completed-run' } }
    },
    async refreshBootstrap() {
      calls.push('refresh');
    },
    navigate(screenId) {
      calls.push(`navigate:${screenId}`);
    }
  };

  await component.methods.closeSummary.call(context);

  assert.equal(context.controller.state.selectedHistoryRun, null);
  assert.equal(context.activeRun, null);
  assert.deepEqual(calls, ['refresh', 'navigate:home']);
});

test('[configured gameplay] supports returning home before another run is created', async () => {
  const component = createConfiguredGameplayScreen(options({ runCompletePrimaryAction: 'home' }));
  const calls = [];

  await component.methods.handleRunCompletePrimary.call({
    closeSummary() {
      calls.push('home');
    },
    startRun() {
      calls.push('start');
    }
  });

  assert.deepEqual(calls, ['home']);
});

test('[configured gameplay] starts another run by default after completion', async () => {
  const component = createConfiguredGameplayScreen(options());
  const calls = [];

  await component.methods.handleRunCompletePrimary.call({
    closeSummary() {
      calls.push('home');
    },
    startRun() {
      calls.push('start');
    }
  });

  assert.deepEqual(calls, ['start']);
});

test('[configured gameplay] keeps battle earnings in the run summary instead of a loose notice', async () => {
  const component = createConfiguredGameplayScreen(options());
  const context = {
    loading: false,
    notice: 'stale notice',
    battle: null,
    activeRun: null,
    controller: { state: { error: '' } },
    text: { earned: 'Earned' },
    async refreshBootstrap() {}
  };

  await component.methods.mutate.call(context, 'Battle', async () => ({
    battle: { id: 'battle_1' },
    walletTransaction: { delta: 2 }
  }));

  assert.equal(context.notice, '');
  assert.equal(context.battle.id, 'battle_1');
});

test('[configured gameplay] rejects incomplete product configuration', () => {
  assert.throws(
    () => createConfiguredGameplayScreen(options({ gridColumns: 0 })),
    /positive integer options\.gridColumns/
  );
  assert.throws(
    () => createConfiguredGameplayScreen(options({ findPlacement: null })),
    /options\.findPlacement/
  );
  assert.throws(
    () => createConfiguredGameplayScreen(options({ artifactFigureComponent: null })),
    /options\.artifactFigureComponent/
  );
});
