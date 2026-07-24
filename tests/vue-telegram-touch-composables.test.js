import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTelegramWebAppAdapter,
  useTelegramWebApp,
  useTouch,
  versionAtLeast
} from '@microwavedev/backpack-game-core/vue/composables';

function createStyle() {
  const values = new Map();
  return {
    setProperty(name, value) {
      values.set(name, value);
    },
    getPropertyValue(name) {
      return values.get(name);
    }
  };
}

test('[vue/telegram] adapter initializes, synchronizes variables, and removes listeners', () => {
  const listeners = new Map();
  const calls = [];
  const root = { style: createStyle() };
  const tg = {
    version: '8.1',
    viewportHeight: 640,
    viewportStableHeight: 620,
    safeAreaInset: { top: 10, bottom: 12 },
    contentSafeAreaInset: { top: 14, bottom: 16 },
    themeParams: {
      button_color: '#123456',
      secondary_bg_color: '#eeeeee'
    },
    ready: () => calls.push('ready'),
    expand: () => calls.push('expand'),
    onEvent: (name, handler) => listeners.set(name, handler),
    offEvent: (name, handler) => {
      if (listeners.get(name) === handler) listeners.delete(name);
    }
  };
  const adapter = createTelegramWebAppAdapter({
    win: { Telegram: { WebApp: tg }, innerHeight: 700 },
    root
  });

  assert.equal(adapter.isTelegramAvailable(), true);
  assert.equal(adapter.isVersionAtLeast('8.0'), true);
  const destroy = adapter.init();
  assert.deepEqual(calls, ['ready', 'expand']);
  assert.equal(root.style.getPropertyValue('--tg-viewport-height-local'), '640px');
  assert.equal(root.style.getPropertyValue('--telegram-safe-area-bottom'), '12px');
  assert.equal(root.style.getPropertyValue('--telegram-accent'), '#123456');
  assert.equal(listeners.size, 4);
  destroy();
  assert.equal(listeners.size, 0);
});

test('[vue/telegram] facade and version fallback are SSR-safe', () => {
  assert.equal(versionAtLeast('7.10', '7.2'), true);
  assert.equal(versionAtLeast('7.1', '7.2'), false);
  const adapter = useTelegramWebApp({ win: null, root: null });
  assert.equal(adapter.isTelegramAvailable(), false);
  assert.equal(adapter.isVersionAtLeast('1.0'), false);
  assert.equal(typeof adapter.init(), 'function');
});

test('[vue/touch] chooses pointer or legacy touch listeners and detaches them', () => {
  const state = {
    draggingArtifactId: '',
    draggingSource: '',
    draggingItem: null,
    sellDragOver: false
  };
  const pointerListeners = new Map();
  const pointerRoot = {
    addEventListener(name, handler) {
      pointerListeners.set(name, handler);
    },
    removeEventListener(name, handler) {
      if (pointerListeners.get(name) === handler) pointerListeners.delete(name);
    }
  };
  const pointerAdapter = useTouch(state, {
    win: { PointerEvent: class PointerEvent {} },
    document: null
  });
  pointerAdapter.attachTouch(pointerRoot);
  assert.deepEqual([...pointerListeners.keys()], [
    'pointerdown',
    'pointermove',
    'pointerup',
    'pointercancel'
  ]);
  pointerAdapter.detachTouch(pointerRoot);
  assert.equal(pointerListeners.size, 0);

  const touchListeners = new Map();
  const touchRoot = {
    addEventListener(name, handler) {
      touchListeners.set(name, handler);
    },
    removeEventListener(name, handler) {
      if (touchListeners.get(name) === handler) touchListeners.delete(name);
    }
  };
  const touchAdapter = useTouch(state, { win: {}, document: null });
  touchAdapter.attachTouch(touchRoot);
  assert.deepEqual([...touchListeners.keys()], ['touchstart', 'touchmove', 'touchend']);
  touchAdapter.detachTouch(touchRoot);
  assert.equal(touchListeners.size, 0);
});
