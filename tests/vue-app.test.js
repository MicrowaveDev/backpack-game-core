import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GameApplicationRoot,
  GameShell,
  ScreenOutlet,
  createGameApplication,
  createNavigationItems,
  createScreenRegistry
} from '@microwavedev/backpack-game-core/vue/app';

const PublicScreen = {
  name: 'PublicScreen',
  template: '<section />'
};
const PrivateScreen = {
  name: 'PrivateScreen',
  template: '<section />'
};

function adapterInput(overrides = {}) {
  return {
    id: 'sample-game',
    defaultLocale: 'en',
    locale: {
      getLocale: () => 'en',
      setLocale: () => {},
      translate: (key) => key
    },
    assets: { resolve: () => null },
    services: { session: {} },
    capabilities: { account: true, social: false },
    themeClass: 'sample-theme',
    ...overrides
  };
}

test('[vue/app] registry applies capabilities, guards, and duplicate checks', () => {
  const registry = createScreenRegistry([
    {
      id: 'public',
      component: PublicScreen,
      navigation: { label: 'Public', order: 2 }
    },
    {
      id: 'private',
      component: PrivateScreen,
      capability: 'account',
      guard: ({ authenticated }) => authenticated === true,
      navigation: { label: 'Private', order: 1 }
    },
    {
      id: 'social',
      component: PublicScreen,
      capability: 'social',
      navigation: { label: 'Social' }
    },
    {
      id: 'redirected',
      component: PublicScreen,
      guard: () => 'public'
    }
  ], {
    capabilities: { account: true, social: false }
  });

  assert.deepEqual(registry.ids, ['public', 'private', 'social', 'redirected']);
  assert.deepEqual(
    registry.list({ context: { authenticated: true } }).map((screen) => screen.id),
    ['public', 'private']
  );
  assert.equal(registry.resolve('private', { authenticated: false }).allowed, false);
  assert.equal(registry.resolve('redirected').redirect, 'public');
  assert.equal(registry.resolve('social').allowed, false);
  assert.throws(
    () => createScreenRegistry([
      { id: 'same', component: PublicScreen },
      { id: 'same', component: PrivateScreen }
    ]),
    /Duplicate screen id/
  );
});

test('[vue/app] navigation is derived from available screen metadata', () => {
  const registry = createScreenRegistry([
    { id: 'later', component: PublicScreen, navigation: { label: 'Later', order: 20 } },
    { id: 'first', component: PublicScreen, navigation: { label: 'First', order: 1 } },
    { id: 'hidden', component: PublicScreen, navigation: { label: 'Hidden', hidden: true } }
  ]);

  assert.deepEqual(
    createNavigationItems(registry).map((item) => item.id),
    ['first', 'later']
  );
});

test('[vue/app] shell facades are plain Vue option objects', () => {
  assert.equal(ScreenOutlet.name, 'ScreenOutlet');
  assert.equal(GameShell.name, 'GameShell');
  assert.equal(GameApplicationRoot.name, 'GameApplicationRoot');
  assert.match(ScreenOutlet.template, /<component/);
  assert.match(GameShell.template, /game-application__navigation/);
  assert.doesNotMatch(GameShell.template, /sample-game|mushroom|spore|meat/i);
});

test('[vue/app] createGameApplication returns a consumer-mounted definition', () => {
  const extension = {
    id: 'extension',
    component: PrivateScreen,
    capability: 'account',
    navigation: { label: 'Extension', order: 2 }
  };
  const definition = createGameApplication(adapterInput({
    routeExtensions: [extension]
  }), {
    screens: [{
      id: 'home',
      component: PublicScreen,
      navigation: { label: 'Home', order: 1 }
    }],
    initialScreenId: 'home',
    title: 'Sample'
  });

  assert.equal(definition.rootComponent, GameApplicationRoot);
  assert.equal(definition.rootProps.adapter.id, 'sample-game');
  assert.equal(definition.rootProps.registry.has('extension'), true);
  assert.equal(definition.rootProps.initialScreenId, 'home');
  assert.equal(definition.rootProps.title, 'Sample');
  assert.equal(Object.isFrozen(definition), true);
});

test('[vue/app] createGameApplication rejects unavailable initial routes', () => {
  assert.throws(
    () => createGameApplication(adapterInput(), {
      screens: [{
        id: 'social',
        component: PublicScreen,
        capability: 'social'
      }],
      initialScreenId: 'social'
    }),
    /requires at least one available screen/
  );
});
