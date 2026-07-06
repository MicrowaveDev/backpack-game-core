import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assetPackAvailabilityLabel,
  assetPackIsActive,
  assetRollErrorViewState,
  assetRollPendingViewState,
  assetRollResultViewState,
  assetRollStatusFromError,
  artifactPreviewOrientation,
  bagRowEntryFor,
  classifyCell,
  formatAssetRollResultItemsText,
  formatArtifactBonusEntries,
  formatAssetPackRarityOdds,
  formatLoadoutStatsText,
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
  buildOccupiedCellMap,
  formatWalletBundlePrice,
  createPrepGridController,
  occupiedCellKeys,
  prepareGridProps,
  prepRefreshCost,
  prepSellPriceLabel,
  preferredArtifactOrientation,
  projectLoadoutItems,
  resolveWalletBalance,
  shapePrepScreenViewState,
  shapeGridBagSlotCells,
  shapeGridBoardCells,
  shapeGridBoardPieces,
  LONG_BATTLE_SPEED_BOOST_2X_INDEX,
  LONG_BATTLE_SPEED_BOOST_3X_INDEX,
  LONG_BATTLE_SPEED_BOOST_4X_INDEX,
  preferredReplaySpeed,
  replayAdvanceTickViewState,
  replayAutoplayDelayViewState,
  replayLoadResultViewState,
  replayLongBattleSpeedBoost,
  replaySetSpeedViewState,
  replayTimelineViewState,
  runShopBuyResultViewState,
  runShopRefreshResultViewState,
  runShopSellResultViewState,
  shapeArtifactTileDisplay,
  shapeArtifactStatRows,
  shapeAssetPackCardRows,
  shapeAssetRollResultPanel,
  shapeGachaAdminOddsTableSections,
  shapeReplayEventRows,
  shapeShopItemRows,
  sumArtifactBonuses,
  summarizeAssetRollFeedback,
  summarizeWalletPurchaseSurface,
  summarizeAssetRollPacks,
  assetRollMutationErrorViewState,
  assetRollMutationResultViewState,
  walletBundlesErrorViewState,
  walletBundlesLoadedViewState,
  walletBundlesLoadingViewState,
  walletPurchaseCheckoutViewState,
  walletPurchaseErrorViewState,
  walletPurchaseIntentViewState,
  walletPurchaseNextAction,
  walletPurchaseOpeningViewState,
  walletPurchaseStatusFromIntent,
  walletPurchaseStatusFromTelegramInvoice
} from '@microwavedev/backpack-game-core/client-view-model';

const bagIds = new Set(['starter_bag', 'pouch']);
const artifacts = new Map([
  ['starter_bag', { id: 'starter_bag', family: 'bag', width: 3, height: 3, color: '#d4c9a8' }],
  ['pouch', { id: 'pouch', family: 'bag', width: 1, height: 2, color: '#6b8f5e' }],
  ['needle', { id: 'needle', family: 'damage', width: 1, height: 1 }],
  ['blade', { id: 'blade', family: 'damage', width: 2, height: 1 }]
]);

function row(overrides) {
  return {
    id: 'row',
    artifactId: 'needle',
    x: -1,
    y: -1,
    width: 1,
    height: 1,
    active: false,
    rotated: false,
    freshPurchase: false,
    ...overrides
  };
}

test('[client-view-model] projects flat loadout rows into UI buckets', () => {
  const result = projectLoadoutItems([
    row({ id: 'starter', artifactId: 'starter_bag', x: 1, y: 1, active: true, freshPurchase: true }),
    row({ id: 'rotated', artifactId: 'pouch', x: 4, y: 1, active: true, rotated: 1 }),
    row({ id: 'needle', artifactId: 'needle', x: 2, y: 1 }),
    row({ id: 'blade', artifactId: 'blade' })
  ], bagIds, artifacts);

  assert.deepEqual(result.activeBags.map((bag) => [bag.id, bag.anchorX, bag.anchorY]), [
    ['starter', 1, 1],
    ['rotated', 4, 1]
  ]);
  assert.deepEqual(result.rotatedBags, [{ id: 'rotated', artifactId: 'pouch', rotation: 1 }]);
  assert.deepEqual(result.builderItems.map((item) => item.id), ['needle']);
  assert.deepEqual(result.containerItems.map((item) => item.id), ['blade']);
  assert.deepEqual(result.freshPurchases, ['starter_bag']);
});

test('[client-view-model] prepares grid props with configurable dimensions', () => {
  const result = prepareGridProps([
    row({ id: 'starter', artifactId: 'starter_bag', x: 1, y: 1, active: true }),
    row({ id: 'needle', artifactId: 'needle', x: 2, y: 1 })
  ], bagIds, artifacts, { columns: 6, minRows: 6 });

  assert.deepEqual(result.items.map((item) => item.id), ['needle']);
  assert.ok(result.bagRows.some((bagRow) => bagRow.artifactId === 'starter_bag' && bagRow.row === 1));
  assert.equal(result.totalRows, 6);
});

test('[client-view-model] creates a neutral prep grid controller for bag layout and previews', () => {
  const state = {
    activeBags: [
      { id: 'starter_row', artifactId: 'starter_bag', anchorX: 0, anchorY: 0 }
    ],
    rotatedBags: [],
    builderItems: [
      { id: 'needle_row', artifactId: 'needle', x: 0, y: 0, width: 1, height: 1 }
    ],
    containerItems: [
      { id: 'blade_row', artifactId: 'blade' }
    ],
    draggingSource: 'container',
    draggingArtifactId: 'blade'
  };
  const controller = createPrepGridController({ state, getArtifact: artifacts, columns: 6, minRows: 6 });

  assert.equal(controller.effectiveRows(), 6);
  assert.ok(controller.bagRows().some((entry) => entry.bagId === 'starter_row' && entry.row === 0));
  assert.deepEqual(controller.findFirstFitAnchor(1, 2), { anchorX: 3, anchorY: 0 });
  assert.equal(controller.isCellDisabled(0, 0), false);
  assert.equal(controller.isCellDisabled(5, 5), true);

  const containerPreview = controller.placementPreviewAt(1, 0);
  assert.deepEqual(containerPreview, {
    cells: ['1:0', '2:0'],
    valid: true,
    artifactId: 'blade',
    family: 'damage'
  });

  state.draggingSource = 'inventory';
  state.draggingItem = { id: 'needle_row', artifactId: 'needle', x: 0, y: 0, width: 1, height: 1 };
  assert.deepEqual(controller.placementPreviewAt(1, 0), {
    cells: ['1:0'],
    valid: true,
    artifactId: 'needle',
    family: 'damage'
  });

  state.activeBags = [
    ...state.activeBags,
    { id: 'pouch_row', artifactId: 'pouch', anchorX: 3, anchorY: 0 }
  ];
  state.draggingSource = 'bag-chip';
  state.draggingBagId = 'pouch_row';
  assert.deepEqual(controller.placementPreviewAt(4, 0), {
    cells: ['4:0', '5:0'],
    valid: true,
    artifactId: 'pouch',
    family: 'bag'
  });
});

