const RUN_RUNTIME_CONTRACT = 'run-runtime/v1';

function requireAdapter(adapters, operation) {
  const adapter = adapters?.[operation];
  if (typeof adapter !== 'function') {
    throw new TypeError(`Run runtime adapter "${operation}" is required`);
  }
  return adapter;
}

function operationPayload(context, values) {
  return {
    ...(context || {}),
    ...values
  };
}

export function createRunRuntimeService({ adapters = {}, hooks = {} } = {}) {
  async function execute(operation, payload) {
    if (typeof hooks.beforeOperation === 'function') {
      await hooks.beforeOperation({ operation, payload, contract: RUN_RUNTIME_CONTRACT });
    }
    const result = await requireAdapter(adapters, operation)(payload);
    if (typeof hooks.afterOperation === 'function') {
      await hooks.afterOperation({ operation, payload, result, contract: RUN_RUNTIME_CONTRACT });
    }
    return result;
  }

  return Object.freeze({
    contract: RUN_RUNTIME_CONTRACT,
    execute,
    startRun: (playerId, input = {}, context = {}) => execute('startRun', operationPayload(context, {
      playerId,
      input
    })),
    getRun: (playerId, runId, context = {}) => execute('getRun', operationPayload(context, {
      playerId,
      runId
    })),
    getActiveRun: (playerId, input = {}, context = {}) => execute('getActiveRun', operationPayload(context, {
      playerId,
      input
    })),
    listRunHistory: (playerId, input = {}, context = {}) => execute('listRunHistory', operationPayload(context, {
      playerId,
      input
    })),
    abandonRun: (playerId, runId, input = {}, context = {}) => execute('abandonRun', operationPayload(context, {
      playerId,
      runId,
      input
    })),
    refreshShop: (playerId, runId, input = {}, context = {}) => execute('refreshShop', operationPayload(context, {
      playerId,
      runId,
      input
    })),
    buyItem: (playerId, runId, assetId, input = {}, context = {}) => execute('buyItem', operationPayload(context, {
      playerId,
      runId,
      assetId,
      input
    })),
    sellItem: (playerId, runId, item, input = {}, context = {}) => execute('sellItem', operationPayload(context, {
      playerId,
      runId,
      item,
      input
    })),
    saveLoadout: (playerId, runId, loadout, context = {}) => execute('saveLoadout', operationPayload(context, {
      playerId,
      runId,
      loadout
    })),
    resolveRound: (playerId, runId, input = {}, context = {}) => execute('resolveRound', operationPayload(context, {
      playerId,
      runId,
      input
    })),
    getLatestReplay: (playerId, runId, context = {}) => execute('getLatestReplay', operationPayload(context, {
      playerId,
      runId
    }))
  });
}
