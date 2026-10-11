import type { TutorialPreferences, TutorialSession } from '../../modules/tutorial/index.js';

export interface TutorialController {
  state: TutorialSession & { suspended?: boolean };
  readonly activeStep: Record<string, unknown> | null;
  setSuspended(value: boolean): void;
  emit(event: Record<string, unknown>): Promise<TutorialSession>;
  dismissCurrent(): Promise<TutorialSession>;
  skipAll(): Promise<TutorialSession>;
  reset(preferences?: unknown): TutorialSession;
}

export function createTutorialController(options?: {
  preferences?: unknown;
  state?: Record<string, unknown>;
  getLocale?: () => string;
  getScreen?: (() => string) | null;
  copy?: Record<string, unknown>;
  persistPreferences?: ((preferences: TutorialPreferences) => void | Promise<void>) | null;
}): TutorialController;
