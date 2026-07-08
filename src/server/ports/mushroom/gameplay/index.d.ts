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

export interface MushroomGameServicePortOptions {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }>;
  artifacts: unknown[];
  dailyBattleLimit: number;
  mushroomsForResponse: () => unknown[];
  dayKey: (date: Date) => string;
  nextUtcReset: (date: Date) => Date;
  getBattleHistory: (playerId: string, limit?: number) => Promise<unknown[]>;
  getPlayerState: (playerId: string) => Promise<Record<string, unknown>>;
  getActiveGameRuns: (playerId: string) => Promise<Array<Record<string, unknown>>>;
  getGameRunHistory: (playerId: string, limit?: number) => Promise<unknown[]>;
  getHomeFieldConfig: () => unknown;
  directBuyPolicy: () => string;
  getAssetPacksForPlayer: (playerId: string) => Promise<Array<{ id: string; active?: boolean }>>;
  getRuntimeAssetCatalog: () => Promise<unknown[]>;
  isAssetGachaEnabled: () => boolean;
}

export interface MushroomGameServicePort {
  getBootstrap(playerId: string): Promise<unknown>;
}

export interface MushroomBattleEnginePortOptions {
  getArtifactById: (artifactId: string) => unknown;
  getMushroomById: (mushroomId: string) => {
    id: string;
    name: Record<string, string>;
    styleTag?: string;
    passive?: unknown;
    active?: unknown;
    baseStats: {
      health: number;
      attack: number;
      speed: number;
      defense: number;
    };
  };
  buildArtifactSummary: (items?: unknown[]) => {
    damage?: number;
    speed?: number;
    armor?: number;
    stunChance?: number;
  };
  createRng: (seed: string) => () => number;
  stepCap: number;
  maxStunChance: number;
}

export interface MushroomBattleEnginePort {
  simulateBattle(snapshot: {
    left: Record<string, unknown>;
    right: Record<string, unknown>;
  }, seed: string): unknown;
}

export interface MushroomBattleServicePortOptions {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }>;
  getMushroomById: (mushroomId: string) => { name: Record<string, string> };
  getStarterPresetCost: (mushroomId: string) => number;
  bagColumns: number;
  roundIncome: number[];
  portraitUrl: (mushroomId: string, portraitId?: string | null) => string;
  createId: (prefix: string) => string;
  dayKey: (date: Date) => string;
  nowIso: () => string;
  parseJson: (value: unknown, fallback: unknown) => unknown;
  effectiveGridHeight: (items: unknown[]) => number;
  validateLoadoutItems: (items: unknown[], runBudget: number) => unknown;
  normalizeRotation: (rotated?: unknown) => number;
  resolveEquippedPortraitId: (client: unknown, playerId: string, mushroomId: string) => Promise<string>;
}

export interface MushroomBattleServicePort {
  getActiveSnapshot(client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }> }, playerId: string): Promise<unknown>;
  getDailyUsage(client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }> }, playerId: string): Promise<number>;
  recordBattle(client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }> }, params: Record<string, unknown>): Promise<unknown>;
  getBattle(battleId: string, viewerPlayerId: string, existingClient?: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }> } | null): Promise<unknown>;
  getBattleHistory(playerId: string, limit?: number): Promise<unknown[]>;
}

export interface MushroomShopServicePortOptions {
  withTransaction: <T>(fn: (client: unknown) => Promise<T>) => Promise<T>;
  withRunLock: <T>(gameRunId: string, fn: () => Promise<T>) => Promise<T>;
  bagBaseChance: number;
  bagEscalationStep: number;
  bagPityThreshold: number;
  bags: unknown[];
  combatArtifacts: unknown[];
  getArtifactById: (artifactId: string) => unknown;
  getArtifactPrice: (artifact: unknown) => number;
  getEligibleCharacterItems: (characterId: string, level: number) => unknown[];
  getShopRefreshCost: (refreshCount: number) => number;
  shopOfferSize: number;
  computeCharacterLevel: (characterXp: number) => { level: number };
  createRng: (seed: string) => () => number;
  nowIso: () => string;
  parseJson: (value: unknown, fallback: unknown) => unknown;
  runCurrencyFields: (coins: number) => Record<string, unknown>;
  isBag: (artifact: unknown) => boolean;
  bagsContainingItem: (item: unknown, bags: unknown[]) => unknown[];
  deleteLoadoutItemByIdScoped: (client: unknown, params: Record<string, unknown>) => Promise<unknown>;
  deleteOneByArtifactId: (
    client: unknown,
    gameRunId: string,
    playerId: string,
    roundNumber: number,
    artifactId: string
  ) => Promise<unknown>;
  insertLoadoutItem: (client: unknown, params: Record<string, unknown>) => Promise<string>;
  insertRefund: (client: unknown, params: Record<string, unknown>) => Promise<void>;
  nextSortOrder: (client: unknown, gameRunId: string, playerId: string, roundNumber: number) => Promise<number>;
  readCurrentRoundItems: (client: unknown, gameRunId: string, playerId: string, roundNumber: number) => Promise<unknown[]>;
}

export interface MushroomShopServicePort {
  lookupEligibleCharacterItems(client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }> }, playerId: string, mode: string, gameRunId: string): Promise<unknown[]>;
  generateShopOffer(rng: () => number, count?: number, roundsSinceBag?: number, eligibleCharacterItems?: unknown[]): unknown;
  buyRunShopItem(playerId: string, gameRunId: string, artifactId: string): Promise<unknown>;
  refreshRunShop(playerId: string, gameRunId: string): Promise<unknown>;
  forceRunShopForTest(playerId: string, gameRunId: string, artifactIds: string[]): Promise<unknown>;
  sellRunItem(playerId: string, gameRunId: string, target: string | Record<string, unknown>): Promise<unknown>;
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
export function createMushroomGameServicePort(options: MushroomGameServicePortOptions): MushroomGameServicePort;
export function createMushroomBattleEnginePort(options: MushroomBattleEnginePortOptions): MushroomBattleEnginePort;
export function createMushroomBattleServicePort(options: MushroomBattleServicePortOptions): MushroomBattleServicePort;
export function createMushroomShopServicePort(options: MushroomShopServicePortOptions): MushroomShopServicePort;
export function createGameRunLoadoutPort(options: GameRunLoadoutPortOptions): GameRunLoadoutPort;
export function createSeasonProgressPort(options: SeasonProgressPortOptions): SeasonProgressPort;
export function randomInt(rng: () => number, max: number): number;
export function shuffleWithRng<T>(items: T[], rng: () => number): T[];
