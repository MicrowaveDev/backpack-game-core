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

export interface MushroomPlayerServicePortOptions {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }>;
  withTransaction: <T>(fn: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }> }) => Promise<T>) => Promise<T>;
  getMushroomById: (mushroomId: string) => unknown;
  getTier: (level: number) => string;
  mushrooms: Array<{ id: string }>;
  starterPresetVariants: Record<string, Array<Record<string, unknown> & { id: string; requiredLevel: number }>>;
  computeCharacterLevel: (characterXp: number) => { level: number; current: number; next: number | null };
  createId: (prefix: string) => string;
  nowIso: () => string;
  nowDate?: () => Date;
  getSeasonLevel: (points: number) => { id: string };
  createBotGhostSnapshot: (seed: string, mushroomId: string) => Record<string, unknown>;
  equipPortrait: (playerId: string, mushroomId: string, portraitId: string) => Promise<unknown>;
  getPlayerCosmeticState: (playerId: string) => Promise<{ equippedByTarget: Map<string, { assetId: string }> }>;
  getRuntimeAssetCatalog: () => Promise<unknown[]>;
  getRuntimePortraitVariantsForResponse: () => Promise<Record<string, Array<{ id: string; path?: string }>>>;
  parsePortraitAssetId: (assetId: string) => { mushroomId?: string; portraitId?: string } | null;
  shapePortraitVariantsForCharacter: (params: Record<string, unknown>) => unknown[];
  getWalletState: (playerId: string) => Promise<Record<string, unknown> & { balance: number }>;
  createChallengeRun: (challengerPlayerId: string, inviteePlayerId: string, challengeId: string) => Promise<unknown>;
}

export interface MushroomPlayerServicePort {
  acceptFriendChallenge(challengeId: string, playerId: string): Promise<unknown>;
  addFriendByCode(playerId: string, friendCode: string): Promise<unknown[]>;
  createRunChallenge(playerId: string, inviteePlayerId: string): Promise<unknown>;
  declineFriendChallenge(challengeId: string, playerId: string): Promise<unknown>;
  getFriendChallenge(challengeId: string): Promise<unknown>;
  getFriends(playerId: string): Promise<unknown[]>;
  getInventoryReviewSamples(): Promise<unknown[]>;
  getLeaderboard(): Promise<unknown[]>;
  getPlayerState(playerId: string): Promise<unknown>;
  saveLocalTestRun(payload: unknown): Promise<unknown>;
  selectActiveMushroom(playerId: string, mushroomId: string): Promise<unknown>;
  switchPortrait(playerId: string, mushroomId: string, portraitId: string): Promise<unknown>;
  switchPreset(playerId: string, mushroomId: string, presetId: string): Promise<unknown>;
  updateSettings(playerId: string, payload: Record<string, unknown>): Promise<unknown>;
}

