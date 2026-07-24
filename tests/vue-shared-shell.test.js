import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GameApplicationRoot,
  GameShell,
  createGameApplication
} from '@microwavedev/backpack-game-core/vue/app';

const Screen = {
  name: 'SharedShellTestScreen',
  template: '<section />'
};

function adapter() {
  return {
    id: 'shared-shell-test',
    defaultLocale: 'en',
    locale: {
      getLocale: () => 'en',
      setLocale: () => {},
      translate: (key) => key
    },
    assets: { resolve: () => null },
    services: { session: {} },
    capabilities: {},
    themeClass: 'shared-shell-test-theme'
  };
}

test('[vue/shared-shell] preserves the canonical application shell DOM classes', () => {
  assert.match(GameShell.template, /class="shell game-application"/);
  assert.match(GameShell.template, /class="app-header game-application__header"/);
  assert.match(GameShell.template, /class="menu-toggle"/);
  assert.match(GameShell.template, /class="nav-sidebar"/);
  assert.match(GameShell.template, /class="nav-sidebar-list game-application__navigation"/);
  assert.match(GameShell.template, /class="nav-btn game-application__navigation-item"/);
  assert.match(GameShell.template, /class="nav-btn nav-btn--logout"/);
  assert.doesNotMatch(GameShell.template, /mushroom|spore|mycel|meat/i);
});

test('[vue/shared-shell] exposes generic auth, locale, navigation, logout, overlay, and outlet APIs', () => {
  for (const prop of [
    'authenticated',
    'authStatus',
    'locale',
    'locales',
    'menuOpen',
    'showLogout'
  ]) {
    assert.ok(GameShell.props[prop], `missing GameShell prop ${prop}`);
    assert.ok(GameApplicationRoot.props[prop], `missing GameApplicationRoot prop ${prop}`);
  }

  for (const event of [
    'navigate',
    'logout',
    'locale-change',
    'update:locale',
    'menu-change',
    'update:menuOpen'
  ]) {
    assert.ok(GameShell.emits.includes(event), `missing GameShell event ${event}`);
    assert.ok(GameApplicationRoot.emits.includes(event), `missing GameApplicationRoot event ${event}`);
  }

  assert.match(GameShell.template, /name="unauthenticated"/);
  assert.match(GameShell.template, /name="loading"/);
  assert.match(GameShell.template, /name="screen"/);
  assert.match(GameShell.template, /name="overlays"/);
  assert.match(GameShell.template, /<ScreenOutlet/);
});

test('[vue/shared-shell] keeps the existing application definition compatible', () => {
  const definition = createGameApplication(adapter(), {
    screens: [{
      id: 'home',
      component: Screen,
      navigation: { label: 'Home' }
    }],
    initialScreenId: 'home',
    title: 'Shared title'
  });

  assert.equal(definition.rootComponent, GameApplicationRoot);
  assert.equal(definition.rootProps.authenticated, true);
  assert.equal(definition.rootProps.authStatus, '');
  assert.equal(definition.rootProps.locale, '');
  assert.deepEqual(definition.rootProps.locales, []);
  assert.equal(definition.rootProps.menuOpen, false);
  assert.equal(definition.rootProps.showLogout, false);
  assert.equal(definition.rootProps.title, 'Shared title');
  assert.equal(definition.rootProps.initialScreenId, 'home');
});

test('[vue/shared-shell] shell methods emit consumer-facing events without product policy', () => {
  const emitted = [];
  const context = {
    localMenuOpen: true,
    currentScreenId: 'home',
    $emit: (...args) => emitted.push(args)
  };

  GameShell.methods.setMenuOpen.call(context, false);
  assert.equal(context.localMenuOpen, false);
  assert.deepEqual(emitted, [
    ['menu-change', false],
    ['update:menuOpen', false]
  ]);

  emitted.length = 0;
  GameShell.methods.selectLocale.call(context, 'ru');
  assert.deepEqual(emitted, [
    ['locale-change', 'ru'],
    ['update:locale', 'ru']
  ]);
});