test('[client-view-model] shapes prep screen view state without product copy', () => {
  const state = {
    bootstrapReady: true,
    gameRun: { currentRound: 3, mode: 'challenge' },
    sseConnected: false,
    gameRunRefreshCount: 4,
    activeBags: [
      { id: 'starter_row', artifactId: 'starter_bag', anchorX: 0, anchorY: 0 }
    ],
    rotatedBags: [],
    builderItems: [],
    containerItems: [],
    sellDragOver: true,
    draggingArtifactId: 'blade',
    freshPurchases: [],
    fusionRevealQueue: [{ id: 'fusion_1' }]
  };

  assert.equal(prepRefreshCost(2), 1);
  assert.equal(prepRefreshCost(3), 2);
  assert.equal(prepSellPriceLabel({
    sellDragOver: true,
    draggingArtifactId: 'blade',
    freshPurchases: [],
    getArtifact: artifacts,
    getArtifactPrice: () => 5
  }), '2');

  const viewState = shapePrepScreenViewState({
    state,
    getArtifact: artifacts,
    getArtifactPrice: () => 5,
    columns: 6,
    minRows: 6
  });

  assert.equal(viewState.ready, true);
  assert.equal(viewState.currentRound, 3);
  assert.equal(viewState.showReconnecting, true);
  assert.equal(viewState.totalRows, 6);
  assert.equal(viewState.runRefreshCost, 2);
  assert.equal(viewState.runSellPriceLabel, '2');
  assert.deepEqual(viewState.activeFusionReveal, { id: 'fusion_1' });
});

function bagRow({ artifactId = 'moss_pouch', row: y, anchorX, cols, enabledXs, color = '#6b8f5e' }) {
  return {
    row: y,
    artifactId,
    color,
    enabledCells: enabledXs,
    bboxStart: anchorX,
    bboxEnd: anchorX + cols
  };
}

test('[client-view-model] classifies grid cells with slot-first bag lookup', () => {
  const baseRect = { cols: 3, rows: 3 };
  assert.equal(classifyCell([
    bagRow({ row: 0, anchorX: 0, cols: 3, enabledXs: [0, 1, 2] })
  ], 0, 0, baseRect), 'base-inv');

  const rectangular = [bagRow({ row: 0, anchorX: 3, cols: 2, enabledXs: [3, 4] })];
  assert.equal(classifyCell(rectangular, 3, 0, baseRect), 'bag-slot');
  assert.equal(classifyCell(rectangular, 5, 0, baseRect), 'bag-empty');

  const shaped = [
    bagRow({ artifactId: 'spiral_cap', row: 0, anchorX: 3, cols: 3, enabledXs: [3, 4], color: '#b85a6e' }),
    bagRow({ artifactId: 'spiral_cap', row: 1, anchorX: 3, cols: 3, enabledXs: [4, 5], color: '#b85a6e' })
  ];
  assert.equal(classifyCell(shaped, 5, 0, baseRect), 'bag-box');
  assert.equal(classifyCell(shaped, 5, 1, baseRect), 'bag-slot');

  const overlapping = [
    bagRow({ artifactId: 'spiral_cap', row: 0, anchorX: 3, cols: 3, enabledXs: [3, 4], color: '#b85a6e' }),
    bagRow({ artifactId: 'mycelium_vine', row: 0, anchorX: 5, cols: 1, enabledXs: [5], color: '#6e9bbf' })
  ];
  assert.equal(classifyCell(overlapping, 5, 0, baseRect), 'bag-slot');
  assert.equal(bagRowEntryFor(overlapping, 5, 0).artifactId, 'mycelium_vine');
  assert.equal(bagRowEntryFor(overlapping, 0, 5), null);
});

test('[client-view-model] reports occupied artifact footprint cells', () => {
  const occupied = occupiedCellKeys([
    { artifactId: 'static_spore_sac', x: 3, y: 2, width: 1, height: 2 },
    { artifactId: 'thunder_gill', x: 0, y: 4, width: 2, height: 1 },
    { artifactId: 'bad_position', x: null, y: 5, width: 2, height: 1 }
  ]);

  assert.ok(occupied.has('3:2'));
  assert.ok(occupied.has('3:3'));
  assert.ok(occupied.has('0:4'));
  assert.ok(occupied.has('1:4'));
  assert.equal(occupied.has('4:2'), false);
});

test('[client-view-model] maps occupied cells to artifact values and derives preview orientation', () => {
  const occupied = buildOccupiedCellMap([
    { artifactId: 'static_spore_sac', x: 3, y: 2, width: 1, height: 2 },
    { artifactId: 'thunder_gill', x: 0, y: 4, width: 2, height: 1 }
  ]);

  assert.equal(occupied.get('3:2'), 'static_spore_sac');
  assert.equal(occupied.get('3:3'), 'static_spore_sac');
  assert.equal(occupied.get('1:4'), 'thunder_gill');
  assert.equal(occupied.has('4:2'), false);
  assert.deepEqual(preferredArtifactOrientation({ width: 1, height: 2 }), { width: 2, height: 1 });
  assert.deepEqual(artifactPreviewOrientation({ family: 'damage', width: 1, height: 2 }), { width: 1, height: 2 });
  assert.deepEqual(artifactPreviewOrientation({ family: 'bag', width: 1, height: 2 }), { width: 2, height: 1 });
  assert.deepEqual(preferredArtifactOrientation({
    width: 4,
    height: 1,
    shape: [[1], [1], [1], [1]]
  }), { width: 1, height: 4 });
});

test('[client-view-model] shapes headless grid board cells, bag slots, and pieces', () => {
  const bagRows = [
    bagRow({ artifactId: 'starter_bag', row: 0, anchorX: 0, cols: 3, enabledXs: [0, 1, 2] }),
    bagRow({ artifactId: 'hook_bag', row: 0, anchorX: 3, cols: 3, enabledXs: [3, 4], color: '#aa5500' }),
    bagRow({ artifactId: 'hook_bag', row: 1, anchorX: 3, cols: 3, enabledXs: [4, 5], color: '#aa5500' })
  ];
  const items = [
    { id: 'placed-1', artifactId: 'needle', x: 3, y: 0, width: 1, height: 1 },
    { rowId: 'placed-2', artifactId: 'blade', x: 4, y: 1, width: 2, height: 1 }
  ];

  const cells = shapeGridBoardCells({
    columns: 6,
    rows: 2,
    bagRows,
    items,
    baseRect: { cols: 3, rows: 3 },
    placementPreview: { cells: ['4:1', '5:1'], valid: false, family: 'damage' },
    hoverCellIndex: 4,
    droppable: true,
    interactiveCells: true
  });

  assert.equal(cells.length, 12);
  assert.deepEqual(cells.find((cell) => cell.key === '0:0'), {
    key: '0:0',
    index: 0,
    x: 0,
    y: 0,
    kind: 'base-inv',
    bagRow: bagRows[0],
    bagArtifactId: 'starter_bag',
    bagColor: '',
    occupied: false,
    interactive: true,
    dropTarget: false,
    baseInventory: true,
    bagSlot: false,
    bagBox: false,
    bagEmpty: false,
    preview: false,
    previewValid: false,
    previewInvalid: false,
    previewFamily: ''
  });
  const disabledBagCell = cells.find((cell) => cell.key === '5:0');
  assert.equal(disabledBagCell.kind, 'bag-box');
  assert.equal(disabledBagCell.bagBox, true);
  assert.equal(disabledBagCell.bagArtifactId, 'hook_bag');
  const occupiedPreview = cells.find((cell) => cell.key === '4:1');
  assert.equal(occupiedPreview.occupied, true);
  assert.equal(occupiedPreview.preview, true);
  assert.equal(occupiedPreview.previewInvalid, true);
  assert.equal(occupiedPreview.previewFamily, 'damage');
  assert.equal(cells.find((cell) => cell.index === 4).dropTarget, true);

  const slots = shapeGridBagSlotCells(bagRows);
  assert.deepEqual(slots.map((slot) => [slot.artifactId, slot.x, slot.y]), [
    ['starter_bag', 0, 0],
    ['starter_bag', 1, 0],
    ['starter_bag', 2, 0],
    ['hook_bag', 3, 0],
    ['hook_bag', 4, 0],
    ['hook_bag', 4, 1],
    ['hook_bag', 5, 1]
  ]);

  const pieces = shapeGridBoardPieces(items, { highlightedRowIds: new Set(['placed-2']) });
  assert.equal(pieces[0].key, 'needle:placed-1:3:0');
  assert.deepEqual(pieces[0].dataset, {
    artifactId: 'needle',
    rowId: 'placed-1',
    x: 3,
    y: 0,
    width: 1,
    height: 1
  });
  assert.equal(pieces[1].gridColumn, '5 / span 2');
  assert.equal(pieces[1].gridRow, '2 / span 1');
  assert.equal(pieces[1].highlighted, true);
});

