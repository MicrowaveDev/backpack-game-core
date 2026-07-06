import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAssetGachaRollSettlementPlan,
  resolveAssetCatalogAcquisitionPolicy,
  resolveAssetGachaRollCandidates,
  selectAssetGachaRollResults,
  shapeAssetGachaBurnResult,
  shapeAssetGachaPack,
  shapeAssetGachaRollResult,
  validateAssetGachaPack
} from '@microwavedev/backpack-game-core/modules/gacha';
import {
  assetGachaPackRollSize,
  validateAssetGachaPack as validateAssetGachaPackOnly
} from '@microwavedev/backpack-game-core/modules/gacha/validation';
import {
  buildGachaAdminPackDraftDiff,
  createGachaAdminReleaseChecklist,
  gachaAdminPackSnapshot,
  normalizeGachaAdminFixture,
  summarizeGachaAdminFixtureOperations
} from '@microwavedev/backpack-game-core/modules/gacha/admin-validation';
import {
  simulateAssetGachaPackOdds
} from '@microwavedev/backpack-game-core/modules/gacha/simulation';
import {
  createAssetGachaSimulationService
} from '@microwavedev/backpack-game-core/modules/gacha/simulation-service';
import {
  formatRuntimeConfigValidationLines,
  shapeRuntimeConfigValidationResult
} from '@microwavedev/backpack-game-core/modules/config';
import {
  shapeAuthSessionResult,
  shapeAuthUserProfile
} from '@microwavedev/backpack-game-core/modules/auth';
import {
  applyWalletBalanceDelta,
  createProviderSettlementAdapterRegistry,
  createWalletPurchaseCompletionPlan,
  createWalletPurchaseIntentDraft,
  createWalletPurchaseGrantMutation
} from '@microwavedev/backpack-game-core/modules/wallet';
import {
  walletSettlementRequiresClawback
} from '@microwavedev/backpack-game-core/modules/wallet/accounting';
import {
  createProfileAssetState,
  shapeProfileAssetEquipResult,
  shapeProfileAssetGrantSummaries,
  shapeProfileAssetPurchaseResult,
  shapeProfileAssetTargetVariants,
  shapeProfileAssetVariant
} from '@microwavedev/backpack-game-core/modules/assets';
import {
  profileAssetTargetKey
} from '@microwavedev/backpack-game-core/modules/assets/profile-state';
import * as gachaInterface from '@microwavedev/backpack-game-core/modules/gacha/interface';
import {
  createRunShopPurchasePlan,
  createRunShopRefreshPlan,
  createRunShopSellPlan,
  generateShopOffer
} from '@microwavedev/backpack-game-core/modules/shop';
import {
  FAMILY_CAPS,
  contributesStats,
  familyCaps,
  isBag,
  isCombatArtifact,
  isContainerItem
} from '@microwavedev/backpack-game-core/artifact-capabilities';
import {
  createRunGhostBudgetPlan,
  createRunGroupCompletionPlan,
  createRunRoundResolutionPlan,
  createRunStartPlan,
  shapeRunStateSummary
} from '@microwavedev/backpack-game-core/modules/run';
import {
  shapeSupportLookupResult,
  shapeSupportWalletMutationResult
} from '@microwavedev/backpack-game-core/modules/support';
import {
  createLoadoutValidator,
  createLoadoutValidationService as createLoadoutValidationServiceFromLoadout,
  familyCaps as familyCapsFromLoadout,
  getEffectiveShape,
  isBag as isBagFromLoadout,
  pieceCells
} from '@microwavedev/backpack-game-core/modules/loadout';
import {
  createLoadoutValidationService
} from '@microwavedev/backpack-game-core/modules/loadout/validation-service';
import {
  createSocialPreviewCacheService
} from '@microwavedev/backpack-game-core/modules/social-preview';
import {
  assetRollErrorViewState,
  assetRollMutationResultViewState,
  assetRollPendingViewState,
  assetRollStatusFromError,
  artifactPreviewOrientation,
  buildOccupiedCellMap,
  classifyCell,
  formatStatDelta,
  gameRunCompletionResultViewState,
  gameRunReadyResultViewState,
  gameRunRoundTransitionViewState,
  gameRunStartResultViewState,
  gachaAdminDraftDiffRows,
  gachaAdminFixtureOperationRows,
  gachaAdminOddsItemRows,
  gachaAdminOddsRarityRows,
  gachaAdminPlanChanceText,
  gachaAdminPlanCoverageRows,
  gachaAdminPlanTotalWeight,
  gachaAdminReleaseChecklistRows,
  gachaAdminSimulationItemRows,
  gachaAdminValidationIssueRows,
  preferredArtifactOrientation,
  preferredReplaySpeed,
  formatWalletBundlePrice,
  replayAdvanceTickViewState,
  replayAutoplayDelayViewState,
  replayLoadResultViewState,
  replayLongBattleSpeedBoost,
  replaySetSpeedViewState,
  replayTimelineViewState,
  runShopBuyResultViewState,
  runShopRefreshResultViewState,
  runShopSellResultViewState,
  summarizeAssetRollFeedback,
  summarizeAssetRollPacks,
  walletBundlesLoadedViewState,
  walletPurchaseCheckoutViewState,
  walletPurchaseNextAction,
  walletPurchaseOpeningViewState,
  walletPurchaseStatusFromIntent,
  walletPurchaseStatusFromTelegramInvoice
} from '@microwavedev/backpack-game-core/client-view-model';
import {
  createSeededRng,
  simulateBattle
} from '@microwavedev/backpack-game-core/modules/battle';
import { findFusionMatches } from '@microwavedev/backpack-game-core/modules/fusion';
import {
  clearIdempotencyCache,
  clearRateLimitBuckets,
  createAssetGachaSimulationServerModule,
  createKeyedAsyncMutex,
  createBackpackServerContext,
  createBackpackServerModule,
  createLoadoutValidationServerModule,
  createRunReadinessServerModule,
  createRunReadinessManager,
  createSocialPreviewCacheServerModule,
  idempotency,
  rateLimit,
  setupBackpackServerModules
} from '@microwavedev/backpack-game-core/server';
import {
  idempotency as idempotencyFromMiddleware,
  rateLimit as rateLimitFromMiddleware
} from '@microwavedev/backpack-game-core/server/middleware';
import {
  AchievementBadge,
  ArtifactStatSummary,
  bindReducedMotionTracker,
  AssetRollResultPanel,
  ArtifactTile,
  BackpackGrid,
  BackpackZone,
  BattleLog,
  FighterCard,
  FusionReveal,
  InventoryZone,
  createReducedMotionTracker,
  GachaPackCard,
  GachaPackCardList,
  GachaOddsTable,
  PrepActions,
  RecipeCard,
  RecipeList,
  RunHud,
  SellZone,
  SeasonRankEmblem,
  ShopZone,
  ShopItemList,
  ShopItemRow
} from '@microwavedev/backpack-game-core/vue';
import {
  AchievementBadge as AchievementBadgeFromComponents,
  ArtifactStatSummary as ArtifactStatSummaryFromComponents,
  AssetRollResultPanel as AssetRollResultPanelFromComponents,
  ArtifactTile as ArtifactTileFromComponents,
  BackpackGrid as BackpackGridFromComponents,
  BackpackZone as BackpackZoneFromComponents,
  BattleLog as BattleLogFromComponents,
  FighterCard as FighterCardFromComponents,
  FusionReveal as FusionRevealFromComponents,
  InventoryZone as InventoryZoneFromComponents,
  GachaPackCard as GachaPackCardFromComponents,
  GachaPackCardList as GachaPackCardListFromComponents,
  GachaOddsTable as GachaOddsTableFromComponents,
  PrepActions as PrepActionsFromComponents,
  RecipeCard as RecipeCardFromComponents,
  RecipeList as RecipeListFromComponents,
  RunHud as RunHudFromComponents,
  SellZone as SellZoneFromComponents,
  SeasonRankEmblem as SeasonRankEmblemFromComponents,
  ShopZone as ShopZoneFromComponents,
  ShopItemList as ShopItemListFromComponents,
  ShopItemRow as ShopItemRowFromComponents
} from '@microwavedev/backpack-game-core/vue/components';
import {
  bindReducedMotionTracker as bindReducedMotionTrackerFromComposables,
  createReducedMotionTracker as createReducedMotionTrackerFromComposables
} from '@microwavedev/backpack-game-core/vue/composables';

