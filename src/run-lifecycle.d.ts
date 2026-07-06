export interface RunShopStatePlan {
  roundNumber?: number;
  refreshCount: number;
  roundsSinceBag: number;
  shopOffer: unknown[];
}

export interface RunStarterLoadoutDraft {
  gameRunId: string | null;
  playerId: string | null;
  roundNumber: number;
  artifactId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  active?: boolean;
  rotated?: number;
  sortOrder: number;
  purchasedRound: number;
  freshPurchase: boolean;
}

export interface RunStartPlan {
  gameRunDraft: {
    id: string | null;
    mode: string;
    status: 'active';
    currentRound: number;
    startedAt: string | null;
  };
  playerDraft: {
    id: string | null;
    gameRunId: string | null;
    playerId: string | null;
    mushroomId: string | null;
    isActive: boolean;
    completedRounds: number;
    wins: number;
    losses: number;
    livesRemaining: number;
    coins: number;
  };
  shopStateDraft: RunShopStatePlan;
  loadoutDrafts: RunStarterLoadoutDraft[];
  response: {
    id: string | null;
    mode: string;
    status: 'active';
    mushroomId: string | null;
    currentRound: number;
    startedAt: string | null;
    endedAt: null;
    endReason: null;
    shopOffer: unknown[];
    starterItems: unknown[];
    player: RunStartPlan['playerDraft'];
  };
}

export interface RunGhostBudgetPlan {
  playerSpent: number;
  roundNumber: number;
  cumulativeIncome: number;
  graceFactor: number;
  base: number;
  ghostBudget: number;
}

export interface RunRoundResolutionPlan {
  outcome: unknown;
  roundNumber: number;
  rewards: {
    spore: number;
    mycelium: number;
  };
  awards: {
    spore: number;
    mycelium: number;
  };
  roundIncome: number;
  player: {
    completedRounds: number;
    wins: number;
    losses: number;
    livesRemaining: number;
    coins: number;
  };
  runEnded: boolean;
  endReason: 'max_losses' | 'max_rounds' | null;
  status: 'active' | 'completed';
  currentRound: number;
  nextRound: number | null;
}

export interface RunGroupCompletionPlan {
  runEnded: boolean;
  endReason: 'max_losses' | 'max_rounds' | null;
  anyEliminated: boolean;
  allMaxRounds: boolean;
}

export interface RunStateSummary {
  id?: unknown;
  mode?: unknown;
  status?: unknown;
  currentRound?: unknown;
  characterId?: unknown;
  mushroomId?: unknown;
  player: Record<string, unknown>;
  shopOffer: unknown[];
  shopItems: unknown[];
  loadoutItems: unknown[];
  loadoutCost: unknown;
  loadoutTotals: unknown;
  refreshCount?: unknown;
  battles: unknown[];
  lastBattle: unknown | null;
  createdAt?: unknown;
  updatedAt?: unknown;
  endedAt?: unknown;
  endReason?: unknown;
}

export function createRunInitialShopStatePlan(options?: {
  shopOffer?: unknown[];
  hasBag?: boolean;
  initialRoundsSinceBag?: unknown;
  refreshCount?: unknown;
}): RunShopStatePlan;

export function createRunRoundShopStatePlan(options?: {
  previousRoundsSinceBag?: unknown;
  shopOffer?: unknown[];
  hasBag?: boolean;
}): RunShopStatePlan;

export function createRunStarterLoadoutDrafts(options?: {
  gameRunId?: string | null;
  playerId?: string | null;
  roundNumber?: unknown;
  starterBag?: Partial<RunStarterLoadoutDraft> & { artifactId?: string };
  starterItems?: Array<Partial<RunStarterLoadoutDraft> & { artifactId: string }>;
}): RunStarterLoadoutDraft[];

export function createRunStartPlan(options?: {
  runId?: string | null;
  mode?: string;
  playerId?: string | null;
  mushroomId?: string | null;
  runPlayerId?: string | null;
  startedAt?: string | null;
  initialCoins?: unknown;
  startingLives?: unknown;
  shopOffer?: unknown[];
  shopHasBag?: boolean;
  initialRoundsSinceBag?: unknown;
  starterBag?: Partial<RunStarterLoadoutDraft> & { artifactId?: string };
  starterItems?: Array<Partial<RunStarterLoadoutDraft> & { artifactId: string }>;
}): RunStartPlan;

export function createRunGhostBudgetPlan(options?: {
  playerSpent?: unknown;
  roundNumber?: unknown;
  roundIncome?: unknown[];
  ghostBudgetDiscount?: unknown;
  floor?: unknown;
}): RunGhostBudgetPlan;

export function createRunRoundResolutionPlan(options?: {
  outcome?: unknown;
  roundNumber?: unknown;
  playerState?: Record<string, unknown>;
  roundIncome?: unknown[];
  rewardTable?: Record<string, { spore?: unknown; mycelium?: unknown }>;
  rewardMultiplier?: unknown;
  maxRounds?: unknown;
}): RunRoundResolutionPlan;

export function createRunGroupCompletionPlan(options?: {
  playerResults?: unknown[] | Record<string, unknown>;
  maxRounds?: unknown;
}): RunGroupCompletionPlan;

export function shapeRunStateSummary(
  run?: Record<string, unknown>,
  options?: {
    getLoadoutTotals?: (loadoutItems: unknown[], context: { run: Record<string, unknown>; player: Record<string, unknown> }) => unknown;
    getLoadoutCost?: (loadoutItems: unknown[], context: { run: Record<string, unknown>; player: Record<string, unknown> }) => unknown;
    getShopItems?: (
      shopOffer: unknown[],
      loadoutItems: unknown[],
      context: {
        run: Record<string, unknown>;
        player: Record<string, unknown>;
        availableBudget: number;
      }
    ) => unknown[];
    shapeBattleSummary?: (battle: Record<string, unknown>, context: { run: Record<string, unknown> }) => unknown;
  }
): RunStateSummary;
