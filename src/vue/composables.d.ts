export interface ReducedMotionTracker {
  getValue(): boolean;
  setAppPreference(value: unknown): void;
  subscribe(callback: (value: boolean) => void): () => void;
  destroy(): void;
}

export declare function createReducedMotionTracker(options?: {
  win?: Window | null;
}): ReducedMotionTracker;

export declare function bindReducedMotionTracker(
  tracker: ReducedMotionTracker,
  options?: {
    onChange?: (value: boolean) => void;
    readAppPreference?: () => unknown;
  }
): () => void;

export interface TelegramWebAppAdapter {
  getWebApp(): Record<string, any> | null;
  isTelegramAvailable(): boolean;
  isVersionAtLeast(version: string): boolean;
  syncViewportVars(root?: HTMLElement | null): void;
  applyTelegramTheme(root?: HTMLElement | null): void;
  impact(type?: string): void;
  notify(type?: string): void;
  selectionChanged(): void;
  init(): () => void;
}

export declare function createTelegramWebAppAdapter(options?: {
  win?: Window | null;
  root?: HTMLElement | null;
}): TelegramWebAppAdapter;

export declare function useTelegramWebApp(options?: {
  win?: Window | null;
  root?: HTMLElement | null;
}): TelegramWebAppAdapter;

export declare function versionAtLeast(current: unknown, minimum: unknown): boolean;

export interface TouchDragState {
  draggingArtifactId: string;
  draggingSource: string;
  draggingItem: Record<string, unknown> | null;
  sellDragOver: boolean;
}

export interface TouchAdapter {
  attachTouch(rootElement: EventTarget | null): void;
  detachTouch(rootElement: EventTarget | null): void;
}

export declare function useTouch(
  state: TouchDragState,
  options?: {
    win?: Window | null;
    document?: Document | null;
  }
): TouchAdapter;
