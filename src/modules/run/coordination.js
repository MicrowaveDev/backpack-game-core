// Call within the consumer's atomic transaction. The consumer owns the
// active-run scope, persistence, ownership checks, and run creation data.
export async function startOrResumeRun({ getActiveRun, createRun }) {
  const activeRun = await getActiveRun();
  return activeRun || createRun();
}

// A shared state object allows separate UI invocations to share the same gate.
export async function runWithPendingStart({ state, start, onStarted = () => {} }) {
  if (state.startingRun) return null;
  state.startingRun = true;
  try {
    const run = await start();
    await onStarted(run);
    return run;
  } finally {
    state.startingRun = false;
  }
}

export async function resolveRequestedActiveRun({
  activeRun = null,
  requestedRunId,
  loadRun,
  getRunId = (run) => run?.id,
  isActiveRun = (run) => run?.status === 'active',
  isUnavailableError = () => false
}) {
  if (!requestedRunId || (isActiveRun(activeRun) && getRunId(activeRun) === requestedRunId)) {
    return activeRun;
  }
  try {
    const run = await loadRun(requestedRunId);
    return getRunId(run) === requestedRunId && isActiveRun(run) ? run : activeRun;
  } catch (error) {
    if (!isUnavailableError(error)) throw error;
    return activeRun;
  }
}
