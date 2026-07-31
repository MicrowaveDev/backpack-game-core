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
  assert.equal(component.components.ArtifactFigure.name, 'TestArtifactFigure');
  assert.equal(component.components.ReplayDuel.name, 'TestReplayDuel');
  assert.match(component.template, /<PrepScreen/);
  assert.match(component.template, /<ReplayDetailScreen/);
  assert.match(component.template, /<RunSummaryScreen/);
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