const catalog = [
  { assetId: 'skin.a', rarity: 'common', acquisitionMode: 'gacha', packId: 'starter' },
  { assetId: 'skin.b', rarity: 'rare', acquisitionMode: 'gacha', packId: 'starter' }
];

const pack = {
  id: 'starter',
  seasonId: 'season_1',
  collectionId: 'skins',
  status: 'active',
  rollPriceCurrencyCode: 'soft_coin',
  rollPriceAmount: 10,
  rollSize: 1,
  rarityTableVersion: 'starter:v1',
  items: [
    { assetId: 'skin.a', rarity: 'common', dropWeight: 100 },
    { assetId: 'skin.b', rarity: 'rare', dropWeight: 1 }
  ]
};

test('[modules] gacha facade exposes existing asset-gacha behavior', () => {
  assert.equal(validateAssetGachaPack(pack, { catalog }).ok, true);
  assert.equal(validateAssetGachaPackOnly({ ...pack, rollSize: 99 }, { catalog }).ok, false);
  assert.equal(assetGachaPackRollSize(pack), 1);

  const candidates = resolveAssetGachaRollCandidates(pack, { catalog });
  assert.deepEqual(candidates.map((item) => item.assetId), ['skin.a', 'skin.b']);

  const selected = selectAssetGachaRollResults(candidates, pack, { rng: () => 0 });
  assert.equal(selected[0].assetId, 'skin.a');
  assert.equal(createAssetGachaRollSettlementPlan({
    pack,
    candidates,
    selectedItems: selected,
    ownedAssetIds: new Set(),
    gachaEnabled: true
  }).resultAssetIds[0], 'skin.a');

  const shaped = shapeAssetGachaPack(pack, { catalog, includeAssets: true, gachaEnabled: true });
  assert.equal(shaped.items[0].asset.assetId, 'skin.a');
  assert.equal(shapeAssetGachaRollResult({
    id: 'roll_1',
    packId: 'starter',
    resultAssetIds: ['skin.a']
  }, { pack, catalog }).assetId, 'skin.a');
  assert.equal(shapeAssetGachaBurnResult({
    id: 'burn_1',
    packId: 'starter',
    ruleId: 'burn_common',
    resultAssetIds: ['skin.b']
  }, { pack, catalog }).assetId, 'skin.b');
  assert.deepEqual(resolveAssetCatalogAcquisitionPolicy({
    assetId: 'skin.paid',
    price: 100
  }, {
    defaultPaidMode: 'gacha',
    defaultPackId: 'starter'
  }), { acquisitionMode: 'gacha', packId: 'starter' });
  assert.equal(createGachaAdminReleaseChecklist({
    runtimePack: pack,
    validation: { ok: true, errors: [], warnings: [] }
  }).ok, false);
  assert.equal(formatRuntimeConfigValidationLines(shapeRuntimeConfigValidationResult(), {
    readyMessage: 'ok'
  })[0], 'ok');
  assert.equal(shapeAuthSessionResult({
    token: 'token',
    player: shapeAuthUserProfile({ id: 'player', displayName: 'Player' }),
    userField: 'player'
  }).player.name, 'Player');
  assert.equal(normalizeGachaAdminFixture({ packs: [{ id: 'fixture_pack' }] }).packs[0].id, 'fixture_pack');
  assert.equal(gachaAdminPackSnapshot({ id: 'pack', roll_price_amount: '5' }).rollPriceAmount, 5);
  assert.equal(buildGachaAdminPackDraftDiff({
    basePack: pack,
    draftPack: { ...pack, id: 'draft', rollPriceAmount: 11 },
    basePackId: 'starter'
  }).changedFields.some((change) => change.field === 'rollPriceAmount'), true);
  assert.equal(summarizeGachaAdminFixtureOperations([{ type: 'pack', action: 'update' }]).byType.pack, 1);
  assert.equal(simulateAssetGachaPackOdds(pack, {
    catalog,
    trials: 1,
    rng: () => 0
  }).candidateCount, 2);
  assert.equal(typeof createAssetGachaSimulationService, 'function');
  assert.deepEqual(Object.keys(gachaInterface), []);
});