test('[client-view-model] sums and formats artifact stat bonuses', () => {
  const statArtifacts = [
    { id: 'needle', bonus: { damage: 2, armor: 0, speed: -1 } },
    { id: 'plate', bonus: { armor: 3, stunChance: 5 } },
    { id: 'empty', bonus: { damage: 'bad' } }
  ];
  const statKeys = ['damage', 'armor', 'speed', 'stunChance'];

  const totals = sumArtifactBonuses([
    { artifactId: 'needle' },
    { artifactId: 'plate' },
    { artifactId: 'missing' },
    { artifactId: 'empty' }
  ], statArtifacts, { statKeys });

  assert.deepEqual(totals, {
    damage: 2,
    armor: 3,
    speed: -1,
    stunChance: 5
  });
  assert.equal(formatStatDelta(null), '');
  assert.equal(formatStatDelta(Number.NaN), '');
  assert.equal(formatStatDelta(0), '0');
  assert.equal(formatStatDelta(3), '+3');
  assert.equal(formatStatDelta(-1), '-1');
  assert.equal(formatStatDelta(5, { suffix: '%' }), '+5%');

  assert.deepEqual(formatArtifactBonusEntries({
    bonus: { damage: 2, armor: -1, speed: 0, stunChance: 5 }
  }, {
    labels: { damage: 'Damage', armor: 'Armor', speed: 'Speed', stunChance: 'Stun' },
    statKeys
  }), [
    { key: 'damage', label: 'Damage', value: '+2', numericValue: 2, positive: true },
    { key: 'armor', label: 'Armor', value: '-1', numericValue: -1, positive: false },
    { key: 'stunChance', label: 'Stun', value: '+5%', numericValue: 5, positive: true }
  ]);
  assert.deepEqual(shapeArtifactStatRows({
    bonus: { damage: 2, armor: -1, speed: 0, stunChance: 5 }
  }, {
    definitions: [
      { id: 'damage-chip', sourceKey: 'damage', roleId: 'damage' },
      { id: 'armor-chip', sourceKey: 'armor', roleId: 'armor' },
      { id: 'speed-chip', sourceKey: 'speed' },
      { id: 'stun-chip', sourceKey: 'stunChance', roleId: 'stun', suffix: '%' }
    ],
    labels: { damage: 'Damage', armor: 'Armor', speed: 'Speed', stunChance: 'Stun' },
    includeZeroes: false
  }), [
    {
      id: 'damage-chip',
      sourceKey: 'damage',
      roleId: 'damage',
      key: 'damage',
      label: 'Damage',
      text: '+2',
      value: 2,
      numericValue: 2,
      positive: true,
      sign: 'positive'
    },
    {
      id: 'armor-chip',
      sourceKey: 'armor',
      roleId: 'armor',
      key: 'armor',
      label: 'Armor',
      text: '-1',
      value: -1,
      numericValue: -1,
      positive: false,
      sign: 'negative'
    },
    {
      id: 'stun-chip',
      sourceKey: 'stunChance',
      roleId: 'stun',
      suffix: '%',
      key: 'stunChance',
      label: 'Stun',
      text: '+5%',
      value: 5,
      numericValue: 5,
      positive: true,
      sign: 'positive'
    }
  ]);
  assert.equal(formatLoadoutStatsText({
    totals,
    labels: { damage: 'Damage', armor: 'Armor', speed: 'Speed', stunChance: 'Stun' },
    statKeys
  }), 'Damage +2 / Armor +3 / Speed -1 / Stun +5%');
  assert.equal(formatLoadoutStatsText({
    items: [{ artifactId: 'plate' }],
    artifacts: new Map(statArtifacts.map((artifact) => [artifact.id, artifact])),
    labels: { armor: 'Armor', stunChance: 'Stun' },
    statKeys: ['armor', 'stunChance'],
    suffixByKey: {}
  }), 'Armor +3 / Stun +5');
});

test('[client-view-model] shapes headless shop item rows', () => {
  const rows = shapeShopItemRows({
    offer: ['needle', 'bag', 'missing'],
    availableBudget: 2,
    artifacts: [
      {
        id: 'needle',
        family: 'damage',
        name: { en: 'Needle', ru: 'Игла' },
        description: { en: 'Sharp.', ru: 'Острая.' },
        price: 2,
        width: 1,
        height: 2,
        characterItem: true,
        bonus: { damage: 2 }
      },
      {
        id: 'bag',
        family: 'bag',
        name: { en: 'Bag' },
        price: 3,
        slotCount: 4,
        width: 2,
        height: 2,
        bonus: {}
      }
    ],
    orientationForArtifact: (artifact) => ({ width: artifact.height, height: artifact.width }),
    statLabels: { damage: 'Damage' }
  });

  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], {
    id: 'needle:0',
    index: 0,
    artifactId: 'needle',
    artifact: {
      id: 'needle',
      family: 'damage',
      name: { en: 'Needle', ru: 'Игла' },
      description: { en: 'Sharp.', ru: 'Острая.' },
      price: 2,
      width: 1,
      height: 2,
      characterItem: true,
      bonus: { damage: 2 }
    },
    missing: false,
    family: 'damage',
    isBag: false,
    characterItem: true,
    slotCount: 0,
    price: 2,
    canAfford: true,
    unavailable: false,
    previewOrientation: { width: 2, height: 1 },
    previewItem: [{ artifactId: 'needle', x: 0, y: 0, width: 2, height: 1 }],
    statRows: [
      {
        id: 'damage',
        key: 'damage',
        sourceKey: 'damage',
        label: 'Damage',
        text: '+2',
        value: 2,
        numericValue: 2,
        positive: true,
        sign: 'positive'
      }
    ]
  });
  assert.equal(rows[1].isBag, true);
  assert.equal(rows[1].slotCount, 4);
  assert.equal(rows[1].canAfford, false);
  assert.equal(rows[1].unavailable, true);
  assert.equal(rows[2].missing, true);
  assert.equal(rows[2].canAfford, false);
});

