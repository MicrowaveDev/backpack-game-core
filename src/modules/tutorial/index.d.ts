export interface TutorialPreferences {
  versionSeen: number;
  disabled: boolean;
  replayPending: boolean;
  seenStepIds: string[];
}

export interface TutorialSession {
  version: number;
  active: boolean;
  replay: boolean;
  skipped: boolean;
  completed: boolean;
  activeStepId: string | null;
  activePayload: Record<string, unknown> | null;
  queuedSteps: Array<{ stepId: string; payload: Record<string, unknown> }>;
  preferences: TutorialPreferences;
}

export const TUTORIAL_VERSION: number;
export const TUTORIAL_STEP_IDS: readonly string[];
export const DEFAULT_TUTORIAL_COPY: Readonly<Record<string, unknown>>;
export function normalizeTutorialPreferences(value?: unknown): TutorialPreferences;
export function scheduleTutorialReplay(value?: unknown): TutorialPreferences;
export function consumeTutorialReplay(value?: unknown): TutorialPreferences;
export function shouldStartTutorial(value?: unknown, version?: number): boolean;
export function createTutorialSession(options?: { preferences?: unknown; version?: number }): TutorialSession;
export function reduceTutorialEvent(session: TutorialSession, event?: Record<string, unknown>): TutorialSession;
export function dismissTutorialStep(session: TutorialSession, stepId?: string | null): TutorialSession;
export function skipTutorial(session: TutorialSession): TutorialSession;
export function completeTutorial(session: TutorialSession): TutorialSession;
export function tutorialStepView(options?: {
  stepId?: string;
  payload?: Record<string, unknown>;
  locale?: string;
  copy?: Record<string, unknown>;
}): Record<string, unknown> | null;
export function createPrepTutorialEvents(options?: {
  shopItems?: unknown[];
  storageItems?: unknown[];
  /** @deprecated Use storageItems. */
  inventoryItems?: unknown[];
  placedItems?: unknown[];
  currentRound?: number;
  coinsRemaining?: number;
  getArtifact?: (entry: any) => any;
  isBag?: (artifact: any) => boolean;
  imageForArtifact?: (artifact: any) => string;
}): Array<Record<string, unknown>>;
export function createArtifactBoughtTutorialEvent(options?: {
  artifact?: any;
  purchaseCount?: number;
  coinsRemaining?: number;
  imageForArtifact?: (artifact: any) => string;
}): Record<string, unknown>;
export function createBagBoughtTutorialEvent(options?: {
  artifact?: any;
  imageForArtifact?: (artifact: any) => string;
}): Record<string, unknown>;
export function createArtifactPlacedTutorialEvents(options?: {
  artifact?: any;
  shopItems?: unknown[];
  getArtifact?: (entry: any) => any;
  isBag?: (artifact: any) => boolean;
  imageForArtifact?: (artifact: any) => string;
}): Array<Record<string, unknown>>;
export function createRoundTutorialEvent(options?: {
  outcome?: string;
  player?: Record<string, unknown>;
  maxRounds?: number;
  runEnded?: boolean;
  endReason?: string;
}): Record<string, unknown>;