test('[modules] shop, loadout, battle, and fusion facades expose stable APIs', () => {
  const offer = generateShopOffer({
    rng: () => 0,
    count: 1,
    combatItems: [{ id: 'needle' }],
    getItemId: (item) => item.id
  });
  assert.deepEqual(offer.offer, ['needle']);
  assert.equal(createRunShopPurchasePlan({
    coins: 10,
    offer: ['needle'],
    artifactId: 'needle',
    price: 3
  }).coinsAfter, 7);
  assert.equal(createRunShopRefreshPlan({
    coins: 10,
    refreshCost: 2,
    refreshCount: 1,
    generatedOffer: ['needle']
  }).refreshCount, 2);
  assert.equal(createRunShopSellPlan({
    coins: 1,
    price: 5,
    purchasedRound: 1,
    currentRound: 2
  }).sellPrice, 2);
  assert.equal(createRunStartPlan({
    runId: 'run_1',
    playerId: 'player_1',
    runPlayerId: 'grp_1',
    initialCoins: 5,
    startingLives: 5
  }).playerDraft.livesRemaining, 5);
  assert.equal(createRunRoundResolutionPlan({
    outcome: 'loss',
    roundNumber: 1,
    playerState: { lives_remaining: 5, coins: 5 },
    roundIncome: [5, 5],
    rewardTable: { loss: { spore: 1, mycelium: 5 } },
    maxRounds: 9
  }).player.livesRemaining, 4);
  assert.equal(createRunGhostBudgetPlan({
    playerSpent: 10,
    roundNumber: 3,
    roundIncome: [5, 5, 5],
    ghostBudgetDiscount: 0
  }).ghostBudget, 10);
  assert.equal(createRunGroupCompletionPlan({
    playerResults: [{ completedRounds: 9, livesRemaining: 5 }],
    maxRounds: 9
  }).endReason, 'max_rounds');
  assert.equal(typeof shapeRunStateSummary, 'function');

  assert.deepEqual(getEffectiveShape({ width: 1, height: 2, shape: [[1], [1]] }), [[1], [1]]);
  assert.deepEqual(pieceCells({ x: 0, y: 0, width: 1, height: 2 }), ['0:0', '0:1']);
  assert.equal(FAMILY_CAPS.bag.holdsItems, true);
  assert.deepEqual(familyCaps('missing'), FAMILY_CAPS.damage);
  assert.equal(isBag({ family: 'bag' }), true);
  assert.equal(isCombatArtifact({ family: 'damage' }), true);
  assert.equal(isContainerItem({ x: -1, y: 0 }), true);
  assert.equal(contributesStats({ family: 'damage' }, { x: 0, y: 0 }), true);
  assert.equal(familyCapsFromLoadout, familyCaps);
  assert.equal(isBagFromLoadout, isBag);
  assert.equal(createLoadoutValidationServiceFromLoadout, createLoadoutValidationService);
  assert.equal(typeof createLoadoutValidationService, 'function');
  assert.equal(typeof createLoadoutValidationServerModule, 'function');
  assert.equal(typeof createRunReadinessServerModule, 'function');
  assert.equal(typeof createProviderSettlementAdapterRegistry, 'function');
  assert.equal(shapeSupportLookupResult({ players: [{}] }, { includeCounts: true }).counts.players, 1);
  assert.equal(shapeSupportWalletMutationResult({
    transaction: { id: 'tx' },
    supportAction: { id: 'support' }
  }).supportAction.id, 'support');
  assert.deepEqual(summarizeAssetRollPacks(), []);
  assert.equal(classifyCell([], 0, 0, { cols: 1, rows: 1 }), 'base-inv');
  assert.equal(buildOccupiedCellMap([{ artifactId: 'needle', x: 0, y: 0, width: 1, height: 1 }]).get('0:0'), 'needle');
  assert.deepEqual(preferredArtifactOrientation({ width: 1, height: 2 }), { width: 2, height: 1 });
  assert.deepEqual(artifactPreviewOrientation({ family: 'damage', width: 1, height: 2 }), { width: 1, height: 2 });
  assert.equal(formatStatDelta(2), '+2');
  assert.equal(formatWalletBundlePrice({ priceAmount: 100, priceCurrency: 'USD' }), '$1.00');
  assert.equal(summarizeAssetRollFeedback(), null);
  assert.equal(walletPurchaseStatusFromIntent({ status: 'completed' }), 'confirmed');
  assert.equal(walletPurchaseStatusFromTelegramInvoice('paid'), 'confirmed');
  assert.equal(walletBundlesLoadedViewState([{ id: 'coins' }]).bundles.length, 1);
  assert.equal(walletPurchaseOpeningViewState().status, 'opening');
  assert.equal(walletPurchaseCheckoutViewState({ hasWebCheckout: true }).status, 'opened');
  assert.equal(walletPurchaseNextAction({ checkout: { checkoutUrl: 'https://pay.example' } }, { hasWebCheckout: true }).action, 'web_checkout');
  assert.equal(assetRollStatusFromError(new Error('No rollable assets left')), 'complete');
  assert.equal(assetRollPendingViewState().status, 'rolling');
  assert.equal(assetRollMutationResultViewState({ roll: { id: 'roll' }, rollResult: { assetId: 'skin.a' } }).shouldRefresh, true);
  assert.equal(assetRollErrorViewState(new Error('No rollable assets left')).status, 'complete');
  assert.equal(runShopRefreshResultViewState({ coins: 1 }, { run: { player: { coins: 0 } } }).run.player.coins, 1);
  assert.equal(runShopBuyResultViewState({ id: 'row_1' }, { artifactId: 'needle' }).boughtItem.artifactId, 'needle');
  assert.equal(gachaAdminDraftDiffRows({ addedItems: ['skin.a'] })[0].type, 'item_added');
  assert.equal(gachaAdminValidationIssueRows({ errors: [{}] })[0].severity, 'error');
  assert.equal(gachaAdminReleaseChecklistRows({ passed: [{ code: 'ok' }] })[0].code, 'ok');
  assert.equal(gachaAdminPlanTotalWeight([{ dropWeight: 5 }]), 5);
  assert.equal(gachaAdminPlanCoverageRows([{ characterId: 'ruby' }], { characters: [{ id: 'ruby' }] })[0].count, 1);
  assert.equal(gachaAdminPlanChanceText({ dropWeight: 1 }, { totalWeight: 4 }), '25.0%');
  assert.equal(gachaAdminOddsRarityRows({ raritySummary: [{ rarity: 'rare', probability: 0.25 }] })[0].expectedText, '25.0%');
  assert.equal(gachaAdminOddsItemRows({ items: [{ assetId: 'skin.a', probability: 0.25 }] })[0].copyLimitText, '-');
  assert.equal(gachaAdminFixtureOperationRows({ operations: [{ type: 'pack' }] })[0].afterCountText, '-');
  assert.equal(gachaAdminSimulationItemRows({ items: [{ assetId: 'skin.a', observedPerRoll: 0.25 }] })[0].observedPerRollText, '25.0%');
  assert.equal(AchievementBadge.name, 'AchievementBadge');
  assert.equal(ArtifactStatSummary.name, 'ArtifactStatSummary');
  assert.equal(SeasonRankEmblem.name, 'SeasonRankEmblem');
  assert.equal(AssetRollResultPanel.name, 'AssetRollResultPanel');
  assert.equal(ArtifactTile.name, 'ArtifactTile');
  assert.equal(BackpackGrid.name, 'BackpackGrid');
  assert.equal(BackpackZone.name, 'BackpackZone');
  assert.equal(BattleLog.name, 'BattleLog');
  assert.equal(FighterCard.name, 'FighterCard');
  assert.equal(FusionReveal.name, 'FusionReveal');
  assert.equal(InventoryZone.name, 'InventoryZone');
  assert.equal(GachaPackCard.name, 'GachaPackCard');
  assert.equal(GachaPackCardList.name, 'GachaPackCardList');
  assert.equal(GachaOddsTable.name, 'GachaOddsTable');
  assert.equal(PrepActions.name, 'PrepActions');
  assert.equal(RecipeCard.name, 'RecipeCard');
  assert.equal(RecipeList.name, 'RecipeList');
  assert.equal(RunHud.name, 'RunHud');
  assert.equal(SellZone.name, 'SellZone');
  assert.equal(ShopZone.name, 'ShopZone');
  assert.equal(ShopItemList.name, 'ShopItemList');
  assert.equal(ShopItemRow.name, 'ShopItemRow');
  assert.equal(typeof createReducedMotionTracker, 'function');
  assert.equal(typeof bindReducedMotionTracker, 'function');
  assert.equal(AchievementBadgeFromComponents, AchievementBadge);
  assert.equal(ArtifactStatSummaryFromComponents, ArtifactStatSummary);
  assert.equal(SeasonRankEmblemFromComponents, SeasonRankEmblem);
  assert.equal(AssetRollResultPanelFromComponents, AssetRollResultPanel);
  assert.equal(ArtifactTileFromComponents, ArtifactTile);
  assert.equal(BackpackGridFromComponents, BackpackGrid);
  assert.equal(BackpackZoneFromComponents, BackpackZone);
  assert.equal(BattleLogFromComponents, BattleLog);
  assert.equal(FighterCardFromComponents, FighterCard);
  assert.equal(FusionRevealFromComponents, FusionReveal);
  assert.equal(InventoryZoneFromComponents, InventoryZone);
  assert.equal(GachaPackCardFromComponents, GachaPackCard);
  assert.equal(GachaPackCardListFromComponents, GachaPackCardList);
  assert.equal(GachaOddsTableFromComponents, GachaOddsTable);
  assert.equal(PrepActionsFromComponents, PrepActions);
  assert.equal(RecipeCardFromComponents, RecipeCard);
  assert.equal(RecipeListFromComponents, RecipeList);
  assert.equal(RunHudFromComponents, RunHud);
  assert.equal(SellZoneFromComponents, SellZone);
  assert.equal(ShopZoneFromComponents, ShopZone);
  assert.equal(ShopItemListFromComponents, ShopItemList);
  assert.equal(ShopItemRowFromComponents, ShopItemRow);
  assert.equal(createReducedMotionTrackerFromComposables, createReducedMotionTracker);
  assert.equal(bindReducedMotionTrackerFromComposables, bindReducedMotionTracker);
  assert.deepEqual(runShopSellResultViewState({ id: 'row_1', artifactId: 'needle' }, {
    builderItems: [
      { id: 'row_1', artifactId: 'needle' },
      { id: 'row_2', artifactId: 'needle' }
    ]
  }).builderItems.map((item) => item.id), ['row_2']);
  assert.deepEqual(gameRunStartResultViewState({ id: 'run_1' }).run.loadoutItems, []);
  assert.equal(gameRunReadyResultViewState({ waiting: true }, { run: { id: 'run_1' } }).waiting, true);
  assert.equal(gameRunRoundTransitionViewState({ loadoutItems: [], shopOffer: [] }, { run: { id: 'run_1' } }).shouldRefreshBootstrap, false);
  assert.equal(gameRunCompletionResultViewState({ id: 'run_1', status: 'completed' }).run.status, 'completed');
  assert.equal(preferredReplaySpeed({ replaySpeed: 4 }), 4);
  assert.equal(replayLongBattleSpeedBoost(200, 120), 4);
  assert.equal(replayAutoplayDelayViewState({ replaySpeed: 4 }).selectedSpeed, 4);
  assert.equal(replayAdvanceTickViewState({ battle: { events: [{}, {}] }, replayIndex: 0 }).replayIndex, 1);
  assert.equal(replayLoadResultViewState({ id: 'battle' }).replayIndex, 0);
  assert.equal(replaySetSpeedViewState(4, { settings: { replaySpeed: 2 } }).settings.replaySpeed, 4);
  assert.equal(replayTimelineViewState({ battle: { events: [{ type: 'start' }] } }).activeEvent.type, 'start');

  const artifacts = new Map([
    ['bag', { id: 'bag', family: 'bag', width: 2, height: 2, price: 0 }],
    ['needle', { id: 'needle', family: 'damage', width: 1, height: 1, price: 0 }]
  ]);
  const validator = createLoadoutValidator({
    gridWidth: 2,
    gridHeight: 2,
    getArtifact: (artifactId) => artifacts.get(artifactId),
    getArtifactPrice: () => 0
  });
  const validation = validator.validateLoadoutItems([
    { artifactId: 'bag', x: 0, y: 0, width: 2, height: 2, active: true },
    { artifactId: 'needle', x: 0, y: 0, width: 1, height: 1 }
  ]);
  assert.equal(validation.totalCoins, 0);

  const battle = simulateBattle({
    left: { side: 'left', maxHealth: 3, currentHealth: 3, attack: 3, speed: 2, defense: 0 },
    right: { side: 'right', maxHealth: 3, currentHealth: 3, attack: 1, speed: 1, defense: 0 },
    rng: createSeededRng(1),
    stepCap: 1
  });
  assert.equal(battle.winnerSide, 'left');

  const matches = findFusionMatches([
    { rowId: 'a', artifactId: 'a', x: 0, y: 0, width: 1, height: 1 },
    { rowId: 'b', artifactId: 'b', x: 1, y: 0, width: 1, height: 1 }
  ].map((row) => ({ ...row, id: row.rowId })), (artifactId) => ({ id: artifactId }), [{
    id: 'a_b',
    resultArtifactId: 'ab',
    ingredientArtifactIds: ['a', 'b']
  }]);
  assert.equal(matches[0].resultArtifactId, 'ab');
});

