import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AchievementBadge,
  ArtifactStatSummary,
  ArtifactTile,
  AssetRollResultPanel,
  BackpackGrid,
  BattleLog,
  FighterCard,
  GachaOddsTable,
  GachaPackCard,
  GachaPackCardList,
  PrepActions,
  RunHud,
  SellZone,
  SeasonRankEmblem,
  ShopItemList,
  ShopItemRow
} from '@microwavedev/backpack-game-core/vue/components';

test('[vue] AssetRollResultPanel exposes neutral panel rendering contract', () => {
  assert.equal(AssetRollResultPanel.name, 'AssetRollResultPanel');
  assert.match(AssetRollResultPanel.template, /data-testid/);
  assert.match(AssetRollResultPanel.template, /slot name="title"/);
  assert.match(AssetRollResultPanel.template, /slot name="line"/);
  assert.equal(AssetRollResultPanel.computed.visible.call({ panel: { visible: true } }), true);
  assert.equal(AssetRollResultPanel.computed.visible.call({ panel: { visible: false } }), false);
  assert.deepEqual(AssetRollResultPanel.computed.renderedLines.call({
    panel: { lines: [{ key: 'text', text: 'Unlocked' }] }
  }), [{ key: 'text', text: 'Unlocked' }]);
  assert.deepEqual(AssetRollResultPanel.computed.renderedLines.call({ panel: null }), []);
});

test('[vue] GachaOddsTable exposes neutral table rendering contract', () => {
  assert.equal(GachaOddsTable.name, 'GachaOddsTable');
  assert.match(GachaOddsTable.template, /section-title/);
  assert.match(GachaOddsTable.template, /rowValue/);
  const sections = GachaOddsTable.computed.visibleSections.call({
    sections: [
      { key: 'empty', rows: [] },
      { key: 'hidden', visible: false, rows: [{ rowKey: 'a' }] },
      { key: 'rarities', rows: [{ rowKey: 'rare', rarity: 'rare' }] }
    ]
  });
  assert.deepEqual(sections.map((section) => section.key), ['rarities']);
  assert.equal(
    GachaOddsTable.methods.rowValue({ rarity: 'rare' }, { field: 'rarity' }),
    'rare'
  );
  assert.equal(
    GachaOddsTable.methods.rowValue({ rarity: null }, { field: 'rarity' }),
    ''
  );
});

test('[vue] ArtifactTile exposes neutral artifact tile rendering contract', () => {
  assert.equal(ArtifactTile.name, 'ArtifactTile');
  assert.match(ArtifactTile.template, /tile\.gridStyle/);
  assert.match(ArtifactTile.template, /slot name="role-glyph"/);
  const tile = {
    id: 'amber_fang',
    family: 'damage',
    width: 2,
    height: 1,
    cssClasses: ['artifact-role--damage', 'artifact-shine--bright'],
    gridStyle: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
    cells: [
      { key: '0:0', className: 'artifact-figure-cell' },
      { key: '1:0', className: 'artifact-figure-cell' }
    ],
    imageClassNames: ['artifact-figure-bitmap', 'artifact-figure-bitmap--full'],
    roleGlyph: {
      label: 'Damage role',
      classNames: ['artifact-role-glyph', 'artifact-role-glyph--damage']
    }
  };
  assert.equal(ArtifactTile.computed.visible.call({ tile }), true);
  assert.deepEqual(ArtifactTile.computed.renderedCells.call({ tile }), tile.cells);
  assert.deepEqual(ArtifactTile.computed.rootClasses.call({
    tile,
    rootClass: 'artifact-figure-grid'
  }), ['artifact-figure-grid', 'artifact-role--damage', 'artifact-shine--bright']);
  assert.deepEqual(ArtifactTile.computed.imageClasses.call({ tile }), tile.imageClassNames);
  assert.deepEqual(ArtifactTile.computed.roleGlyphClasses.call({
    tile,
    roleGlyphExtraClass: 'artifact-figure-role-glyph'
  }), ['artifact-role-glyph', 'artifact-role-glyph--damage', 'artifact-figure-role-glyph']);
  assert.equal(ArtifactTile.computed.roleGlyphLabel.call({ tile }), 'Damage role');
});

