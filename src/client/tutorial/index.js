import {
  createTutorialSession,
  dismissTutorialStep,
  reduceTutorialEvent,
  skipTutorial,
  tutorialStepView
} from '../../modules/tutorial/index.js';

export function createTutorialController({
  preferences = {},
  state = {},
  getLocale = () => 'en',
  copy = {},
  persistPreferences = null
} = {}) {
  Object.assign(state, createTutorialSession({ preferences }));

  async function persist() {
    if (typeof persistPreferences === 'function') {
      try {
        await persistPreferences({ ...state.preferences });
      } catch {
        // Tutorial persistence must never block gameplay.
      }
    }
  }

  function replace(next) {
    Object.assign(state, next);
    return state;
  }

  return {
    state,
    get activeStep() {
      return tutorialStepView({
        stepId: state.activeStepId,
        payload: state.activePayload || {},
        locale: getLocale(),
        copy
      });
    },
    async emit(event) {
      const beforeReplay = state.replay;
      const beforePreferences = JSON.stringify(state.preferences);
      replace(reduceTutorialEvent(state, event));
      const preferencesChanged = beforePreferences !== JSON.stringify(state.preferences);
      if (beforeReplay && !state.preferences.replayPending) {
        state.replay = false;
      }
      if (preferencesChanged || (beforeReplay && !state.preferences.replayPending)) {
        await persist();
      }
      return state;
    },
    async dismissCurrent() {
      replace(dismissTutorialStep(state));
      await persist();
      return state;
    },
    async skipAll() {
      replace(skipTutorial(state));
      await persist();
      return state;
    },
    reset(nextPreferences = {}) {
      return replace(createTutorialSession({ preferences: nextPreferences }));
    }
  };
}