test('[client-view-model] shapes headless artifact tile display contracts', () => {
  const rotated = shapeArtifactTileDisplay({
    id: 'amber_fang',
    family: 'damage',
    name: 'Amber Fang',
    width: 1,
    height: 2,
    price: 2,
    imageId: 'fang'
  }, {
    displayWidth: 2,
    displayHeight: 1,
    imageBasePath: '/artifacts'
  });

  assert.equal(rotated.id, 'amber_fang');
  assert.equal(rotated.width, 2);
  assert.equal(rotated.height, 1);
  assert.equal(rotated.imageSrc, '/artifacts/fang.png');
  assert.equal(rotated.imageAlt, 'Amber Fang');
  assert.equal(rotated.rotatedImage, true);
  assert.deepEqual(rotated.imageClassNames, [
    'artifact-figure-bitmap',
    'artifact-figure-bitmap--full',
    'artifact-figure-bitmap--rotated'
  ]);
  assert.deepEqual(rotated.rotatedImageVars, {
    '--artifact-rotated-bitmap-width': '50%',
    '--artifact-rotated-bitmap-height': '200%'
  });
  assert.equal(rotated.roleId, 'damage');
  assert.equal(rotated.shineId, 'bright');
  assert.deepEqual(rotated.cssClasses, ['artifact-role--damage', 'artifact-shine--bright']);
  assert.deepEqual(rotated.cells.map((cell) => [cell.x, cell.y, cell.filled]), [
    [0, 0, true],
    [1, 0, true]
  ]);

  const masked = shapeArtifactTileDisplay({
    id: 'hook_bag',
    family: 'bag',
    color: '#aa5500',
    width: 2,
    height: 2,
    shape: [
      [1, 0],
      [1, 1]
    ]
  }, {
    visualForArtifact: () => ({
      role: { id: 'bag', label: 'Bag', color: '#aa5500' },
      shine: { id: 'radiant', cssClass: 'artifact-shine--radiant' },
      cssClasses: ['artifact-role--bag', 'artifact-shine--radiant']
    }),
    roleGlyphLabel: (role) => `${role.label} slot role`
  });

  assert.equal(masked.hasMask, true);
  assert.equal(masked.footprintType, 'mask');
  assert.equal(masked.gridStyle['--artifact-role-color'], '#aa5500');
  assert.equal(masked.roleGlyph.label, 'Bag slot role');
  assert.deepEqual(masked.cells.map((cell) => [cell.key, cell.className]), [
    ['0:0', 'artifact-figure-cell'],
    ['1:0', 'artifact-figure-cell artifact-figure-cell--empty'],
    ['0:1', 'artifact-figure-cell'],
    ['1:1', 'artifact-figure-cell']
  ]);
});

test('[client-view-model] formats asset pack odds and availability labels', () => {
  const pack = {
    id: 'starter_pack',
    availability: 'active',
    raritySummary: [
      { rarity: 'common', probability: 0.75 },
      { rarity: 'rare', probability: 0.25 }
    ]
  };
  const rarityLabel = (rarity) => ({ common: 'Common', rare: 'Rare' }[rarity] || rarity);

  assert.equal(formatAssetPackRarityOdds(pack, { rarityLabel }), 'Common 75% · Rare 25%');
  assert.equal(assetPackIsActive(pack), true);
  assert.equal(assetPackAvailabilityLabel({ ...pack, availability: 'future' }, {
    labels: { future: 'Pack opens later.' }
  }), 'Pack opens later.');
});

test('[client-view-model] summarizes roll pack state for asset UIs', () => {
  const summaries = summarizeAssetRollPacks({
    portraits: [
      { assetId: 'skin.a', packId: 'starter_pack', unlocked: false, rollAvailable: true },
      { assetId: 'skin.c', unlocked: true }
    ],
    packs: [
      {
        id: 'starter_pack',
        name: { en: 'Starter Pack' },
        availability: 'active',
        rollPriceAmount: 50,
        rollSize: 2,
        totalItems: 2,
        ownedCount: 1,
        remainingCount: 1,
        raritySummary: [
          { rarity: 'common', probability: 0.75 },
          { rarity: 'rare', probability: 0.25 }
        ],
        duplicatePolicy: { enabled: true },
        duplicateCopies: 3,
        burn: { rules: [{ id: 'burn_common', ready: true, sourceCount: 5, sourceRarity: 'common' }] },
        guarantees: { rules: [{ minRarity: 'rare', count: 1 }] },
        pity: { rules: [{ minRarity: 'epic', threshold: 5, remaining: 1, active: false }] },
        items: [
          { assetId: 'skin.a', rarity: 'common', dropWeight: 75 },
          { assetId: 'skin.b', rarity: 'rare', dropWeight: 25 }
        ]
      }
    ],
    packName: (pack) => pack.name.en,
    rarityLabel: (rarity) => ({ common: 'Common', rare: 'Rare', epic: 'Epic' }[rarity] || rarity),
    labels: {
      guaranteeTemplate: 'Guarantee: {count} {rarity}+',
      pityTemplate: '{rarity}+ pity in {count} opens',
      pityReadyTemplate: '{rarity}+ guaranteed next open',
      duplicateTemplate: 'Duplicates: {count}'
    }
  });

  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].name, 'Starter Pack');
  assert.equal(summaries[0].canRoll, true);
  assert.equal(summaries[0].canBurn, true);
  assert.equal(summaries[0].nextRollItemCount, 2);
  assert.equal(summaries[0].odds, 'Common 75% · Rare 25%');
  assert.equal(summaries[0].guaranteeText, 'Guarantee: 1 Rare+');
  assert.equal(summaries[0].pityText, 'Epic+ pity in 1 opens');
  assert.equal(summaries[0].duplicateText, 'Duplicates: 3');
  assert.equal(summaries[0].burnRarity, 'Common');

  const [card] = shapeAssetPackCardRows(summaries, {
    labels: {
      detailsDuplicateMultiTemplate: '{count} cards · opens {rollSize} · costs {price}',
      oddsTemplate: 'Odds: {odds}',
      rollAction: 'Open pack',
      burnActionTemplate: 'Burn {count} {rarity}'
    }
  });
  assert.equal(card.title, 'Starter Pack');
  assert.deepEqual(card.lines.map((line) => [line.type, line.text]), [
    ['detail', '2 cards · opens 2 · costs 50'],
    ['duplicates', 'Duplicates: 3'],
    ['odds', 'Odds: Common 75% · Rare 25%'],
    ['guarantee', 'Guarantee: 1 Rare+'],
    ['pity', 'Epic+ pity in 1 opens']
  ]);
  assert.deepEqual(card.actions.map((action) => [action.kind, action.label, action.payload]), [
    ['roll', 'Open pack', { packId: 'starter_pack' }],
    ['burn', 'Burn 5 Common', { packId: 'starter_pack', ruleId: 'burn_common' }]
  ]);
});

