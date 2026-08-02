import type { TutorialPreferences, TutorialSession } from '../../modules/tutorial/index.js';

export interface TutorialController {
  state: TutorialSession;
  readonly activeStep: Record<string, unknown> | null;
  emit(event: Record<string, unknown>): Promise<TutorialSession>;
  dismissCurrent(): Promise<TutorialSession>;
  skipAll(): Promise<TutorialSession>;
  reset(preferences?: unknown): TutorialSession;
}

export function createTutorialController(options?: {
  preferences?: unknown;
  state?: Record<string, unknown>;
  getLocale?: () => string;
  copy?: Record<string, unknown>;
  persistPreferences?: ((preferences: TutorialPreferences) => void | Promise<void>) | null;
}): TutorialController;