test('[modules] asset facade exposes profile asset result DTO shapers', () => {
  const asset = {
    assetId: 'portrait.ruby.rare',
    slot: 'portrait',
    targetType: 'character',
    targetId: 'ruby',
    variantId: 'rare',
    price: 100,
    currencyCode: 'soft_coin',
    rarity: 'rare',
    path: '/portraits/ruby-rare.png'
  };
  const instance = {
    id: 'asset_1',
    asset_id: 'portrait.ruby.rare',
    status: 'active'
  };

  assert.equal(createProfileAssetState({ instances: [instance] }).ownedAssetIds.has(asset.assetId), true);
  assert.equal(shapeProfileAssetVariant({
    variant: { id: 'rare' },
    asset,
    owned: true
  }).assetId, asset.assetId);
  assert.equal(shapeProfileAssetTargetVariants({
    variants: [{ id: 'rare', assetId: asset.assetId }],
    catalog: [asset]
  })[0].rarity, 'rare');
  assert.equal(shapeProfileAssetPurchaseResult({
    asset,
    instance,
    transaction: { id: 'tx_1' }
  }).transaction.id, 'tx_1');
  assert.equal(shapeProfileAssetEquipResult({
    asset,
    instance,
    equipment: {
      slot: 'portrait',
      targetType: 'character',
      targetId: 'ruby',
      assetId: asset.assetId,
      assetInstanceId: 'asset_1'
    }
  }).targetKey, 'portrait:character:ruby');
  assert.equal(shapeProfileAssetGrantSummaries({
    instances: [instance],
    catalog: [asset]
  })[0].path, '/portraits/ruby-rare.png');
});