test('[client-view-model] summarizes wallet purchase surfaces', () => {
  const summary = summarizeWalletPurchaseSurface({
    wallet: { balances: { soft_coin: 125 } },
    player: { spore: 10 },
    bundles: [
      { id: 'coins_small', provider: 'btcpay', priceAmount: 500, priceCurrency: 'USD' },
      { id: 'stars_small', provider: 'telegram_stars', priceAmount: 50, priceCurrency: 'XTR' }
    ],
    bundleSurface: 'web',
    surface: 'web',
    status: 'opened',
    support: {
      supportUrl: 'https://support.example/pay',
      termsUrl: 'https://terms.example/pay'
    },
    labels: {
      support: 'Support',
      terms: 'Terms',
      status: { opened: 'Checkout opened.' }
    }
  });

  assert.equal(resolveWalletBalance({ player: { spore: 10 } }), 10);
  assert.equal(resolveWalletBalance({ player: { profileCurrency: 12, spore: 10 } }), 12);
  assert.equal(resolveWalletBalance({ player: { profile_currency: 14 } }), 14);
  assert.equal(resolveWalletBalance({
    player: { old_balance: 16 },
    legacyFields: ['old_balance']
  }), 16);
  assert.equal(summarizeWalletPurchaseSurface({
    player: { profileCurrency: 18 },
    surface: 'web',
    bundleSurface: 'web'
  }).balance, 18);
  assert.equal(summary.balance, 125);
  assert.equal(summary.bundles.length, 2);
  assert.equal(summary.statusText, 'Checkout opened.');
  assert.deepEqual(summary.supportEntries, [
    { label: 'Support', url: 'https://support.example/pay' },
    { label: 'Terms', url: 'https://terms.example/pay' }
  ]);
  assert.equal(formatWalletBundlePrice(summary.bundles[0]), '$5.00');
  assert.equal(formatWalletBundlePrice(summary.bundles[1]), '50 XTR');
});

test('[client-view-model] shapes headless wallet bundle loading state', () => {
  assert.deepEqual(walletBundlesLoadingViewState({ surface: 'web' }), {
    loading: true,
    bundles: [],
    surface: 'web',
    errorMessage: ''
  });
  assert.deepEqual(walletBundlesLoadedViewState([{ id: 'coins_small' }], { surface: 'web' }), {
    loading: false,
    bundles: [{ id: 'coins_small' }],
    surface: 'web',
    errorMessage: ''
  });
  assert.deepEqual(walletBundlesErrorViewState(new Error('network down'), {
    surface: 'web',
    bundles: [{ id: 'cached' }]
  }), {
    loading: false,
    bundles: [{ id: 'cached' }],
    surface: 'web',
    errorMessage: 'network down'
  });
});

test('[client-view-model] normalizes wallet and asset-roll client statuses', () => {
  assert.equal(walletPurchaseStatusFromIntent({ status: 'completed' }), 'confirmed');
  assert.equal(walletPurchaseStatusFromIntent({ checkoutStatus: 'expired' }), 'expired');
  assert.equal(walletPurchaseStatusFromIntent({ status: 'reversed' }), 'failed');
  assert.equal(walletPurchaseStatusFromIntent({ status: 'open' }), '');
  assert.equal(walletPurchaseStatusFromIntent({ status: 'done' }, { completedStatus: 'DONE' }), 'confirmed');

  assert.equal(walletPurchaseStatusFromTelegramInvoice('paid'), 'confirmed');
  assert.equal(walletPurchaseStatusFromTelegramInvoice('pending'), 'pending');
  assert.equal(walletPurchaseStatusFromTelegramInvoice('expired'), 'expired');
  assert.equal(walletPurchaseStatusFromTelegramInvoice('cancelled'), 'failed');
  assert.equal(walletPurchaseStatusFromTelegramInvoice('unknown'), 'failed');

  assert.equal(assetRollStatusFromError(new Error('No unowned assets left')), 'complete');
  assert.equal(assetRollStatusFromError(new Error('No rollable assets in this pack')), 'complete');
  assert.equal(assetRollStatusFromError(new Error('Duplicate assets are unavailable')), 'burn_unavailable');
  assert.equal(assetRollStatusFromError(new Error('Not enough soft_coin')), 'insufficient');
  assert.equal(assetRollStatusFromError(new Error('Gacha is disabled')), 'disabled');
  assert.equal(assetRollStatusFromError(new Error('Pack is inactive')), 'unavailable');
  assert.equal(assetRollStatusFromError(new Error('Configuration is invalid')), 'invalid');
  assert.equal(assetRollStatusFromError(new Error('Unexpected failure')), 'failed');
});

test('[client-view-model] shapes headless wallet purchase mutation view state', () => {
  assert.deepEqual(walletPurchaseOpeningViewState(), {
    status: 'opening',
    errorMessage: ''
  });
  assert.deepEqual(walletPurchaseIntentViewState({ status: 'completed' }), {
    status: 'confirmed',
    handled: true,
    shouldRefresh: true
  });
  assert.deepEqual(walletPurchaseIntentViewState({ status: 'open' }), {
    status: '',
    handled: false,
    shouldRefresh: false
  });
  assert.deepEqual(walletPurchaseCheckoutViewState({
    checkout: { invoiceLink: 'https://invoice.example' },
    hasTelegramInvoice: true
  }), {
    status: 'opened',
    errorMessage: '',
    canOpen: true
  });
  assert.deepEqual(walletPurchaseCheckoutViewState({
    checkout: { setupRequired: true }
  }), {
    status: 'failed',
    errorMessage: 'Wallet purchases are not configured yet',
    canOpen: false
  });
  assert.deepEqual(walletPurchaseNextAction({ status: 'completed' }), {
    action: 'status',
    status: 'confirmed',
    errorMessage: '',
    shouldRefresh: true,
    checkout: null,
    invoiceLink: null,
    checkoutUrl: null,
    viewState: {
      status: 'confirmed',
      handled: true,
      shouldRefresh: true
    }
  });
  assert.deepEqual(walletPurchaseNextAction({
    checkout: { invoiceLink: 'https://invoice.example' }
  }, {
    hasTelegramInvoice: true
  }), {
    action: 'telegram_invoice',
    status: 'opened',
    errorMessage: '',
    shouldRefresh: false,
    checkout: { invoiceLink: 'https://invoice.example' },
    invoiceLink: 'https://invoice.example',
    checkoutUrl: null,
    viewState: {
      status: 'opened',
      errorMessage: '',
      canOpen: true
    }
  });
  assert.equal(walletPurchaseNextAction({
    checkout: { checkoutUrl: 'https://checkout.example' }
  }, {
    hasWebCheckout: true
  }).action, 'web_checkout');
  assert.equal(walletPurchaseNextAction({ checkout: { setupRequired: true } }).action, 'unavailable');
  assert.deepEqual(walletPurchaseErrorViewState(new Error('network down')), {
    status: 'failed',
    errorMessage: 'network down'
  });
});

