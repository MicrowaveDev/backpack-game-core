export interface KeyedAsyncMutex {
  withLock<T>(key: string, fn: () => Promise<T> | T): Promise<T>;
  clear(key: string): void;
  clearAll(): void;
  has(key: string): boolean;
}

export interface RunReadinessStatus {
  ready: boolean;
  playerIds: string[] | null;
}

export interface RunReadinessManager {
  setReady(runId: string, playerId: string): void;
  setUnready(runId: string, playerId: string): void;
  touchActivity(runId: string): void;
  isReady(runId: string, playerId: string): boolean;
  readyStatus(runId: string): RunReadinessStatus;
  clearRound(runId: string): void;
  clearRun(runId: string): void;
  clearAll(): void;
  getIdleRunIds(timeoutMs: number): string[];
  withRunLock<T>(runId: string, fn: () => Promise<T> | T): Promise<T>;
}

export declare function createKeyedAsyncMutex(): KeyedAsyncMutex;
export declare function createRunReadinessManager(options?: {
  now?: () => number;
  requiredReadyCount?: number;
}): RunReadinessManager;
