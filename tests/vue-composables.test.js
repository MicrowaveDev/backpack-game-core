import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bindReducedMotionTracker,
  createReducedMotionTracker
} from '@microwavedev/backpack-game-core/vue/composables';

function makeWindow({ systemReduced = false } = {}) {
  const listeners = new Set();
  const mql = {
    matches: systemReduced,
    addEventListener(event, handler) {
      if (event === 'change') listeners.add(handler);
    },
    removeEventListener(event, handler) {
      if (event === 'change') listeners.delete(handler);
    }
  };
  return {
    win: {
      matchMedia: (_query) => mql
    },
    fireSystemChange(nextMatches) {
      mql.matches = nextMatches;
      for (const listener of listeners) listener({ matches: nextMatches });
    },
    listenerCount: () => listeners.size
  };
}

test('[vue-composables] system reduced-motion preference alone yields true', () => {
  const { win } = makeWindow({ systemReduced: true });
  const tracker = createReducedMotionTracker({ win });
  assert.equal(tracker.getValue(), true);
  tracker.destroy();
});

test('[vue-composables] app reduced-motion preference alone yields true', () => {
  const { win } = makeWindow({ systemReduced: false });
  const tracker = createReducedMotionTracker({ win });
  assert.equal(tracker.getValue(), false);
  tracker.setAppPreference(true);
  assert.equal(tracker.getValue(), true);
  tracker.destroy();
});

test('[vue-composables] system changes and app changes notify subscribers', () => {
  const harness = makeWindow({ systemReduced: false });
  const tracker = createReducedMotionTracker({ win: harness.win });
  const seen = [];
  tracker.subscribe((value) => seen.push(value));
  harness.fireSystemChange(true);
  tracker.setAppPreference(true);
  harness.fireSystemChange(false);
  tracker.setAppPreference(false);
  assert.deepEqual(seen, [true, true, true, false]);
  tracker.destroy();
});

test('[vue-composables] tracker is SSR-safe without window', () => {
  const tracker = createReducedMotionTracker({ win: null });
  assert.equal(tracker.getValue(), false);
  tracker.setAppPreference(true);
  assert.equal(tracker.getValue(), true);
  tracker.destroy();
});

test('[vue-composables] destroy detaches system listener and clears subscribers', () => {
  const harness = makeWindow({ systemReduced: false });
  const tracker = createReducedMotionTracker({ win: harness.win });
  assert.equal(harness.listenerCount(), 1);
  const calls = [];
  tracker.subscribe((value) => calls.push(value));
  tracker.destroy();
  assert.equal(harness.listenerCount(), 0);
  harness.fireSystemChange(true);
  assert.deepEqual(calls, []);
});

test('[vue-composables] legacy Safari addListener/removeListener is supported', () => {
  const listeners = new Set();
  const mql = {
    matches: false,
    addListener(handler) { listeners.add(handler); },
    removeListener(handler) { listeners.delete(handler); }
  };
  const win = { matchMedia: () => mql };
  const tracker = createReducedMotionTracker({ win });
  const seen = [];
  tracker.subscribe((value) => seen.push(value));
  for (const listener of listeners) listener({ matches: true });
  assert.deepEqual(seen, [true]);
  tracker.destroy();
  assert.equal(listeners.size, 0);
});

test('[vue-composables] bindReducedMotionTracker initializes and subscribes', () => {
  const { win } = makeWindow({ systemReduced: false });
  const tracker = createReducedMotionTracker({ win });
  const seen = [];
  const unbind = bindReducedMotionTracker(tracker, {
    readAppPreference: () => true,
    onChange: (value) => seen.push(value)
  });
  tracker.setAppPreference(false);
  unbind();
  tracker.setAppPreference(true);
  assert.deepEqual(seen, [true, false]);
  tracker.destroy();
});
