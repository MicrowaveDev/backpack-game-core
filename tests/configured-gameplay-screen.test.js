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
    'prep_ready',
    'bag_offer_visible'
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

test('[configured gameplay] uses the shared controller for selection and commits through product revision', async () => {
  const artifact = { id: 'blade', family: 'combat', width: 1, height: 1 };
  const bag = { id: 'starter_bag', family: 'bag', width: 2, height: 2 };
  const component = createConfiguredGameplayScreen(options());
  const saves = [];
  const notifications = [];
  const context = {
    interactionState: {},
    runIsActive: true, loading: false, showReplay: false,
    run: { id: 'run-1', revision: 7, loadoutItems: [
      { id: 'starter', artifactId: 'starter_bag', x: 0, y: 0, width: 2, height: 2, active: true },
      { id: 'blade-instance', artifactId: 'blade', x: -1, y: -1, width: 1, height: 1 }
    ] },
    grid: { totalRows: 5 },
    getArtifact: (id) => id === 'blade' ? artifact : bag,
    async saveRows(rows) { saves.push(rows); this.run = { ...this.run, loadoutItems: rows, revision: 8 }; return { run: this.run }; },
    onInteractionCommitted(change) { notifications.push(change); }
  };
  component.created.call(context);
  context.interaction.select('blade-instance');
  assert.equal(saves.length, 0);
  await context.interaction.placeAt({ x: 1, y: 1 });
  assert.equal(saves.length, 1);
  assert.equal(context.run.loadoutItems.find((row) => row.id === 'blade-instance').x, 1);
  assert.equal(notifications[0].action, 'place');
  assert.equal(notifications[0].item.id, 'blade-instance');
  context.interaction.select('blade-instance');
  assert.equal(saves.length, 1, 'selecting a placed item must not remove it');
});

test('[configured gameplay] refuses overlapping product mutations and reports save failures', async () => {
  const component = createConfiguredGameplayScreen(options());
  let calls = 0;
  const context = {
    runIsActive: true, loading: true,
    text: { saveLoadout: 'Save' }, run: { id: 'run-1', revision: 9 },
    clientServices: { services: { run: { saveLoadout() { calls += 1; return null; } } } },
    async mutate(_label, operation) { return operation(); }
  };
  assert.equal(await component.methods.saveRows.call(context, []), false);
  assert.equal(calls, 0);
  context.loading = false;
  assert.equal(await component.methods.saveRows.call(context, []), false);
  assert.equal(calls, 1);
});

test('[configured gameplay] serializes a loadout save against purchases and keeps its revision', async () => {
  const component = createConfiguredGameplayScreen(options());
  const writes = [];
  let finishSave;
  const context = {
    runIsActive: true, loading: false, activeRun: { id: 'run-1', revision: 7 },
    controller: { state: {} }, text: { saveLoadout: 'Save', buy: 'Buy' },
    getArtifact: (id) => ({ id }),
    async refreshBootstrap() {},
    clientServices: { services: { run: {
      saveLoadout(id, rows, revision) {
        writes.push({ id, rows, revision });
        return new Promise((resolve) => { finishSave = resolve; });
      },
      buy() { writes.push('unexpected buy'); }
    } } }
  };
  Object.defineProperty(context, 'run', { get: () => context.activeRun });
  context.mutate = component.methods.mutate.bind(context);
  const saving = component.methods.saveRows.call(context, [{ id: 'item' }]);
  assert.equal(context.loading, true);
  const purchase = await component.methods.buy.call(context, { artifactId: 'blade', canAfford: true });
  assert.equal(purchase, null);
  assert.deepEqual(writes, [{ id: 'run-1', rows: [{ id: 'item' }], revision: 7 }]);
  finishSave({ run: { id: 'run-1', revision: 8 } });
  await saving;
  assert.equal(context.run.revision, 8);
  assert.equal(context.loading, false);
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
  assert.doesNotThrow(() => createConfiguredGameplayScreen(options({ findPlacement: null, findBagPlacement: null })));
  assert.throws(
    () => createConfiguredGameplayScreen(options({ artifactFigureComponent: null })),
    /options\.artifactFigureComponent/
  );
});


test('[configured gameplay] suspends guidance before battle response and restores it on failure', async () => {
  const values = [];
  const component = createConfiguredGameplayScreen(options({ getTutorialController: () => ({ setSuspended: (value) => values.push(value) }) }));
  const context = {
    runIsActive: true, loading: false, showReplay: false, controller: {},
    text: { battle: 'Battle' }, run: { id: 'run-1' },
    clientServices: { services: { run: { battle: async () => null } } },
    async mutate(action, operation) { assert.deepEqual(values, [true]); return operation(); },
    emitPrepTutorial() { values.push('prep'); }
  };
  await component.methods.resolveBattle.call(context);
  assert.deepEqual(values, [true, false, 'prep']);
  assert.equal(context.resolvingBattle, false);
});