test('[vue] FighterCard exposes neutral combatant and grid rendering contract', () => {
  assert.equal(FighterCard.name, 'FighterCard');
  assert.match(FighterCard.template, /resolvedCombatant/);
  assert.match(FighterCard.template, /gridBoardComponent/);
  assert.equal(FighterCard.computed.resolvedCombatant.call({
    combatant: { id: 'fighter_1' }
  }).id, 'fighter_1');
  assert.equal(FighterCard.computed.portraitSrc.call({
    imagePath: '',
    resolvedCombatant: { imagePath: '/fighters/fighter-1.png' }
  }), '/fighters/fighter-1.png');
  assert.equal(FighterCard.computed.portraitAlt.call({
    resolvedCombatant: { name: { en: 'Sienna' } }
  }), 'Sienna');
  assert.equal(FighterCard.computed.displayName.call({
    nameText: '',
    resolvedCombatant: { displayName: 'Ruby' }
  }), 'Ruby');
  assert.equal(FighterCard.computed.hpPercent.call({ healthText: '7 / 10' }), 70);
  assert.equal(FighterCard.computed.hpPercent.call({ healthText: '-3 / 10' }), 0);
  const getArtifact = (artifactId) => ({
    id: artifactId,
    family: artifactId === 'bag' ? 'bag' : 'damage',
    width: artifactId === 'bag' ? 2 : 1,
    height: artifactId === 'bag' ? 2 : 1
  });
  const gridProps = FighterCard.computed.gridProps.call({
    loadout: {
      items: [
        { artifactId: 'bag', x: 0, y: 0, width: 2, height: 2, active: 1 },
        { artifactId: 'blade', x: 0, y: 0, width: 1, height: 1 }
      ]
    },
    getArtifact,
    bagArtifactIds: null,
    gridColumns: 4,
    gridMinRows: 4
  });
  assert.equal(gridProps.totalRows >= 4, true);
  assert.equal(gridProps.items.some((item) => item.artifactId === 'blade'), true);
});

test('[vue] RunHud exposes neutral run summary and currency hooks', () => {
  assert.equal(RunHud.name, 'RunHud');
  assert.match(RunHud.template, /currencyText/);
  const context = {
    player: { wins: 2, livesRemaining: 4 },
    labels: { wins: 'Victories', lives: 'Health' },
    runCurrency: { amount: 7, icon: '*', label: 'Tokens' }
  };
  assert.equal(RunHud.computed.winsLabel.call(context), 'Victories');
  assert.equal(RunHud.computed.livesLabel.call(context), 'Health');
  assert.equal(RunHud.computed.winsValue.call(context), 2);
  assert.equal(RunHud.computed.livesValue.call(context), 4);
  assert.equal(RunHud.computed.currencyAmount.call(context), 7);
  assert.deepEqual(RunHud.computed.currencyParts.call({
    ...context,
    currencyAmount: 7
  }), ['*', 7, 'Tokens']);
  assert.equal(RunHud.computed.currencyText.call({
    ...context,
    currencyParts: ['*', 7, 'Tokens']
  }), '* 7 Tokens');
  assert.equal(RunHud.computed.currencyAmount.call({
    player: { runCurrency: 3 },
    runCurrency: {}
  }), 3);
});

test('[vue] PrepActions exposes neutral ready and abandon action hooks', () => {
  assert.equal(PrepActions.name, 'PrepActions');
  assert.match(PrepActions.template, /showOpponentStatus/);
  assert.match(PrepActions.template, /@click="emitReady"/);
  const context = {
    labels: {
      ready: 'Go',
      readying: 'Going...',
      abandon: 'Leave',
      opponentReady: 'Other ready',
      opponentWaiting: 'Waiting'
    },
    actionInFlight: true,
    opponentReady: false
  };
  assert.equal(PrepActions.computed.readyLabel.call(context), 'Go');
  assert.equal(PrepActions.computed.readyingLabel.call({
    labels: {},
    readyLabel: 'Ready'
  }), 'Ready');
  assert.equal(PrepActions.computed.abandonLabel.call(context), 'Leave');
  assert.equal(PrepActions.computed.primaryText.call({
    ...context,
    readyLabel: 'Go',
    readyingLabel: 'Going...'
  }), 'Going...');
  assert.equal(PrepActions.computed.opponentText.call({
    ...context,
    opponentReadyLabel: 'Other ready',
    opponentWaitingLabel: 'Waiting'
  }), 'Waiting');
  assert.equal(PrepActions.computed.opponentClass.call({
    opponentReady: true,
    opponentReadyClass: 'ready',
    opponentWaitingClass: 'waiting'
  }), 'ready');
  const emitted = [];
  PrepActions.methods.emitReady.call({
    $emit: (event) => emitted.push(event)
  });
  PrepActions.methods.emitAbandon.call({
    $emit: (event) => emitted.push(event)
  });
  assert.deepEqual(emitted, ['ready', 'primary-action', 'abandon', 'secondary-action']);
});