test('[server] server facade exposes module and middleware helpers', () => {
  assert.equal(typeof createBackpackServerModule, 'function');
  assert.equal(typeof createBackpackServerContext, 'function');
  assert.equal(typeof setupBackpackServerModules, 'function');
  assert.equal(typeof createAssetGachaSimulationServerModule, 'function');
  assert.equal(typeof createSocialPreviewCacheServerModule, 'function');
  assert.equal(typeof createKeyedAsyncMutex, 'function');
  assert.equal(typeof createRunReadinessManager, 'function');
  assert.equal(typeof idempotency, 'function');
  assert.equal(typeof clearIdempotencyCache, 'function');
  assert.equal(typeof rateLimit, 'function');
  assert.equal(typeof clearRateLimitBuckets, 'function');
  assert.equal(idempotencyFromMiddleware, idempotency);
  assert.equal(rateLimitFromMiddleware, rateLimit);
});

test('[modules] social-preview facade exposes cache helpers', () => {
  assert.equal(typeof createSocialPreviewCacheService, 'function');
});

test('[modules] wallet facade exposes accounting helpers', () => {
  assert.equal(applyWalletBalanceDelta(10, -3).balanceAfter, 7);
  assert.equal(walletSettlementRequiresClawback('refunded'), true);
  assert.equal(createWalletPurchaseIntentDraft({
    id: 'intent_1',
    playerId: 'player_1',
    bundle: {
      id: 'coins_100',
      currencyCode: 'soft_coin',
      walletAmount: 100,
      provider: 'btcpay',
      priceAmount: 1000,
      priceCurrency: 'USD'
    },
    providerInvoiceId: 'invoice_1'
  }).walletAmount, 100);
  assert.equal(createWalletPurchaseGrantMutation({
    id: 'intent_1',
    playerId: 'player_1',
    provider: 'btcpay',
    providerInvoiceId: 'invoice_1',
    providerPaymentId: 'payment_1',
    currencyCode: 'soft_coin',
    walletAmount: 100
  }).idempotencyKey, 'wallet_purchase:intent_1');
  assert.equal(createWalletPurchaseCompletionPlan({
    id: 'intent_1',
    playerId: 'player_1',
    provider: 'btcpay',
    providerInvoiceId: 'invoice_1',
    currencyCode: 'soft_coin',
    walletAmount: 100,
    priceAmount: 1000,
    priceCurrency: 'USD',
    status: 'pending'
  }, {
    provider: 'btcpay',
    providerPaymentId: 'payment_1',
    priceAmount: 1000,
    priceCurrency: 'USD'
  }).grantMutation.amount, 100);
});

test('[modules] assets facade exposes profile asset state helpers', () => {
  const state = createProfileAssetState({
    instances: [{ id: 'asset_1', asset_id: 'portrait.axilin.1', status: 'active' }]
  });
  assert.equal(state.ownedAssetIds.has('portrait.axilin.1'), true);
  assert.equal(profileAssetTargetKey({
    slot: 'portrait',
    targetType: 'character',
    targetId: 'axilin'
  }), 'portrait:character:axilin');
  assert.equal(shapeProfileAssetVariant({
    variant: { id: '1' },
    asset: { assetId: 'portrait.axilin.1', price: 500, currencyCode: 'soft_coin' },
    owned: true,
    policy: { acquisitionMode: 'direct', purchaseAvailable: true }
  }).purchaseAvailable, true);
  assert.equal(shapeProfileAssetTargetVariants({
    variants: [{ id: '1', assetId: 'portrait.axilin.1' }],
    state,
    catalog: [{ assetId: 'portrait.axilin.1', price: 500, currencyCode: 'soft_coin' }],
    activeVariantId: '1'
  })[0].active, true);
});