export interface MushroomRunServicePortOptions {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }>;
  withTransaction: <T>(fn: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }> }) => Promise<T>) => Promise<T>;
  challengeWinnerBonus: Record<string, unknown>;
  getEligibleCharacterItems: (characterId: string, level: number) => unknown[];
  dailyBattleLimit: number;
  getArtifactById: (artifactId: string) => unknown;
  getArtifactPrice: (artifact: unknown) => number;
  getCompletionBonus: (wins: number) => Record<string, unknown>;
  getTier: (level: number) => string;
  completedRunMaxAgeDays: number;
  ghostBotMaxAgeDays: number;
  ghostBudgetDiscount: number;
  ghostSnapshotMaxCount: number;
  getStarterPreset: (characterId: string, presetId?: string | null) => unknown[];
  maxRoundsPerRun: number;
  mushrooms: Array<{ id: string }>;
  ratingFloor: number;
  roundIncome: number[];
  runRewardTable: Array<Record<string, unknown>>;
  shopOfferSize: number;
  startingLives: number;
  portraitUrl: (characterId: string, portraitId?: string | null) => string;
  computeCharacterLevel: (characterXp: number) => { level: number };
  createId: (prefix: string) => string;
  createRng: (seed: string) => () => number;
  dayKey: (date: Date) => string;
  expectedScore: (ratingA: number, ratingB: number) => number;
  kFactor: (ratedBattleCount: number) => number;
  nowIso: () => string;
  parseJson: (value: unknown, fallback: unknown) => unknown;
  runCurrencyFields: (coins: number) => Record<string, unknown>;
  shuffleWithRng: <T>(items: T[], rng: () => number) => T[];
  simulateBattle: (snapshot: Record<string, unknown>, seed: string) => unknown;
  getActiveSnapshot: (client: unknown, playerId: string) => Promise<unknown>;
  getDailyUsage: (client: unknown, playerId: string) => Promise<number>;
  getBattle: (battleId: string, viewerPlayerId: string, client?: unknown) => Promise<unknown>;
  recordBattle: (client: unknown, params: Record<string, unknown>) => Promise<unknown>;
  withRunLock: <T>(gameRunId: string, fn: () => Promise<T>) => Promise<T>;
  createBotGhostSnapshot: (seed: string, characterId: string, budget?: number) => Record<string, unknown>;
  createBotLoadout: (character: unknown, rng: () => number, budget: number) => unknown[];
  generateShopOffer: (rng: () => number, count?: number, roundsSinceBag?: number, eligibleItems?: unknown[]) => unknown;
  lookupEligibleCharacterItems: (client: unknown, playerId: string, mode: string, gameRunId: string) => Promise<unknown[]>;
  applyRunPlacements: (client: unknown, gameRunId: string, playerId: string, roundNumber: number, items: unknown[]) => Promise<void>;
  copyRoundForward: (client: unknown, gameRunId: string, playerId: string, fromRound: number, toRound: number) => Promise<number>;
  insertLoadoutItem: (client: unknown, params: Record<string, unknown>) => Promise<string>;
  readCurrentRoundItems: (client: unknown, gameRunId: string, playerId: string, roundNumber: number) => Promise<unknown[]>;
  applyRoundStartFusions: (client: unknown, gameRunId: string, playerId: string, roundNumber: number) => Promise<unknown[]>;
  readFusionReveals: (client: unknown, gameRunId: string, playerId: string, resultRoundNumber: number) => Promise<unknown[]>;
  awardRunSeasonProgress: (client: unknown, params: Record<string, unknown>) => Promise<unknown>;
  getEarnedRunAchievements: (context: Record<string, unknown>, lang?: string, options?: Record<string, unknown>) => unknown[];
  getSeasonLevel: (points: number) => { id: string };
  getSeasonPointsBreakdown: (context: Record<string, unknown>) => Record<string, unknown>;
  seasonLevelRank: (levelId: string) => number;
  grantCurrency: (client: unknown, params: Record<string, unknown>) => Promise<unknown>;
  resolveEquippedPortraitId: (client: unknown, playerId: string, characterId: string) => Promise<string>;
}

export interface MushroomRunServicePort {
  abandonGameRun(playerId: string, gameRunId: string): Promise<unknown>;
  applyRunLoadoutPlacements(playerId: string, gameRunId: string, items: unknown[]): Promise<unknown>;
  createChallengeRun(challengerPlayerId: string, inviteePlayerId: string, challengeId: string): Promise<unknown>;
  getActiveGameRun(playerId: string, characterId?: string | null): Promise<unknown>;
  getActiveGameRuns(playerId: string): Promise<unknown[]>;
  getGameRun(gameRunId: string, viewerPlayerId: string): Promise<unknown>;
  getGameRunHistory(playerId: string, limit?: number): Promise<unknown[]>;
  pruneCompletedRuns(maxAgeDays?: number): Promise<unknown>;
  pruneOldGhostSnapshots(maxBotAgeDays?: number, maxSnapshotCount?: number): Promise<unknown>;
  resolveRound(playerId: string, gameRunId: string): Promise<unknown>;
  startGameRun(playerId: string, mode?: string): Promise<unknown>;
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
export function createMushroomPlayerServicePort(options: MushroomPlayerServicePortOptions): MushroomPlayerServicePort;
export function createMushroomRunServicePort(options: MushroomRunServicePortOptions): MushroomRunServicePort;
export function createMushroomBattleEnginePort(options: MushroomBattleEnginePortOptions): MushroomBattleEnginePort;
export function createMushroomBattleServicePort(options: MushroomBattleServicePortOptions): MushroomBattleServicePort;
export function createMushroomShopServicePort(options: MushroomShopServicePortOptions): MushroomShopServicePort;
export function createGameRunLoadoutPort(options: GameRunLoadoutPortOptions): GameRunLoadoutPort;
export function createSeasonProgressPort(options: SeasonProgressPortOptions): SeasonProgressPort;
export function randomInt(rng: () => number, max: number): number;
export function shuffleWithRng<T>(items: T[], rng: () => number): T[];