test('[client-view-model] shapes headless asset roll mutation view state', () => {
  assert.deepEqual(assetRollPendingViewState(), {
    status: 'rolling',
    result: null,
    errorMessage: '',
    globalErrorMessage: ''
  });
  assert.deepEqual(assetRollResultViewState({
    roll: { id: 'roll_1' },
    rollResult: { assetId: 'skin.a' }
  }), {
    status: 'success',
    result: { assetId: 'skin.a' },
    errorMessage: '',
    globalErrorMessage: ''
  });
  assert.deepEqual(assetRollResultViewState({
    exchange: { id: 'burn_1' },
    burnResult: { assetId: 'skin.b' }
  }, {
    successKey: 'exchange',
    resultKey: 'burnResult',
    successStatus: 'burned',
    failureMessage: 'Failed to burn duplicates'
  }), {
    status: 'burned',
    result: { assetId: 'skin.b' },
    errorMessage: '',
    globalErrorMessage: ''
  });
  assert.deepEqual(assetRollMutationResultViewState({
    roll: { id: 'roll_1' },
    rollResult: { assetId: 'skin.a' }
  }), {
    status: 'success',
    result: { assetId: 'skin.a' },
    errorMessage: '',
    globalErrorMessage: '',
    shouldRefresh: true
  });
  assert.deepEqual(assetRollMutationResultViewState({
    exchange: { id: 'burn_1' },
    burnResult: { assetId: 'skin.b' }
  }, {
    successKey: 'exchange',
    resultKey: 'burnResult',
    successStatus: 'burned'
  }), {
    status: 'burned',
    result: { assetId: 'skin.b' },
    errorMessage: '',
    globalErrorMessage: '',
    shouldRefresh: true
  });
  assert.deepEqual(assetRollResultViewState(null, { failureMessage: 'Failed to roll pack' }), {
    status: 'failed',
    result: null,
    errorMessage: 'Failed to roll pack',
    globalErrorMessage: ''
  });
  assert.deepEqual(assetRollErrorViewState(new Error('Configuration is invalid')), {
    status: 'invalid',
    result: null,
    errorMessage: 'Configuration is invalid',
    globalErrorMessage: 'Configuration is invalid'
  });
  assert.deepEqual(assetRollErrorViewState(new Error('No rollable assets left')), {
    status: 'complete',
    result: null,
    errorMessage: 'No rollable assets left',
    globalErrorMessage: ''
  });
  assert.deepEqual(assetRollMutationErrorViewState(new Error('No rollable assets left')), {
    status: 'complete',
    result: null,
    errorMessage: 'No rollable assets left',
    globalErrorMessage: '',
    shouldRefresh: false
  });
});

test('[client-view-model] shapes run-shop response patches', () => {
  const run = { id: 'run_1', player: { coins: 5, name: 'Runner' } };

  const refresh = runShopRefreshResultViewState({
    coins: 4,
    refreshCount: 2,
    shopOffer: ['needle']
  }, { run });
  assert.deepEqual(refresh.run.player, { coins: 4, name: 'Runner' });
  assert.deepEqual(refresh.shopOffer, ['needle']);
  assert.equal(refresh.refreshCount, 2);

  const buy = runShopBuyResultViewState({
    id: 'row_2',
    coins: 2,
    shopOffer: ['plate']
  }, {
    run,
    artifactId: 'needle',
    containerItems: [{ id: 'row_1', artifactId: 'bag' }],
    freshPurchases: ['bag']
  });
  assert.deepEqual(buy.run.player, { coins: 2, name: 'Runner' });
  assert.deepEqual(buy.shopOffer, ['plate']);
  assert.deepEqual(buy.containerItems.map((item) => item.id), ['row_1', 'row_2']);
  assert.deepEqual(buy.freshPurchases, ['bag', 'needle']);
  assert.deepEqual(buy.boughtItem, { id: 'row_2', artifactId: 'needle' });

  const sell = runShopSellResultViewState({
    id: 'row_2',
    artifactId: 'needle',
    coins: 3
  }, {
    run,
    builderItems: [
      { id: 'row_2', artifactId: 'needle' },
      { id: 'row_3', artifactId: 'needle' }
    ],
    containerItems: [{ id: 'row_4', artifactId: 'bag' }],
    activeBags: [{ id: 'row_5', artifactId: 'starter_bag' }],
    freshPurchases: ['needle', 'bag'],
    target: { id: 'row_2', artifactId: 'needle' }
  });
  assert.deepEqual(sell.run.player, { coins: 3, name: 'Runner' });
  assert.deepEqual(sell.builderItems.map((item) => item.id), ['row_3']);
  assert.deepEqual(sell.containerItems.map((item) => item.id), ['row_4']);
  assert.deepEqual(sell.activeBags.map((item) => item.id), ['row_5']);
  assert.deepEqual(sell.freshPurchases, ['bag']);
  assert.equal(sell.deletedRowId, 'row_2');
  assert.equal(sell.deletedArtifactId, 'needle');

  const fallbackSell = runShopSellResultViewState({
    artifactId: 'needle',
    coins: 4
  }, {
    run,
    builderItems: [
      { id: 'row_a', artifactId: 'needle' },
      { id: 'row_b', artifactId: 'needle' }
    ],
    target: 'needle'
  });
  assert.deepEqual(fallbackSell.builderItems.map((item) => item.id), ['row_b']);
});

test('[client-view-model] shapes game-run response patches', () => {
  const start = gameRunStartResultViewState({
    id: 'run_1',
    player: { coins: 5 },
    shopOffer: ['needle']
  });
  assert.deepEqual(start.run.loadoutItems, []);
  assert.deepEqual(start.shopOffer, ['needle']);
  assert.deepEqual(start.rounds, []);
  assert.equal(start.refreshCount, 0);

  const run = {
    id: 'run_1',
    currentRound: 1,
    player: { coins: 5 },
    rounds: [{ roundNumber: 1, battleId: 'battle_1' }]
  };
  const ready = gameRunReadyResultViewState({
    id: 'run_1',
    currentRound: 2,
    player: { coins: 6 },
    lastRound: { roundNumber: 2, battleId: 'battle_2' },
    battle: { id: 'battle_2' }
  }, { run });
  assert.equal(ready.waiting, false);
  assert.equal(ready.run.currentRound, 2);
  assert.deepEqual(ready.run.player, { coins: 6 });
  assert.deepEqual(ready.rounds.map((round) => round.roundNumber), [1, 2]);
  assert.equal(ready.battleId, 'battle_2');
  assert.equal(ready.shouldLoadReplay, true);
  assert.equal(ready.shouldShowComplete, false);
  assert.deepEqual(ready.result.rounds.map((round) => round.roundNumber), [1, 2]);

  const completed = gameRunReadyResultViewState({
    id: 'run_1',
    status: 'completed',
    currentRound: 4,
    completionBonus: { softCoin: 5 },
    lastRound: { roundNumber: 4 }
  }, {
    run: { ...run, status: 'active' },
    previousRounds: [{ roundNumber: 3 }]
  });
  assert.equal(completed.run.status, 'completed');
  assert.equal(completed.shouldShowComplete, true);
  assert.equal(completed.completionGameRunId, 'run_1');

  const transition = gameRunRoundTransitionViewState({
    status: 'active',
    currentRound: 3,
    player: { coins: 7 },
    shopOffer: ['plate'],
    loadoutItems: [{ id: 'row_plate', artifactId: 'plate' }],
    fusions: [{ id: 'fusion_1' }]
  }, { run });
  assert.equal(transition.run.currentRound, 3);
  assert.deepEqual(transition.shopOffer, ['plate']);
  assert.deepEqual(transition.loadoutItems.map((item) => item.id), ['row_plate']);
  assert.deepEqual(transition.fusionRevealQueue, [{ id: 'fusion_1' }]);
  assert.equal(transition.shouldRefreshBootstrap, false);

  const completion = gameRunCompletionResultViewState({
    id: 'run_1',
    mode: 'solo',
    status: 'abandoned',
    currentRound: 3,
    endedAt: 'now',
    endReason: 'abandoned',
    player: { coins: 7 },
    achievements: [{ id: 'ach_1' }],
    rounds: [{ roundNumber: 1 }]
  });
  assert.deepEqual(completion.run, {
    id: 'run_1',
    mode: 'solo',
    status: 'abandoned',
    currentRound: 3,
    startedAt: undefined,
    endedAt: 'now',
    endReason: 'abandoned',
    completionBonus: null,
    player: { coins: 7 }
  });
  assert.deepEqual(completion.result.achievements, [{ id: 'ach_1' }]);
  assert.deepEqual(completion.rounds, [{ roundNumber: 1 }]);
});

