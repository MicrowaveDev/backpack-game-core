export interface RunRuntimeContext {
  [key: string]: unknown;
}

export interface RunRuntimeOperationPayload extends RunRuntimeContext {
  playerId?: unknown;
  runId?: unknown;
  assetId?: unknown;
  item?: unknown;
  input?: unknown;
  loadout?: unknown;
}

export interface RunRuntimeHooks {
  beforeOperation?: (event: {
    operation: string;
    payload: RunRuntimeOperationPayload;
    contract: 'run-runtime/v1';
  }) => unknown | Promise<unknown>;
  afterOperation?: (event: {
    operation: string;
    payload: RunRuntimeOperationPayload;
    result: unknown;
    contract: 'run-runtime/v1';
  }) => unknown | Promise<unknown>;
}

export interface RunRuntimeService {
  readonly contract: 'run-runtime/v1';
  execute(operation: string, payload: RunRuntimeOperationPayload): Promise<unknown>;
  startRun(playerId: unknown, input?: unknown, context?: RunRuntimeContext): Promise<unknown>;
  getRun(playerId: unknown, runId: unknown, context?: RunRuntimeContext): Promise<unknown>;
  getActiveRun(playerId: unknown, input?: unknown, context?: RunRuntimeContext): Promise<unknown>;
  listRunHistory(playerId: unknown, input?: unknown, context?: RunRuntimeContext): Promise<unknown>;
  abandonRun(playerId: unknown, runId: unknown, input?: unknown, context?: RunRuntimeContext): Promise<unknown>;
  refreshShop(playerId: unknown, runId: unknown, input?: unknown, context?: RunRuntimeContext): Promise<unknown>;
  buyItem(playerId: unknown, runId: unknown, assetId: unknown, input?: unknown, context?: RunRuntimeContext): Promise<unknown>;
  sellItem(playerId: unknown, runId: unknown, item: unknown, input?: unknown, context?: RunRuntimeContext): Promise<unknown>;
  saveLoadout(playerId: unknown, runId: unknown, loadout: unknown, context?: RunRuntimeContext): Promise<unknown>;
  resolveRound(playerId: unknown, runId: unknown, input?: unknown, context?: RunRuntimeContext): Promise<unknown>;
  getLatestReplay(playerId: unknown, runId: unknown, context?: RunRuntimeContext): Promise<unknown>;
}

export function createRunRuntimeService(options?: {
  adapters?: Record<string, (payload: RunRuntimeOperationPayload) => unknown | Promise<unknown>>;
  hooks?: RunRuntimeHooks;
}): RunRuntimeService;