test('[vue] SellZone exposes neutral sell-drop rendering and events', () => {
  assert.equal(SellZone.name, 'SellZone');
  assert.match(SellZone.template, /slot v-if="showPrice"/);
  assert.equal(SellZone.computed.showPrice.call({
    active: true,
    draggingItemId: 'row_1'
  }), true);
  assert.deepEqual(SellZone.computed.rootClasses.call({
    rootClass: 'sell-zone',
    activeClass: 'sell-zone--active',
    active: true
  }), ['sell-zone', 'sell-zone--active']);
  assert.equal(SellZone.computed.priceText.call({
    pricePrefix: '*',
    priceLabel: '2'
  }), '* +2');
  assert.equal(SellZone.computed.idleText.call({
    inactivePrefix: '$',
    inactiveText: 'Sell here'
  }), '$ Sell here');
});

test('[vue] AchievementBadge exposes neutral image badge path hooks', () => {
  assert.equal(AchievementBadge.name, 'AchievementBadge');
  assert.match(AchievementBadge.template, /imageClass/);
  const context = {
    achievement: { id: 'first-win' },
    idField: 'id',
    imageBasePath: '/achievements',
    extension: 'png',
    rootClass: 'achievement-badge',
    size: 'small'
  };
  assert.equal(AchievementBadge.computed.imageId.call(context), 'first-win');
  assert.equal(AchievementBadge.computed.pngSrc.call({
    ...context,
    imageId: AchievementBadge.computed.imageId.call(context)
  }), '/achievements/first-win.png');
  assert.deepEqual(AchievementBadge.computed.badgeClass.call(context), [
    'achievement-badge',
    'achievement-badge--small'
  ]);
});

test('[vue] SeasonRankEmblem exposes neutral image emblem path hooks', () => {
  assert.equal(SeasonRankEmblem.name, 'SeasonRankEmblem');
  assert.match(SeasonRankEmblem.template, /emblemClass/);
  const context = {
    rankId: 'gold',
    imageBasePath: '/season-ranks',
    extension: 'png',
    rootClass: 'season-rank-emblem',
    size: 96
  };
  assert.equal(SeasonRankEmblem.computed.pngSrc.call(context), '/season-ranks/gold.png');
  assert.deepEqual(SeasonRankEmblem.computed.emblemClass.call(context), [
    'season-rank-emblem',
    'season-rank-emblem--gold'
  ]);
  assert.deepEqual(SeasonRankEmblem.computed.emblemStyle.call(context), {
    width: '96px',
    height: '96px'
  });
});

test('[vue] ArtifactStatSummary exposes neutral stat chip rendering contract', () => {
  assert.equal(ArtifactStatSummary.name, 'ArtifactStatSummary');
  assert.match(ArtifactStatSummary.template, /slot name="items"/);
  assert.match(ArtifactStatSummary.template, /chipClasses/);
  const context = {
    rows: null,
    source: null,
    totals: { damage: 2, armor: 0, speed: -1 },
    artifact: null,
    definitions: [
      { id: 'damage', sourceKey: 'damage', roleId: 'damage' },
      { id: 'armor', sourceKey: 'armor', roleId: 'armor' },
      { id: 'speed', sourceKey: 'speed' }
    ],
    labels: { damage: 'Damage', armor: 'Armor', speed: 'Speed' },
    roleMap: { damage: { color: '#f33' }, armor: { color: '#39f' } },
    includeZeroes: false,
    variant: 'compact',
    rootClass: 'artifact-stat-summary artifact-inventory-stats',
    rootModifierBase: 'artifact-stat-summary'
  };
  const items = ArtifactStatSummary.computed.statSummaryItems.call({
    ...context,
    statSource: ArtifactStatSummary.computed.statSource.call(context)
  });
  assert.deepEqual(items.map((item) => ({
    id: item.id,
    label: item.label,
    text: item.text,
    sign: item.sign,
    roleColor: item.role?.color || null
  })), [
    { id: 'damage', label: 'Damage', text: '+2', sign: 'positive', roleColor: '#f33' },
    { id: 'speed', label: 'Speed', text: '-1', sign: 'negative', roleColor: null }
  ]);
  assert.deepEqual(ArtifactStatSummary.computed.summaryClass.call(context), [
    'artifact-stat-summary artifact-inventory-stats',
    'artifact-stat-summary--compact'
  ]);
  assert.deepEqual(ArtifactStatSummary.methods.chipClasses.call({
    chipClass: 'chip',
    plainChipClass: 'chip--plain'
  }, items[0]), ['chip', 'chip--positive', { 'chip--plain': false }]);
  assert.deepEqual(ArtifactStatSummary.methods.roleStyle.call({
    roleColorStyleVar: '--role-color'
  }, items[0]), { '--role-color': '#f33' });
});

