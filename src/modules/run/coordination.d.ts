/** Invoke inside the consumer's atomic transaction; it owns the active-run scope. */
export function startOrResumeRun<Run>(options: {
  getActiveRun: () => Run | null | undefined | Promise<Run | null | undefined>;
  createRun: () => Run | Promise<Run>;
}): Promise<Run>;

export function runWithPendingStart<Run>(options: {
  state: { startingRun?: boolean };
  start: () => Run | Promise<Run>;
  onStarted?: (run: Run) => unknown | Promise<unknown>;
}): Promise<Run | null>;

export function resolveRequestedActiveRun<Run, Id = string>(options: {
  activeRun?: Run | null;
  requestedRunId?: Id | null;
  loadRun: (id: Id) => Run | null | Promise<Run | null>;
  getRunId?: (run: Run | null) => Id | null | undefined;
  isActiveRun?: (run: Run | null) => boolean;
  isUnavailableError?: (error: unknown) => boolean;
}): Promise<Run | null>;
