export interface LoadoutProjectionRow {
  id?: string | number;
  artifactId: string;
  x?: number | string | null;
  y?: number | string | null;
  width?: number | string | null;
  height?: number | string | null;
  active?: boolean | number;
  rotated?: boolean | number;
  freshPurchase?: boolean;
  [key: string]: unknown;
}

export interface ProjectedBuilderItem {
  id?: string | number;
  artifactId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProjectedContainerItem {
  id?: string | number;
  artifactId: string;
}

export interface ProjectedActiveBag {
  id?: string | number;
  artifactId: string;
  anchorX: number;
  anchorY: number;
}

export interface ProjectedRotatedBag {
  id?: string | number;
  artifactId: string;
  rotation: number;
}

export interface LoadoutProjection {
  builderItems: ProjectedBuilderItem[];
  containerItems: ProjectedContainerItem[];
  activeBags: ProjectedActiveBag[];
  rotatedBags: ProjectedRotatedBag[];
  freshPurchases: string[];
}

export interface GridBagRow {
  bagId?: string | number;
  row: number;
  color: string;
  artifactId: string;
  rotation: number;
  enabledCells: number[];
  bboxStart: number;
  bboxEnd: number;
}

export interface GridPropsProjection {
  items: ProjectedBuilderItem[];
  bagRows: GridBagRow[];
  totalRows: number;
}

export interface GridPropsOptions {
  columns?: number;
  minRows?: number;
}

export interface GridCellBagRow {
  bagId?: string | number;
  row: number;
  color?: string;
  artifactId?: string;
  enabledCells?: number[];
  bboxStart?: number;
  bboxEnd?: number;
  [key: string]: unknown;
}

export interface GridBaseRect {
  cols?: number;
  columns?: number;
  rows?: number;
}

export type GridCellClassification = 'base-inv' | 'bag-slot' | 'bag-box' | 'bag-empty';

export interface ArtifactOrientation {
  width: number;
  height: number;
}

export type ArtifactStatBonus = Record<string, unknown>;

export interface ArtifactStatSource {
  id?: string;
  bonus?: ArtifactStatBonus;
  [key: string]: unknown;
}

export interface ArtifactStatLabels {
  [key: string]: string;
}

export interface ArtifactStatSuffixByKey {
  [key: string]: string;
}

export interface ArtifactBonusEntry {
  key: string;
  label: string;
  value: string;
  numericValue: number;
  positive: boolean;
}

export interface AssetPackSummaryLabels {
  invalid?: string;
  disabled?: string;
  unavailable?: string;
  future?: string;
  expired?: string;
  guaranteeTemplate?: string;
  pityTemplate?: string;
  pityReadyTemplate?: string;
  duplicateTemplate?: string;
}

export interface AssetPackPortraitProjection {
  assetId?: string | null;
  packId?: string | null;
  unlocked?: boolean;
  rollAvailable?: boolean;
  [key: string]: unknown;
}

export interface AssetPackSummaryInput {
  id?: string;
  name?: unknown;
  availability?: string;
  status?: string;
  active?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  rollPriceAmount?: number;
  totalItems?: number;
  ownedCount?: number;
  remainingCount?: number;
  rollableCount?: number;
  complete?: boolean;
  uniqueComplete?: boolean;
  copyComplete?: boolean;
  duplicateCopies?: number;
  rollSize?: number;
  nextRollItemCount?: number;
  duplicatePolicy?: { enabled?: boolean; [key: string]: unknown };
  raritySummary?: Array<{ rarity?: string | null; probability?: number; [key: string]: unknown }>;
  guarantees?: { rules?: Array<{ count?: number; minRarity?: string | null; [key: string]: unknown }> };
  pity?: { rules?: Array<{ threshold?: number; remaining?: number; active?: boolean; minRarity?: string | null; [key: string]: unknown }> };
  burn?: { rules?: Array<{ id?: string; ready?: boolean; sourceCount?: number; sourceRarity?: string | null; [key: string]: unknown }> };
  items?: Array<{ assetId?: string | null; rarity?: string | null; dropWeight?: number; [key: string]: unknown }>;
  [key: string]: unknown;
}

export interface AssetRollPackSummary {
  id?: string;
  name: unknown;
  total: number;
  owned: number;
  left: number;
  rollSize: number;
  nextRollItemCount: number;
  active: boolean;
  availabilityLabel: string;
  price: number;
  complete: boolean;
  duplicateEnabled: boolean;
  uniqueComplete: boolean;
  copyComplete: boolean;
  duplicateCopies: number;
  canRoll: boolean;
  canBurn: boolean;
  burnRuleId: string | null;
  burnCost: number;
  burnRarity: string;
  odds: string;
  guaranteeText: string;
  pityText: string;
  duplicateText: string;
}

export interface WalletBundleInput {
  id?: string;
  provider?: string;
  priceAmount?: number;
  priceCurrency?: string;
  [key: string]: unknown;
}

export interface WalletSupportConfig {
  supportUrl?: string;
  termsUrl?: string;
  [key: string]: unknown;
}

export interface WalletSupportLabels {
  support?: string;
  terms?: string;
}

export interface WalletPurchaseSurfaceLabels extends WalletSupportLabels {
  status?: Record<string, string>;
}

export interface WalletPurchaseSurfaceSummary {
  balance: unknown;
  bundles: WalletBundleInput[];
  statusText: string;
  supportEntries: Array<{ label: string; url: string }>;
}

export interface WalletBundlesViewState {
  loading: boolean;
  bundles: WalletBundleInput[];
  surface: string | null;
  errorMessage: string;
}

export type WalletPurchaseIntentStatus = '' | 'confirmed' | 'expired' | 'failed';
export type TelegramInvoiceStatus = 'confirmed' | 'pending' | 'expired' | 'failed';
export type WalletPurchaseClientStatus = 'opening' | 'opened' | 'confirmed' | 'expired' | 'failed' | string;
export type WalletPurchaseNextActionType = 'status' | 'telegram_invoice' | 'web_checkout' | 'unavailable';
export type AssetRollErrorStatus =
  | 'complete'
  | 'burn_unavailable'
  | 'insufficient'
  | 'disabled'
  | 'unavailable'
  | 'invalid'
  | 'failed';
export type AssetRollClientStatus = 'rolling' | 'burning' | 'success' | 'burned' | AssetRollErrorStatus | string;

export interface WalletPurchaseViewState {
  status: WalletPurchaseClientStatus;
  errorMessage: string;
}

export interface WalletPurchaseIntentViewState {
  status: WalletPurchaseIntentStatus;
  handled: boolean;
  shouldRefresh: boolean;
}

export interface WalletPurchaseCheckoutViewState {
  status: 'opened' | 'failed';
  errorMessage: string;
  canOpen: boolean;
}

export interface WalletPurchaseNextAction {
  action: WalletPurchaseNextActionType;
  status: WalletPurchaseClientStatus;
  errorMessage: string;
  shouldRefresh: boolean;
  checkout: Record<string, unknown> | null;
  invoiceLink: unknown | null;
  checkoutUrl: unknown | null;
  viewState: WalletPurchaseIntentViewState | WalletPurchaseCheckoutViewState;
}

export interface AssetRollViewState {
  status: AssetRollClientStatus;
  result: unknown | null;
  errorMessage: string;
  globalErrorMessage: string;
}

export interface AssetRollMutationViewState extends AssetRollViewState {
  shouldRefresh: boolean;
}

export interface GameRunRunState {
  id?: unknown;
  mode?: unknown;
  status?: unknown;
  currentRound?: unknown;
  startedAt?: unknown;
  endedAt?: unknown;
  endReason?: unknown;
  completionBonus?: unknown;
  player?: Record<string, unknown> | null;
  rounds?: unknown[];
  shopOffer?: unknown[];
  loadoutItems?: unknown[];
  [key: string]: unknown;
}

export interface GameRunStartViewState {
  run: GameRunRunState | null;
  rounds: unknown[];
  shopOffer: unknown[];
  refreshCount: number;
  result: null;
  fusionRevealQueue: unknown[];
  errorMessage: string;
}

export interface GameRunReadyViewState {
  waiting: boolean;
  run: GameRunRunState | null;
  result: Record<string, unknown> | null;
  rounds: unknown[];
  battleId: unknown | null;
  battle: unknown | null;
  shouldLoadReplay: boolean;
  shouldShowComplete: boolean;
  completionGameRunId: unknown | null;
  errorMessage: string;
}

export interface GameRunRoundTransitionViewState {
  run: GameRunRunState | null;
  result: null;
  refreshCount: number;
  fusionRevealQueue: unknown[];
  shopOffer: unknown[];
  loadoutItems: unknown[];
  shouldRefreshBootstrap: boolean;
  errorMessage: string;
}

export interface GameRunCompletionViewState {
  run: GameRunRunState | null;
  result: Record<string, unknown> | null;
  rounds: unknown[];
  shopOffer: unknown[];
  errorMessage: string;
}

export interface ReplayTimelineViewState {
  activeEvent: Record<string, unknown> | null;
  activeDisplay: unknown | null;
  activeSpeech: {
    side: unknown;
    narration: unknown;
    parts: unknown[];
  } | null;
  battleStatusText: string;
  replayFinished: boolean;
  activeReplayState: unknown | null;
  visibleReplayEvents: Array<Record<string, unknown>>;
  longBattleSpeedBoost: number;
}

export interface ReplayAutoplayDelayViewState {
  selectedSpeed: number;
  boost: number;
  speed: number;
  baseDelay: number;
  delay: number;
}

export interface ReplayAdvanceTickViewState {
  replayIndex: number;
  finished: boolean;
  shouldStop: boolean;
  shouldRestartTimer: boolean;
  previousBoost: number;
  nextBoost: number;
}

export interface ReplayLoadViewState {
  currentBattle: unknown | null;
  replayIndex: number;
  replaySpeed: number;
  errorMessage: string;
}

export interface ReplaySetSpeedViewState {
  replaySpeed: number;
  settings: Record<string, unknown> | null;
  shouldPersist: boolean;
  errorMessage: string;
}

export interface RunShopItemState {
  id?: string | number | null;
  artifactId?: string | null;
  [key: string]: unknown;
}

export interface RunShopRunState {
  player?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface RunShopRefreshViewState {
  run: RunShopRunState | null;
  shopOffer: unknown[];
  refreshCount: number;
  errorMessage: string;
}

export interface RunShopBuyViewState {
  run: RunShopRunState | null;
  shopOffer: unknown[];
  containerItems: RunShopItemState[];
  freshPurchases: unknown[];
  boughtItem: RunShopItemState | null;
  errorMessage: string;
}

export interface RunShopSellViewState {
  run: RunShopRunState | null;
  deletedRowId: unknown | null;
  deletedArtifactId: unknown | null;
  builderItems: RunShopItemState[];
  containerItems: RunShopItemState[];
  activeBags: RunShopItemState[];
  freshPurchases: unknown[];
  errorMessage: string;
}

export interface GachaAdminDraftFieldChange {
  field: string;
  before: unknown;
  after: unknown;
}

export interface GachaAdminDraftItemChange {
  assetId?: string;
  changes: GachaAdminDraftFieldChange[];
}

export interface GachaAdminDraftDiff {
  missingBase?: boolean;
  changedFields?: GachaAdminDraftFieldChange[];
  addedItems?: string[];
  removedItems?: string[];
  changedItems?: GachaAdminDraftItemChange[];
  [key: string]: unknown;
}

export interface GachaAdminDraftDiffRow {
  type: 'field' | 'item_added' | 'item_removed' | 'item_changed' | string;
  field?: string;
  before: unknown;
  after: unknown;
}

export interface GachaAdminValidationIssueRow {
  severity: 'error' | 'warning' | string;
  [key: string]: unknown;
}

export interface GachaAdminReleaseChecklistRow {
  severity?: 'blocker' | 'warning' | 'pass' | string;
  [key: string]: unknown;
}

export interface GachaAdminPlanItemInput {
  characterId?: string;
  character_id?: string;
  status?: string;
  dropWeight?: unknown;
  drop_weight?: unknown;
  [key: string]: unknown;
}

export interface GachaAdminPlanCharacterInput {
  id: string;
  label?: string;
  [key: string]: unknown;
}

export interface GachaAdminPlanCoverageRow extends GachaAdminPlanCharacterInput {
  count: number;
  readyCount: number;
  totalWeight: number;
  target: number;
  missing: number;
  enough: boolean;
}

export interface GachaAdminOddsPreviewInput {
  raritySummary?: readonly GachaAdminOddsRarityInput[];
  items?: readonly GachaAdminOddsItemInput[];
  preview?: GachaAdminOddsPreviewInput;
  [key: string]: unknown;
}

export interface GachaAdminOddsRarityInput {
  rarity?: string | null;
  probability?: number;
  expectedPerOpen?: number;
  count?: number;
  dropWeight?: unknown;
  [key: string]: unknown;
}

export interface GachaAdminOddsItemInput {
  assetId?: string | null;
  rarity?: string | null;
  probability?: number;
  dropWeight?: unknown;
  copyLimit?: unknown;
  [key: string]: unknown;
}

export interface GachaAdminOddsRarityRow extends GachaAdminOddsRarityInput {
  expectedText: string;
  dropWeightText: unknown;
}

export interface GachaAdminOddsItemRow extends GachaAdminOddsItemInput {
  expectedText: string;
  dropWeightText: unknown;
  copyLimitText: unknown;
}

export interface AssetRollResultItemInput {
  assetName?: unknown;
  assetId?: string | null;
  rarity?: string | null;
  [key: string]: unknown;
}

export interface AssetRollResultInput {
  assetName?: unknown;
  assetId?: string | null;
  rarity?: string | null;
  count?: number;
  items?: readonly AssetRollResultItemInput[];
  [key: string]: unknown;
}

export interface AssetRollFeedbackLabels {
  openingTitle?: string;
  openingText?: string;
  burnOpeningTitle?: string;
  burnOpeningText?: string;
  multiResultTitleTemplate?: string;
  resultTitle?: string;
  resultTemplate?: string;
  burnResultTitle?: string;
  burnResultTemplate?: string;
  problemTitle?: string;
  errors?: Record<string, string>;
}

export interface AssetRollFeedbackSummary {
  status: string;
  title: string;
  text: string;
}

export const DEFAULT_ARTIFACT_STAT_KEYS: string[];
export const DEFAULT_ARTIFACT_STAT_SUFFIX_BY_KEY: ArtifactStatSuffixByKey;
export const LONG_BATTLE_SPEED_BOOST_2X_INDEX: 45;
export const LONG_BATTLE_SPEED_BOOST_3X_INDEX: 90;
export const LONG_BATTLE_SPEED_BOOST_4X_INDEX: 120;
export const DEFAULT_REPLAY_SPEEDS: number[];

export function projectLoadoutItems(
  loadoutItems?: readonly LoadoutProjectionRow[],
  bagArtifactIds?: Iterable<string>,
  getArtifact?: ((artifactId: string) => unknown) | Map<string, unknown> | null
): LoadoutProjection;

export function prepareGridProps(
  loadoutItems?: readonly LoadoutProjectionRow[],
  bagArtifactIds?: Iterable<string>,
  getArtifact?: ((artifactId: string) => unknown) | Map<string, unknown> | null,
  options?: GridPropsOptions
): GridPropsProjection;

export function bagRowEntryFor(
  bagRows: readonly GridCellBagRow[] | null | undefined,
  cx: number,
  cy: number
): GridCellBagRow | null;

export function classifyCell(
  bagRows: readonly GridCellBagRow[] | null | undefined,
  cx: number,
  cy: number,
  baseRect?: GridBaseRect | null
): GridCellClassification;

export function occupiedCellKeys(
  items?: readonly Array<{ x?: number | string | null; y?: number | string | null; width?: number | string | null; height?: number | string | null; [key: string]: unknown }>
): Set<string>;

export function buildOccupiedCellMap<T = unknown>(
  items?: readonly Array<{ x?: number | string | null; y?: number | string | null; width?: number | string | null; height?: number | string | null; [key: string]: unknown }>,
  options?: {
    valueForItem?: (item: Record<string, unknown>) => T;
  }
): Map<string, T>;

export function preferredArtifactOrientation(
  artifact?: { width?: number | string | null; height?: number | string | null; shape?: readonly (readonly unknown[])[] | null; [key: string]: unknown } | null
): ArtifactOrientation;

export function artifactPreviewOrientation(
  artifact?: { family?: string | null; width?: number | string | null; height?: number | string | null; shape?: readonly (readonly unknown[])[] | null; [key: string]: unknown } | null,
  options?: { bagFamily?: string }
): ArtifactOrientation;

export function sumArtifactBonuses(
  items?: readonly Record<string, unknown>[],
  artifacts?: readonly ArtifactStatSource[] | Map<string, ArtifactStatSource> | Record<string, ArtifactStatSource> | ((artifactId: string) => ArtifactStatSource | undefined | null),
  options?: {
    statKeys?: readonly string[];
    getArtifactId?: (item: Record<string, unknown>) => string;
  }
): Record<string, number>;

export function formatStatDelta(
  value: unknown,
  options?: {
    suffix?: string;
    includeSign?: boolean;
    zero?: string;
  }
): string;

export function formatArtifactBonusEntries(
  source?: ArtifactStatSource | ArtifactStatBonus | null,
  options?: {
    labels?: ArtifactStatLabels;
    statKeys?: readonly string[] | null;
    suffixByKey?: ArtifactStatSuffixByKey;
    includeZeroes?: boolean;
  }
): ArtifactBonusEntry[];

export function formatLoadoutStatsText(input?: {
  totals?: ArtifactStatBonus | null;
  items?: readonly Record<string, unknown>[];
  artifacts?: readonly ArtifactStatSource[] | Map<string, ArtifactStatSource> | Record<string, ArtifactStatSource> | ((artifactId: string) => ArtifactStatSource | undefined | null);
  labels?: ArtifactStatLabels;
  statKeys?: readonly string[];
  suffixByKey?: ArtifactStatSuffixByKey;
  separator?: string;
  getArtifactId?: (item: Record<string, unknown>) => string;
}): string;

export function formatAssetPackRarityOdds(
  pack: AssetPackSummaryInput | null | undefined,
  options?: { rarityLabel?: (rarity: unknown) => string }
): string;

export function formatAssetPackGuaranteeText(
  pack: AssetPackSummaryInput | null | undefined,
  options?: { rarityLabel?: (rarity: unknown) => string; template?: string }
): string;

export function formatAssetPackPityText(
  pack: AssetPackSummaryInput | null | undefined,
  options?: { rarityLabel?: (rarity: unknown) => string; template?: string; readyTemplate?: string }
): string;

export function formatAssetPackDuplicateText(
  pack: AssetPackSummaryInput | null | undefined,
  options?: { template?: string }
): string;

export function assetPackIsActive(
  pack: AssetPackSummaryInput | null | undefined,
  options?: { now?: number | string | Date }
): boolean;

export function assetPackAvailabilityLabel(
  pack: AssetPackSummaryInput | null | undefined,
  options?: { now?: number | string | Date; labels?: AssetPackSummaryLabels }
): string;

export function summarizeAssetRollPacks(input?: {
  portraits?: readonly AssetPackPortraitProjection[];
  packs?: readonly AssetPackSummaryInput[];
  ownedAssetIds?: Iterable<string>;
  now?: number | string | Date;
  packName?: (pack: AssetPackSummaryInput) => unknown;
  rarityLabel?: (rarity: unknown) => string;
  labels?: AssetPackSummaryLabels;
}): AssetRollPackSummary[];

export function resolveWalletBalance(input?: {
  wallet?: { balances?: Record<string, unknown> } | null;
  player?: Record<string, unknown> | null;
  currencyCode?: string;
  legacyField?: string;
  fallback?: unknown;
}): unknown;

export function selectWalletBundles(input?: {
  bundles?: readonly WalletBundleInput[];
  bundleSurface?: string | null;
  surface?: string | null;
}): WalletBundleInput[];

export function walletBundlesLoadingViewState(input?: {
  surface?: string | null;
}): WalletBundlesViewState;

export function walletBundlesLoadedViewState(
  bundles?: readonly WalletBundleInput[],
  options?: { surface?: string | null }
): WalletBundlesViewState;

export function walletBundlesErrorViewState(
  error?: unknown,
  options?: {
    surface?: string | null;
    bundles?: readonly WalletBundleInput[];
    fallbackMessage?: string;
  }
): WalletBundlesViewState;

export function formatWalletBundlePrice(
  bundle: WalletBundleInput | null | undefined,
  options?: {
    minorUnitCurrencyDecimals?: Record<string, number>;
    currencySymbols?: Record<string, string>;
  }
): string;

export function walletPurchaseStatusText(
  status: string | null | undefined,
  options?: { labels?: Record<string, string> }
): string;

export function walletSupportEntries(input?: {
  support?: WalletSupportConfig;
  labels?: WalletSupportLabels;
}): Array<{ label: string; url: string }>;

export function summarizeWalletPurchaseSurface(input?: {
  wallet?: { balances?: Record<string, unknown> } | null;
  player?: Record<string, unknown> | null;
  currencyCode?: string;
  legacyField?: string;
  fallbackBalance?: unknown;
  bundles?: readonly WalletBundleInput[];
  bundleSurface?: string | null;
  surface?: string | null;
  status?: string;
  support?: WalletSupportConfig;
  labels?: WalletPurchaseSurfaceLabels;
}): WalletPurchaseSurfaceSummary;

export function walletPurchaseStatusFromIntent(
  intent?: { status?: unknown; checkoutStatus?: unknown; [key: string]: unknown } | null,
  options?: {
    completedStatus?: string;
    expiredStatuses?: readonly string[];
    failedStatuses?: readonly string[];
    checkoutExpiredStatuses?: readonly string[];
    checkoutFailedStatuses?: readonly string[];
  }
): WalletPurchaseIntentStatus;

export function walletPurchaseStatusFromTelegramInvoice(
  status?: unknown
): TelegramInvoiceStatus;

export function walletPurchaseOpeningViewState(input?: {
  status?: WalletPurchaseClientStatus;
}): WalletPurchaseViewState;

export function walletPurchaseIntentViewState(
  intent?: { status?: unknown; checkoutStatus?: unknown; [key: string]: unknown } | null,
  options?: {
    completedStatus?: string;
    expiredStatuses?: readonly string[];
    failedStatuses?: readonly string[];
    checkoutExpiredStatuses?: readonly string[];
    checkoutFailedStatuses?: readonly string[];
  }
): WalletPurchaseIntentViewState;

export function walletPurchaseCheckoutViewState(input?: {
  checkout?: { setupRequired?: boolean; [key: string]: unknown } | null;
  hasTelegramInvoice?: boolean;
  hasWebCheckout?: boolean;
  setupRequiredMessage?: string;
  unavailableMessage?: string;
}): WalletPurchaseCheckoutViewState;

export function walletPurchaseNextAction(
  intent?: { status?: unknown; checkoutStatus?: unknown; checkout?: Record<string, unknown>; [key: string]: unknown } | null,
  options?: {
    hasTelegramInvoice?: boolean;
    hasWebCheckout?: boolean;
    setupRequiredMessage?: string;
    unavailableMessage?: string;
    intentOptions?: Parameters<typeof walletPurchaseIntentViewState>[1];
  }
): WalletPurchaseNextAction;

export function walletPurchaseErrorViewState(
  error?: unknown,
  options?: { fallbackMessage?: string }
): WalletPurchaseViewState;

export function assetRollStatusFromError(
  error?: unknown,
  options?: {
    completePatterns?: readonly string[];
    burnUnavailablePatterns?: readonly string[];
    insufficientPatterns?: readonly string[];
    disabledPatterns?: readonly string[];
    unavailablePatterns?: readonly string[];
    invalidPatterns?: readonly string[];
  }
): AssetRollErrorStatus;

export function assetRollPendingViewState(input?: {
  status?: AssetRollClientStatus;
}): AssetRollViewState;

export function assetRollResultViewState(
  response?: Record<string, unknown> | null,
  options?: {
    successKey?: string | null;
    resultKey?: string | null;
    successStatus?: AssetRollClientStatus;
    failureStatus?: AssetRollClientStatus;
    failureMessage?: string;
  }
): AssetRollViewState;

export function assetRollErrorViewState(
  error?: unknown,
  options?: {
    fallbackMessage?: string;
    globalErrorStatuses?: readonly string[];
    statusOptions?: Parameters<typeof assetRollStatusFromError>[1];
  }
): AssetRollViewState;

export function assetRollMutationResultViewState(
  response?: Record<string, unknown> | null,
  options?: Parameters<typeof assetRollResultViewState>[1] & {
    refreshStatuses?: readonly AssetRollClientStatus[];
  }
): AssetRollMutationViewState;

export function assetRollMutationErrorViewState(
  error?: unknown,
  options?: Parameters<typeof assetRollErrorViewState>[1]
): AssetRollMutationViewState;

export function gameRunStartResultViewState(
  response?: Record<string, unknown> | null
): GameRunStartViewState;

export function gameRunReadyResultViewState(
  response?: { waiting?: unknown; lastRound?: Record<string, unknown> | null; rounds?: unknown[]; battle?: unknown; [key: string]: unknown } | null,
  options?: {
    run?: GameRunRunState | null;
    previousRounds?: readonly unknown[] | null;
  }
): GameRunReadyViewState;

export function gameRunRoundTransitionViewState(
  resolvedRun?: { loadoutItems?: unknown[]; shopOffer?: unknown[]; fusions?: unknown[]; [key: string]: unknown } | null,
  options?: { run?: GameRunRunState | null }
): GameRunRoundTransitionViewState;

export function gameRunCompletionResultViewState(
  response?: Record<string, unknown> | null
): GameRunCompletionViewState;

export function replayLongBattleSpeedBoost(
  eventCount: unknown,
  replayIndex: unknown,
  options?: {
    boost2xIndex?: number;
    boost3xIndex?: number;
    boost4xIndex?: number;
  }
): number;

export function preferredReplaySpeed(
  settings?: { replaySpeed?: unknown; [key: string]: unknown } | null,
  options?: {
    allowedSpeeds?: readonly number[];
    fallback?: number;
  }
): number;

export function replayAutoplayDelayViewState(input?: {
  eventCount?: unknown;
  replayIndex?: unknown;
  replaySpeed?: unknown;
  settings?: { battleSpeed?: unknown; replaySpeed?: unknown; [key: string]: unknown } | null;
  defaultDelayMs?: number;
  fastDelayMs?: number;
  minDelayMs?: number;
}): ReplayAutoplayDelayViewState;

export function replayAdvanceTickViewState(input?: {
  battle?: { events?: readonly Record<string, unknown>[]; [key: string]: unknown } | null;
  replayIndex?: unknown;
}): ReplayAdvanceTickViewState;

export function replayLoadResultViewState(
  battle?: unknown,
  options?: { settings?: { replaySpeed?: unknown; [key: string]: unknown } | null }
): ReplayLoadViewState;

export function replaySetSpeedViewState(
  speed?: unknown,
  options?: {
    settings?: Record<string, unknown> | null;
    allowedSpeeds?: readonly number[];
  }
): ReplaySetSpeedViewState;

export function replayTimelineViewState(input?: {
  battle?: { events?: readonly Record<string, unknown>[]; [key: string]: unknown } | null;
  replayIndex?: unknown;
  formatEvent?: (event: Record<string, unknown>, replayIndex: number) => unknown;
  longBattleSpeedBoost?: (eventCount: unknown, replayIndex: unknown) => number;
}): ReplayTimelineViewState;

export function runShopRefreshResultViewState(
  response?: { coins?: unknown; refreshCount?: unknown; shopOffer?: unknown[]; [key: string]: unknown } | null,
  options?: { run?: RunShopRunState | null }
): RunShopRefreshViewState;

export function runShopBuyResultViewState(
  response?: { id?: string | number | null; artifactId?: string | null; coins?: unknown; shopOffer?: unknown[]; [key: string]: unknown } | null,
  options?: {
    run?: RunShopRunState | null;
    containerItems?: readonly RunShopItemState[];
    freshPurchases?: readonly unknown[];
    artifactId?: string | null;
  }
): RunShopBuyViewState;

export function runShopSellResultViewState(
  response?: { id?: string | number | null; artifactId?: string | null; coins?: unknown; [key: string]: unknown } | null,
  options?: {
    run?: RunShopRunState | null;
    builderItems?: readonly RunShopItemState[];
    containerItems?: readonly RunShopItemState[];
    activeBags?: readonly RunShopItemState[];
    freshPurchases?: readonly unknown[];
    target?: RunShopItemState | string | null;
  }
): RunShopSellViewState;

export function gachaAdminDraftDiffRows(
  diff?: GachaAdminDraftDiff | null
): GachaAdminDraftDiffRow[];

export function gachaAdminValidationIssueRows(
  validation?: { errors?: readonly Record<string, unknown>[]; warnings?: readonly Record<string, unknown>[] } | null
): GachaAdminValidationIssueRow[];

export function gachaAdminReleaseChecklistRows(
  checklist?: {
    blockers?: readonly Record<string, unknown>[];
    warnings?: readonly Record<string, unknown>[];
    passed?: readonly Record<string, unknown>[];
  } | null
): GachaAdminReleaseChecklistRow[];

export function gachaAdminPlanTotalWeight(
  planItems?: readonly GachaAdminPlanItemInput[]
): number;

export function gachaAdminPlanCoverageRows(
  planItems?: readonly GachaAdminPlanItemInput[],
  options?: {
    characters?: readonly GachaAdminPlanCharacterInput[];
    targetPerCharacter?: unknown;
  }
): GachaAdminPlanCoverageRow[];

export function gachaAdminPlanChanceText(
  item?: GachaAdminPlanItemInput | null,
  options?: {
    totalWeight?: unknown;
    formatPercent?: (value: number) => string;
  }
): string;

export function gachaAdminOddsRarityRows(
  source?: GachaAdminOddsPreviewInput | readonly GachaAdminOddsRarityInput[] | null,
  options?: { formatPercent?: (value: number) => string }
): GachaAdminOddsRarityRow[];

export function gachaAdminOddsItemRows(
  source?: GachaAdminOddsPreviewInput | readonly GachaAdminOddsItemInput[] | null,
  options?: {
    limit?: number;
    formatPercent?: (value: number) => string;
  }
): GachaAdminOddsItemRow[];

export function formatAssetRollResultName(
  result: AssetRollResultInput | null | undefined,
  options?: { localizeName?: (value: unknown) => string }
): string;

export function formatAssetRollResultItemsText(
  result: AssetRollResultInput | null | undefined,
  options?: {
    localizeName?: (value: unknown) => string;
    rarityLabel?: (rarity: unknown) => string;
    itemSeparator?: string;
    resultSeparator?: string;
    limit?: number;
  }
): string;

export function summarizeAssetRollFeedback(input?: {
  status?: string;
  result?: AssetRollResultInput | null;
  errorMessage?: string;
  labels?: AssetRollFeedbackLabels;
  localizeName?: (value: unknown) => string;
  rarityLabel?: (rarity: unknown) => string;
}): AssetRollFeedbackSummary | null;