test('[vue] ShopItemRow exposes neutral shop row rendering contract', () => {
  assert.equal(ShopItemRow.name, 'ShopItemRow');
  assert.match(ShopItemRow.template, /data-artifact-draggable/);
  assert.match(ShopItemRow.template, /slot name="visual"/);
  const row = {
    id: 'needle:0',
    artifactId: 'needle',
    name: 'Needle',
    description: 'Sharp.',
    price: 2,
    canAfford: true,
    previewOrientation: { width: 1, height: 2 },
    characterItem: true,
    isBag: false,
    statRows: [{ key: 'damage', label: 'Damage', text: '+2', positive: true }]
  };
  assert.equal(ShopItemRow.computed.visible.call({ row }), true);
  assert.deepEqual(ShopItemRow.computed.itemClasses.call({
    itemClass: 'shop-item',
    rowClass: { 'shop-item--role-damage': true }
  }), ['shop-item', { 'shop-item--role-damage': true }]);
  assert.deepEqual(ShopItemRow.computed.renderedStats.call({ row }), row.statRows);
  assert.equal(ShopItemRow.computed.previewWidth.call({ row }), 1);
  assert.equal(ShopItemRow.computed.previewHeight.call({ row }), 2);
  assert.equal(ShopItemRow.methods.statText({ text: '+2', value: 2 }), '+2');
  assert.deepEqual(ShopItemRow.methods.statClass.call({
    tagClass: 'chip',
    positiveTagClass: 'pos',
    negativeTagClass: 'neg'
  }, row.statRows[0]), ['chip', 'pos']);
  const emitted = [];
  ShopItemRow.methods.emitBuy.call({
    row,
    $emit: (event, payload) => emitted.push([event, payload])
  });
  assert.deepEqual(emitted.map(([event]) => event), ['buy', 'select']);
});

test('[vue] ShopItemList exposes neutral shop list rendering contract', () => {
  assert.equal(ShopItemList.name, 'ShopItemList');
  assert.equal(ShopItemList.components.ShopItemRow, ShopItemRow);
  assert.match(ShopItemList.template, /ShopItemRow/);
  const rows = [{ id: 'needle:0', artifactId: 'needle' }];
  assert.deepEqual(ShopItemList.computed.renderedRows.call({ rows }), rows);
  assert.deepEqual(ShopItemList.methods.classFor.call({
    rowClass: (row) => ({ [`row-${row.artifactId}`]: true })
  }, rows[0]), { 'row-needle': true });
  assert.deepEqual(ShopItemList.methods.attrsFor.call({
    itemAttrs: (row) => ({ title: row.artifactId })
  }, rows[0]), { title: 'needle' });
  const emitted = [];
  ShopItemList.methods.emitBuy.call({
    $emit: (event, payload) => emitted.push([event, payload])
  }, rows[0]);
  assert.deepEqual(emitted.map(([event]) => event), ['buy', 'select']);
});

test('[vue] BackpackGrid exposes neutral board rendering contract', () => {
  assert.equal(BackpackGrid.name, 'BackpackGrid');
  assert.match(BackpackGrid.template, /slot name="piece-content"/);
  assert.match(BackpackGrid.template, /cell-drop-touch/);
  const cells = [{ key: '0:0', interactive: true, dropTarget: true }];
  const pieces = [{ key: 'piece:needle', artifactId: 'needle', canRotate: true }];
  const overlays = [{ key: 'bag:1' }];
  assert.deepEqual(BackpackGrid.computed.renderedCells.call({ cells }), cells);
  assert.deepEqual(BackpackGrid.computed.renderedPieces.call({ pieces }), pieces);
  assert.deepEqual(BackpackGrid.computed.renderedOverlays.call({ overlays }), overlays);
  assert.equal(BackpackGrid.methods.cellComponent.call({
    interactiveCells: false,
    interactiveCellTag: 'button',
    cellTag: 'span'
  }, cells[0]), 'button');
  assert.equal(BackpackGrid.methods.pieceActionComponent.call({
    clickablePieces: true,
    clickablePieceTag: 'button',
    pieceActionTag: 'div'
  }), 'button');
  const emitted = [];
  const context = {
    interactiveCells: true,
    clickablePieces: true,
    droppable: true,
    $emit: (event, payload) => emitted.push([event, payload])
  };
  BackpackGrid.methods.emitCellClick.call(context, cells[0]);
  BackpackGrid.methods.emitCellDragOver.call(context, cells[0], { type: 'dragover' });
  BackpackGrid.methods.emitCellDrop.call(context, cells[0], { type: 'drop' });
  BackpackGrid.methods.emitPieceClick.call(context, pieces[0], { stopPropagation() {} });
  BackpackGrid.methods.emitPieceRotate.call(context, pieces[0], { stopPropagation() {} });
  assert.deepEqual(emitted.map(([event]) => event), [
    'cell-click',
    'cell-dragover',
    'cell-drop',
    'piece-click',
    'piece-rotate'
  ]);
});

