export interface GameRunLoadoutPortOptions {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }>;
  bagColumns: number;
  getArtifactById: (artifactId: string) => unknown;
  createId: (prefix: string) => string;
  nowIso: () => string;
  getEffectiveShape: (artifact: unknown, rotated?: unknown) => unknown;
  normalizeRotation: (rotated?: unknown) => number;
  effectiveGridHeight: (items: unknown[]) => number;
  pieceCells: (item: unknown, shape?: unknown) => string[];
  validateBagPlacement: (items: unknown[]) => unknown;
  validateGridItems: (items: unknown[], columns: number, rows: number) => unknown;
  validateItemCoverage: (items: unknown[]) => unknown;
  isBag: (artifact: unknown) => boolean;
}

export interface GameRunLoadoutPort {
  applyRunPlacements(client: unknown, gameRunId: string, playerId: string, roundNumber: number, items: unknown[]): Promise<void>;
  copyRoundForward(client: unknown, gameRunId: string, playerId: string, fromRound: number, toRound: number): Promise<number>;
  deleteLoadoutItem(client: unknown, itemId: string): Promise<void>;
  deleteLoadoutItemByIdScoped(client: unknown, input: {
    rowId: string;
    gameRunId: string;
    playerId: string;
    roundNumber: number;
  }): Promise<unknown>;
  deleteOneByArtifactId(client: unknown, gameRunId: string, playerId: string, roundNumber: number, artifactId: string): Promise<unknown>;
  insertLoadoutItem(client: unknown, params: Record<string, unknown>): Promise<string>;
  insertRefund(client: unknown, params: Record<string, unknown>): Promise<void>;
  nextSortOrder(client: unknown, gameRunId: string, playerId: string, roundNumber: number): Promise<number>;
  readCurrentRoundItems(client: unknown, gameRunId: string, playerId: string, roundNumber: number): Promise<unknown[]>;
}

export function createGameRunLoadoutPort(options: GameRunLoadoutPortOptions): GameRunLoadoutPort;
