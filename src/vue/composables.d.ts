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