test('[client-view-model] shapes replay playback state', () => {
  assert.equal(replayLongBattleSpeedBoost(30, 29), 1);
  assert.equal(replayLongBattleSpeedBoost(LONG_BATTLE_SPEED_BOOST_2X_INDEX, LONG_BATTLE_SPEED_BOOST_2X_INDEX), 1);
  assert.equal(replayLongBattleSpeedBoost(LONG_BATTLE_SPEED_BOOST_4X_INDEX + 12, LONG_BATTLE_SPEED_BOOST_2X_INDEX), 2);
  assert.equal(replayLongBattleSpeedBoost(LONG_BATTLE_SPEED_BOOST_4X_INDEX + 12, LONG_BATTLE_SPEED_BOOST_3X_INDEX), 3);
  assert.equal(replayLongBattleSpeedBoost(LONG_BATTLE_SPEED_BOOST_4X_INDEX + 12, LONG_BATTLE_SPEED_BOOST_4X_INDEX), 4);
  assert.equal(preferredReplaySpeed({ replaySpeed: 4 }), 4);
  assert.equal(preferredReplaySpeed({ replaySpeed: 16 }), 2);

  assert.deepEqual(replayAutoplayDelayViewState({
    eventCount: LONG_BATTLE_SPEED_BOOST_4X_INDEX + 12,
    replayIndex: LONG_BATTLE_SPEED_BOOST_3X_INDEX,
    replaySpeed: 4,
    settings: { battleSpeed: '2x' },
    defaultDelayMs: 1200,
    fastDelayMs: 600
  }), {
    selectedSpeed: 4,
    boost: 3,
    speed: 12,
    baseDelay: 600,
    delay: 50
  });

  const battle = {
    events: [
      { type: 'start', narration: 'Start', state: { left: { currentHealth: 10 } } },
      { type: 'action', actorSide: 'left', narration: 'Hit', state: { left: { currentHealth: 10 } } },
      { type: 'skip', actorSide: 'right', narration: 'Skip', state: { left: { currentHealth: 10 } } },
      { type: 'battle_end', winnerSide: 'left', narration: 'End', state: { left: { currentHealth: 10 } } }
    ]
  };
  assert.deepEqual(replayAdvanceTickViewState({ battle, replayIndex: 2 }), {
    replayIndex: 3,
    finished: true,
    shouldStop: false,
    shouldRestartTimer: false,
    previousBoost: 1,
    nextBoost: 1
  });
  assert.deepEqual(replayLoadResultViewState(battle, { settings: { replaySpeed: 8 } }), {
    currentBattle: battle,
    replayIndex: 0,
    replaySpeed: 8,
    errorMessage: ''
  });
  assert.deepEqual(replaySetSpeedViewState(4, {
    settings: { lang: 'en', replaySpeed: 2 }
  }), {
    replaySpeed: 4,
    settings: { lang: 'en', replaySpeed: 4 },
    shouldPersist: true,
    errorMessage: ''
  });

  const timeline = replayTimelineViewState({
    battle,
    replayIndex: 2,
    formatEvent: (event, index) => ({
      statusText: `${index}:${event.type}`,
      logText: `${index}:${event.narration}`,
      speechSide: event.actorSide,
      speechText: event.actorSide ? 'swing' : '',
      speechParts: event.actorSide ? ['swing'] : []
    })
  });
  assert.equal(timeline.activeEvent.type, 'skip');
  assert.deepEqual(timeline.activeSpeech, { side: 'right', narration: 'swing', parts: ['swing'] });
  assert.equal(timeline.battleStatusText, '2:skip');
  assert.equal(timeline.replayFinished, false);
  assert.deepEqual(timeline.visibleReplayEvents.map((event) => event.display.statusText), ['2:skip', '1:action', '0:start']);
  assert.deepEqual(timeline.visibleReplayEvents.map((event) => event.text), ['2:Skip', '1:Hit', '0:Start']);
  assert.deepEqual(timeline.visibleReplayEvents.map((event) => event.active), [true, false, false]);
  assert.deepEqual(timeline.activeReplayState, { left: { currentHealth: 10 } });

  const logRows = shapeReplayEventRows(battle.events, {
    eventTypes: ['action', 'skip', 'battle_end'],
    limit: 2,
    limitFromEnd: true,
    textForEvent: (event) => event.narration
  });
  assert.deepEqual(logRows.map((event) => [event.type, event.text, event.replayIndex]), [
    ['skip', 'Skip', 2],
    ['battle_end', 'End', 3]
  ]);
	});

test('[client-view-model] flattens gacha admin draft diffs for table rows', () => {
  assert.deepEqual(gachaAdminDraftDiffRows(null), []);
  assert.deepEqual(gachaAdminDraftDiffRows({ missingBase: true }), []);
  assert.deepEqual(gachaAdminDraftDiffRows({
    changedFields: [{ field: 'rollPriceAmount', before: 100, after: 120 }],
    addedItems: ['skin.c'],
    removedItems: ['skin.b'],
    changedItems: [{
      assetId: 'skin.a',
      changes: [
        { field: 'dropWeight', before: 100, after: 80 },
        { field: 'rarity', before: 'common', after: 'rare' }
      ]
    }]
  }), [
    { type: 'field', field: 'rollPriceAmount', before: 100, after: 120 },
    { type: 'item_added', field: 'skin.c', before: null, after: 'skin.c' },
    { type: 'item_removed', field: 'skin.b', before: 'skin.b', after: null },
    { type: 'item_changed', field: 'skin.a', before: [100, 'common'], after: [80, 'rare'] }
  ]);
});

test('[client-view-model] shapes gacha admin validation, checklist, and plan rows', () => {
  assert.deepEqual(gachaAdminValidationIssueRows({
    errors: [{ code: 'pack_missing' }],
    warnings: [{ code: 'low_weight' }]
  }), [
    { code: 'pack_missing', severity: 'error' },
    { code: 'low_weight', severity: 'warning' }
  ]);
  assert.deepEqual(gachaAdminReleaseChecklistRows({
    blockers: [{ code: 'missing_dates', severity: 'blocker' }],
    warnings: [{ code: 'policy_warning', severity: 'warning' }],
    passed: [{ code: 'price_present', severity: 'pass' }]
  }).map((issue) => issue.code), ['missing_dates', 'policy_warning', 'price_present']);

  const planItems = [
    { characterId: 'ruby', status: 'ready', dropWeight: 25 },
    { character_id: 'ruby', status: 'planned', drop_weight: '75' },
    { characterId: 'amber', status: 'ready', dropWeight: 0 }
  ];
  assert.equal(gachaAdminPlanTotalWeight(planItems), 100);
  assert.deepEqual(gachaAdminPlanCoverageRows(planItems, {
    characters: [
      { id: 'ruby', label: 'Ruby' },
      { id: 'amber', label: 'Amber' },
      { id: 'opal', label: 'Opal' }
    ],
    targetPerCharacter: 2
  }), [
    { id: 'ruby', label: 'Ruby', count: 2, readyCount: 1, totalWeight: 100, target: 2, missing: 0, enough: true },
    { id: 'amber', label: 'Amber', count: 1, readyCount: 1, totalWeight: 0, target: 2, missing: 1, enough: false },
    { id: 'opal', label: 'Opal', count: 0, readyCount: 0, totalWeight: 0, target: 2, missing: 2, enough: false }
  ]);
  assert.equal(gachaAdminPlanChanceText({ dropWeight: 25 }, { totalWeight: 100 }), '25.0%');
  assert.equal(gachaAdminPlanChanceText({ dropWeight: 1 }, { totalWeight: 1000 }), '0.10%');
  assert.equal(gachaAdminPlanChanceText({ dropWeight: 1 }, { totalWeight: 0 }), '0.0%');
});

