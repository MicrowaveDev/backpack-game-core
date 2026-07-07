export interface ArtifactFusionPortOptions {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }>;
  getArtifactById: (artifactId: string) => unknown;
  createId: (prefix: string) => string;
  nowIso: () => string;
  findArtifactFusionMatches: (rows: unknown[], getArtifactById: (artifactId: string) => unknown) => unknown[];
  readCurrentRoundItems: (client: unknown, gameRunId: string, playerId: string, roundNumber: number) => Promise<unknown[]>;
  nextSortOrder: (client: unknown, gameRunId: string, playerId: string, roundNumber: number) => Promise<number>;
  deleteLoadoutItem: (client: unknown, itemId: string) => Promise<void>;
  insertLoadoutItem: (client: unknown, params: Record<string, unknown>) => Promise<string>;
}

export interface ArtifactFusionPort {
  applyRoundStartFusions(client: unknown, gameRunId: string, playerId: string, roundNumber: number): Promise<unknown[]>;
  readFusionReveals(client: unknown, gameRunId: string, playerId: string, resultRoundNumber: number): Promise<unknown[]>;
}

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

export interface SeasonProgressPortOptions {
  currentSeasonId?: string;
  createId: (prefix: string) => string;
  nowIso: () => string;
  calculateRawSeasonPoints: (context: Record<string, unknown>) => number;
  getSeasonPointsBreakdown: (context: Record<string, unknown>) => Record<string, unknown>;
  getSeasonLevel: (points: number) => { id: string };
  applySeasonPointProtection: (context: { runPoints: number }) => number;
  seasonLevelRank: (levelId: string) => number;
  getAwardableRunAchievements: (
    context: Record<string, unknown>,
    lang?: string,
    options?: { alreadyEarnedIds?: string[] }
  ) => Array<{ id: string }>;
}

export interface SeasonProgressPort {
  awardRunSeasonProgress(client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }> }, params: {
    playerId: string;
    gameRunId: string;
    characterId?: string | null;
    mushroomId?: string | null;
    endReason?: string | null;
    lastOutcome?: string | null;
    wins?: number;
    losses?: number;
    completedRounds?: number;
    livesRemaining?: number;
  }): Promise<unknown>;
}

export function createArtifactFusionPort(options: ArtifactFusionPortOptions): ArtifactFusionPort;
export function createGameRunLoadoutPort(options: GameRunLoadoutPortOptions): GameRunLoadoutPort;
export function createSeasonProgressPort(options: SeasonProgressPortOptions): SeasonProgressPort;
