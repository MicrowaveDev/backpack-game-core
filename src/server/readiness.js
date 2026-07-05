export function createKeyedAsyncMutex() {
  const locks = new Map();

  async function withLock(key, fn) {
    let releaseLock;
    const lockPromise = new Promise((resolve) => {
      releaseLock = resolve;
    });
    const previousLock = locks.get(key) || Promise.resolve();
    locks.set(key, lockPromise);

    await previousLock;

    try {
      return await fn();
    } finally {
      if (locks.get(key) === lockPromise) locks.delete(key);
      releaseLock();
    }
  }

  return {
    withLock,
    clear(key) {
      locks.delete(key);
    },
    clearAll() {
      locks.clear();
    },
    has(key) {
      return locks.has(key);
    }
  };
}

export function createRunReadinessManager({
  now = () => Date.now(),
  requiredReadyCount = 2
} = {}) {
  const readyStates = new Map();
  const lastActivity = new Map();
  const mutex = createKeyedAsyncMutex();

  function touchActivity(runId) {
    lastActivity.set(runId, now());
  }

  function setReady(runId, playerId) {
    if (!readyStates.has(runId)) readyStates.set(runId, new Map());
    readyStates.get(runId).set(playerId, true);
    touchActivity(runId);
  }

  function setUnready(runId, playerId) {
    const run = readyStates.get(runId);
    if (run) run.set(playerId, false);
    touchActivity(runId);
  }

  function isReady(runId, playerId) {
    const run = readyStates.get(runId);
    return run ? run.get(playerId) === true : false;
  }

  function readyStatus(runId) {
    const run = readyStates.get(runId);
    if (!run) return { ready: false, playerIds: null };

    const readyPlayers = [];
    for (const [playerId, ready] of run) {
      if (ready) readyPlayers.push(playerId);
    }

    if (readyPlayers.length >= requiredReadyCount) {
      return { ready: true, playerIds: readyPlayers.slice(0, requiredReadyCount) };
    }
    return { ready: false, playerIds: null };
  }

  function clearRound(runId) {
    const run = readyStates.get(runId);
    if (!run) return;
    for (const playerId of run.keys()) run.set(playerId, false);
  }

  function clearRun(runId) {
    readyStates.delete(runId);
    lastActivity.delete(runId);
    mutex.clear(runId);
  }

  function getIdleRunIds(timeoutMs) {
    const currentTime = now();
    const idle = [];
    for (const [runId, timestamp] of lastActivity) {
      if (currentTime - timestamp >= timeoutMs) idle.push(runId);
    }
    return idle;
  }

  function clearAll() {
    readyStates.clear();
    lastActivity.clear();
    mutex.clearAll();
  }

  return {
    setReady,
    setUnready,
    touchActivity,
    isReady,
    readyStatus,
    clearRound,
    clearRun,
    clearAll,
    getIdleRunIds,
    withRunLock: mutex.withLock
  };
}