test('[client-view-model] shapes gacha admin odds preview rows', () => {
  const preview = {
    raritySummary: [
      { rarity: 'rare', probability: 0.25, count: 2, dropWeight: 25 },
      { rarity: 'secret', expectedPerOpen: 0.001, count: 1, dropWeight: 1 }
    ],
    items: [
      { assetId: 'skin.a', rarity: 'rare', dropWeight: 25, probability: 0.25, copyLimit: 1 },
      { assetId: 'skin.b', rarity: 'secret', dropWeight: 1, probability: 0.001 },
      { assetId: 'skin.c', rarity: 'common', dropWeight: 100, probability: 0.749 }
    ]
  };

  assert.deepEqual(gachaAdminOddsRarityRows({ preview }), [
    { rarity: 'rare', probability: 0.25, count: 2, dropWeight: 25, expectedText: '25.0%', dropWeightText: 25 },
    { rarity: 'secret', expectedPerOpen: 0.001, count: 1, dropWeight: 1, expectedText: '0.10%', dropWeightText: 1 }
  ]);
  assert.deepEqual(gachaAdminOddsItemRows(preview, { limit: 2 }), [
    {
      assetId: 'skin.a',
      rarity: 'rare',
      dropWeight: 25,
      probability: 0.25,
      copyLimit: 1,
      expectedText: '25.0%',
      dropWeightText: 25,
      copyLimitText: 1
    },
    {
      assetId: 'skin.b',
      rarity: 'secret',
      dropWeight: 1,
      probability: 0.001,
      expectedText: '0.10%',
      dropWeightText: 1,
      copyLimitText: '-'
    }
  ]);
  assert.deepEqual(gachaAdminOddsRarityRows(null), []);

  const sections = shapeGachaAdminOddsTableSections(preview, {
    itemLimit: 1,
    labels: {
      rarityTitle: 'Rarity table',
      itemTitle: 'Item table',
      copyCap: 'Copies'
    }
  });
  assert.deepEqual(sections.map((section) => [section.key, section.title, section.rows.length]), [
    ['rarities', 'Rarity table', 2],
    ['items', 'Item table', 1]
  ]);
  assert.deepEqual(sections[1].columns.map((column) => [column.key, column.label, column.field]), [
    ['asset', 'Asset', 'assetId'],
    ['rarity', 'Rarity', 'rarity'],
    ['weight', 'Weight', 'dropWeightText'],
    ['expected', 'Expected', 'expectedText'],
    ['copy_cap', 'Copies', 'copyLimitText']
  ]);
  assert.equal(sections[1].rows[0].rowKey, 'skin.a');
});

test('[client-view-model] shapes gacha admin fixture and simulation preview rows', () => {
  assert.deepEqual(gachaAdminFixtureOperationRows({
    operations: [
      { type: 'pack', id: 'pack_1', action: 'update', afterCount: 2 },
      { type: 'item', id: 'item_1', action: 'noop' },
      { type: 'item', id: 'item_2', action: 'create', afterCount: 1 }
    ]
  }, { limit: 2 }), [
    { type: 'pack', id: 'pack_1', action: 'update', afterCount: 2, afterCountText: 2 },
    { type: 'item', id: 'item_1', action: 'noop', afterCountText: '-' }
  ]);

  assert.deepEqual(gachaAdminSimulationItemRows({
    items: [
      { assetId: 'skin.a', rarity: 'rare', dropWeight: 25, observedPerRoll: 0.25, observedCount: 250 },
      { assetId: 'skin.b', rarity: 'secret', observedPerRoll: 0.001, observedCount: 1 }
    ]
  }), [
    {
      assetId: 'skin.a',
      rarity: 'rare',
      dropWeight: 25,
      observedPerRoll: 0.25,
      observedCount: 250,
      observedPerRollText: '25.0%',
      dropWeightText: 25
    },
    {
      assetId: 'skin.b',
      rarity: 'secret',
      observedPerRoll: 0.001,
      observedCount: 1,
      observedPerRollText: '0.10%',
      dropWeightText: '-'
    }
  ]);
});

test('[client-view-model] summarizes asset roll feedback', () => {
  const localizeName = (value) => value?.en || value || '';
  const rarityLabel = (rarity) => ({ common: 'Common', rare: 'Rare', epic: 'Epic' }[rarity] || rarity);
  const labels = {
    openingTitle: 'Opening pack',
    openingText: 'Rolling...',
    burnOpeningTitle: 'Trading duplicates',
    burnOpeningText: 'Burning spare copies.',
    multiResultTitleTemplate: '{count} skins unlocked',
    resultTitle: 'New skin unlocked',
    resultTemplate: '{asset} · {rarity}',
    burnResultTitle: 'Exchange complete',
    burnResultTemplate: '{asset} · {rarity}',
    problemTitle: 'Pack not opened',
    errors: { complete: 'Every skin is already owned.' }
  };

  assert.deepEqual(summarizeAssetRollFeedback({ status: 'rolling', labels }), {
    status: 'rolling',
    title: 'Opening pack',
    text: 'Rolling...'
  });
  assert.deepEqual(summarizeAssetRollFeedback({
    status: 'success',
    result: { assetName: { en: 'Mooncap' }, assetId: 'skin.a', rarity: 'rare' },
    labels,
    localizeName,
    rarityLabel
  }), {
    status: 'success',
    title: 'New skin unlocked',
    text: 'Mooncap · Rare'
  });
  assert.equal(formatAssetRollResultItemsText({
    items: [
      { assetName: { en: 'Mooncap' }, rarity: 'rare' },
      { assetName: { en: 'Amber Veil' }, rarity: 'common' },
      { assetName: { en: 'Spore Crown' }, rarity: 'epic' },
      { assetName: { en: 'Night Bloom' }, rarity: 'rare' }
    ]
  }, { localizeName, rarityLabel }), 'Mooncap · Rare | Amber Veil · Common | Spore Crown · Epic +1');
  assert.deepEqual(summarizeAssetRollFeedback({
    status: 'complete',
    errorMessage: 'No assets left',
    labels
  }), {
    status: 'complete',
    title: 'Pack not opened',
    text: 'Every skin is already owned.'
  });
  assert.equal(summarizeAssetRollFeedback({ status: 'success', labels }), null);
  assert.equal(shapeAssetRollResultPanel(null), null);
  assert.deepEqual(shapeAssetRollResultPanel({
    status: 'success',
    result: { assetName: { en: 'Mooncap' }, assetId: 'skin.a', rarity: 'rare' },
    labels,
    localizeName,
    rarityLabel
  }, {
    baseClass: 'roll-panel',
    testId: 'roll-result'
  }), {
    status: 'success',
    title: 'New skin unlocked',
    text: 'Mooncap · Rare',
    visible: true,
    role: 'status',
    ariaLive: 'polite',
    testId: 'roll-result',
    className: 'roll-panel roll-panel--success',
    lines: [{ key: 'text', type: 'text', text: 'Mooncap · Rare' }]
  });
  assert.equal(shapeAssetRollResultPanel({ status: 'success', labels }), null);
});
