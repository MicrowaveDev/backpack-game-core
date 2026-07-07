import { createRunReadinessManager } from '../readiness.js';

export function createReadyManagerExports(options = {}) {
  const manager = createRunReadinessManager(options);
  return {
    manager,
    setReady: manager.setReady,
    setUnready: manager.setUnready,
    touchActivity: manager.touchActivity,
    isReady: manager.isReady,
    readyStatus: manager.readyStatus,
    areBothReady: manager.readyStatus,
    clearRound: manager.clearRound,
    clearRun: manager.clearRun,
    getIdleRunIds: manager.getIdleRunIds,
    withRunLock: manager.withRunLock
  };
}