test('[vue] BattleLog exposes neutral replay row rendering contract', () => {
  assert.equal(BattleLog.name, 'BattleLog');
  assert.match(BattleLog.template, /slot name="row"/);
  assert.match(BattleLog.template, /aria-current/);
  const rows = [
    { replayIndex: 2, text: 'Hit', active: true },
    { replayIndex: 3, display: { logText: 'Win' } },
    { replayIndex: 4, narration: 'Hidden', visible: false }
  ];
  assert.deepEqual(BattleLog.computed.renderedRows.call({ rows }), rows.slice(0, 2));
  assert.equal(BattleLog.methods.rowComponent.call({
    selectable: true,
    selectableRowTag: 'button',
    rowTag: 'span'
  }, rows[0]), 'button');
  assert.deepEqual(BattleLog.methods.rowClasses.call({
    rowClass: 'log-entry',
    activeClass: 'active'
  }, rows[0]), ['log-entry', 'active']);
  assert.equal(BattleLog.methods.rowText.call({ textField: 'text' }, rows[1]), 'Win');
  assert.equal(BattleLog.methods.rowType.call({
    rowComponent: BattleLog.methods.rowComponent,
    selectable: true,
    selectableRowTag: 'button',
    rowTag: 'span'
  }, rows[0]), 'button');
  assert.equal(BattleLog.methods.rowKey.call({}, rows[0], 0), 2);
  const emitted = [];
  BattleLog.methods.emitSelect.call({
    selectable: true,
    $emit: (event, payload) => emitted.push([event, payload])
  }, rows[0], { type: 'click' });
  assert.equal(emitted[0][0], 'select');
  assert.equal(emitted[0][1].row, rows[0]);
});

test('[vue] GachaPackCard exposes neutral pack action contract', () => {
  assert.equal(GachaPackCard.name, 'GachaPackCard');
  assert.match(GachaPackCard.template, /data-pack-id/);
  assert.match(GachaPackCard.template, /name="action"/);
  const pack = {
    id: 'season_pack',
    title: 'Season Pack',
    lines: [{ key: 'detail', text: '2 left' }],
    actions: [{ key: 'roll', kind: 'roll', label: 'Roll', payload: { packId: 'season_pack' } }]
  };
  assert.equal(GachaPackCard.computed.visible.call({ pack }), true);
  assert.deepEqual(GachaPackCard.computed.renderedLines.call({ pack }), pack.lines);
  assert.deepEqual(GachaPackCard.computed.renderedActions.call({ pack }), pack.actions);
  assert.equal(GachaPackCard.methods.actionType.call({ actionTag: 'button', actionButtonType: 'button' }), 'button');
  assert.equal(GachaPackCard.methods.actionType.call({ actionTag: 'a', actionButtonType: 'button' }), null);
  const emitted = [];
  GachaPackCard.methods.emitAction.call({
    $emit: (event, payload) => emitted.push([event, payload])
  }, pack.actions[0]);
  assert.deepEqual(emitted.map(([event]) => event), ['action', 'roll']);
});

test('[vue] GachaPackCardList exposes neutral list rendering contract', () => {
  assert.equal(GachaPackCardList.name, 'GachaPackCardList');
  assert.equal(GachaPackCardList.components.GachaPackCard, GachaPackCard);
  assert.match(GachaPackCardList.template, /GachaPackCard/);
  const packs = [{ id: 'pack_a' }, { id: 'pack_b' }];
  assert.deepEqual(GachaPackCardList.computed.renderedPacks.call({ packs }), packs);
  const emitted = [];
  GachaPackCardList.methods.emitAction.call({
    $emit: (event, payload) => emitted.push([event, payload])
  }, { key: 'burn', kind: 'burn', payload: { packId: 'pack_a' } });
  assert.deepEqual(emitted.map(([event]) => event), ['action', 'burn']);
});
