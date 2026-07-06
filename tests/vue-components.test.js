import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AchievementBadge,
  ArtifactCatalogBrowser,
  ArtifactStatSummary,
  ArtifactTile,
  AssetRollResultPanel,
  BackpackGrid,
  BackpackZone,
  BattleLog,
  CatalogPageScreen,
  FighterCard,
  FusionReveal,
  InventoryZone,
  GachaOddsTable,
  GachaPackCard,
  GachaPackCardList,
  PrepActions,
  RecipeCard,
  RecipeList,
  ReplayDuel,
  ReplayScreen,
  RunHud,
  SellZone,
  SeasonRankEmblem,
  ShopZone,
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

test('[vue] CatalogPageScreen exposes neutral catalog page shell contract', () => {
  assert.equal(CatalogPageScreen.name, 'CatalogPageScreen');
  assert.match(CatalogPageScreen.template, /slot name="title"/);
  assert.match(CatalogPageScreen.template, /<slot><\/slot>/);
  const context = {
    labels: {
      eyebrow: 'Recipes',
      title: 'Catalog',
      intro: 'Browse entries'
    }
  };
  assert.equal(CatalogPageScreen.computed.eyebrowText.call(context), 'Recipes');
  assert.equal(CatalogPageScreen.computed.titleText.call(context), 'Catalog');
  assert.equal(CatalogPageScreen.computed.introText.call(context), 'Browse entries');
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

test('[vue] FusionReveal exposes neutral artifact-slot animation shell', () => {
  assert.equal(FusionReveal.name, 'FusionReveal');
  assert.match(FusionReveal.template, /slot\s+name="artifact"/);
  assert.match(FusionReveal.template, /resolvedIngredientArtifacts/);

  const ingredientArtifacts = [
    { id: 'a', width: 2, height: 1 },
    null,
    { id: 'b', width: 1, height: 3 }
  ];
  assert.deepEqual(
    FusionReveal.computed.resolvedIngredientArtifacts.call({ ingredientArtifacts }),
    [ingredientArtifacts[0], ingredientArtifacts[2]]
  );
  assert.deepEqual(FusionReveal.methods.figureSize({ width: 2, height: 3 }), {
    width: 2,
    height: 3
  });
  assert.equal(
    FusionReveal.methods.figureFrameStyle({ width: 2, height: 1 }).width,
    'calc(2 * var(--fusion-reveal-cell-size, 64px) + 1 * var(--fusion-reveal-gap, 8px))'
  );

  const style = FusionReveal.methods.ingredientStyle.call({
    resolvedIngredientArtifacts: [ingredientArtifacts[0], ingredientArtifacts[2]],
    radius: 100,
    figureSize: FusionReveal.methods.figureSize,
    figureFrameStyle: FusionReveal.methods.figureFrameStyle
  }, ingredientArtifacts[0], 0);
  assert.equal(style['--fusion-start-x'], '-100px');
  assert.equal(style['--fusion-spin'], '-9deg');

  const emitted = [];
  const context = {
    finished: false,
    clearTimer() {},
    $emit: (event) => emitted.push(event)
  };
  FusionReveal.methods.finish.call(context);
  FusionReveal.methods.finish.call(context);
  assert.deepEqual(emitted, ['done']);
  assert.equal(
    FusionReveal.methods.fallbackLabel({ name: { en: 'Result' } }),
    'Result'
  );
});

test('[vue] BackpackZone exposes neutral item list and drop-zone shell', () => {
  assert.equal(BackpackZone.name, 'BackpackZone');
  assert.match(BackpackZone.template, /slot\s+name="visual"/);
  assert.match(BackpackZone.template, /selectItem/);

  const items = [
    { id: 'bag', rowId: 'row_bag', family: 'bag', width: 2, height: 2, slotCount: 4, name: { en: 'Bag' } },
    null,
    { id: 'blade', rowId: 'row_blade', width: 1, height: 2, name: { en: 'Blade' } }
  ];
  assert.deepEqual(BackpackZone.computed.renderedItems.call({ items }), [items[0], items[2]]);
  assert.equal(BackpackZone.computed.titleLabel.call({ labels: { title: 'Inventory' } }), 'Inventory');
  assert.equal(BackpackZone.methods.itemId(items[0]), 'bag');
  assert.equal(BackpackZone.methods.itemRowId(items[0]), 'row_bag');
  assert.equal(BackpackZone.methods.itemName.call({ nameForItem: null, lang: 'en', itemId: BackpackZone.methods.itemId }, items[0]), 'Bag');
  assert.deepEqual(BackpackZone.methods.previewOrientation.call({
    previewOrientationForItem: null
  }, items[2]), { width: 1, height: 2 });
  assert.deepEqual(BackpackZone.methods.previewItem.call({
    previewOrientation: BackpackZone.methods.previewOrientation,
    itemId: BackpackZone.methods.itemId
  }, items[2]), [{
    artifactId: 'blade',
    rowId: 'row_blade',
    x: 0,
    y: 0,
    width: 1,
    height: 2
  }]);
  assert.equal(BackpackZone.methods.isPending.call({
    pendingItemIds: new Set(['row_bag']),
    itemRowId: BackpackZone.methods.itemRowId
  }, items[0]), true);
  assert.equal(BackpackZone.methods.itemTitle.call({
    labels: { pendingTitle: 'Pending' },
    isPending: () => true,
    isHighlighted: () => false
  }, items[0]), 'Pending');

  const emitted = [];
  BackpackZone.methods.selectItem.call({
    itemId: BackpackZone.methods.itemId,
    $emit: (event, payload) => emitted.push([event, payload])
  }, items[0]);
  assert.equal(emitted[0][0], 'select-item');
  assert.equal(emitted[0][1].artifactId, 'bag');
  assert.equal(emitted[0][1].id, 'row_bag');
});

test('[vue] InventoryZone exposes neutral inventory shell and container chips', () => {
  assert.equal(InventoryZone.name, 'InventoryZone');
  assert.match(InventoryZone.template, /slot\s+name="grid"/);
  assert.match(InventoryZone.template, /slot\s+name="footer"/);

  const items = [
    { artifactId: 'blade', rowId: 'row_blade' },
    null,
    { artifactId: 'shield', rowId: 'row_shield' }
  ];
  const containers = [
    { id: 'starter', artifactId: 'starter', hidden: true },
    { id: 'bag_1', artifactId: 'bag', name: 'Bag', color: '#abc', draggable: true, rotatable: true },
    { id: 'bag_2', artifactId: 'pack', label: 'Pack', draggable: false, locked: true }
  ];

  assert.deepEqual(InventoryZone.computed.renderedItems.call({ items }), [items[0], items[2]]);
  assert.deepEqual(
    InventoryZone.computed.visibleContainers.call({ activeContainers: containers }),
    [containers[1], containers[2]]
  );
  assert.equal(InventoryZone.computed.showFooter.call({ renderedItems: [items[0]] }), true);
  assert.equal(InventoryZone.computed.rotateActionLabel.call({ labels: {} }), 'Rotate');
  assert.equal(InventoryZone.methods.containerName(containers[1]), 'Bag');
  assert.deepEqual(InventoryZone.methods.containerStyle.call({
    containerColor: InventoryZone.methods.containerColor
  }, containers[1]), { borderColor: '#abc' });
  assert.deepEqual(InventoryZone.methods.containerClasses.call({
    containerLockedClass: 'locked',
    containerDraggableClass: 'drag'
  }, containers[2]), { locked: true, drag: false });
  assert.deepEqual(InventoryZone.methods.containerDataset(containers[2]), {
    'data-bag-row-id': 'bag_2',
    'data-bag-locked': 'true'
  });

  const emitted = [];
  const context = {
    $emit: (event, payload) => emitted.push([event, payload])
  };
  InventoryZone.methods.onRemoveItem.call(context, { rowId: 'row_blade' });
  InventoryZone.methods.onContainerDragStart.call(context, containers[1], { type: 'dragstart' });
  InventoryZone.methods.rotateContainer.call(context, containers[1]);
  InventoryZone.methods.deactivateContainer.call(context, containers[1]);
  assert.deepEqual(emitted.map(([event]) => event), [
    'remove-item',
    'container-chip-drag-start',
    'rotate-container',
    'deactivate-container'
  ]);
  assert.equal(emitted[1][1].id, 'bag_1');
  assert.equal(emitted[2][1].artifactId, 'bag');
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

test('[vue] ShopZone exposes neutral shop panel and sell-zone shell', () => {
  assert.equal(ShopZone.name, 'ShopZone');
  assert.match(ShopZone.template, /slot name="visual"/);
  assert.match(ShopZone.template, /:class="visualClass"/);
  assert.match(ShopZone.template, /sell-zone/);

  const row = {
    artifactId: 'blade',
    name: 'Blade',
    price: 2,
    canAfford: true,
    previewOrientation: { width: 1, height: 2 },
    statRows: [{ key: 'damage', label: 'Damage', value: '+2', positive: true }]
  };
  const context = {
    rows: [row],
    labels: {
      title: 'Market',
      refresh: 'Reroll',
      refreshPricePrefix: '*',
      pricePrefix: '* ',
      characterItem: 'Hero item',
      bagSlots: 'slots'
    },
    refreshCost: 3,
    sellZone: {
      active: true,
      draggingItemId: 'row_1',
      priceLabel: '2',
      pricePrefix: '*',
      inactivePrefix: '$',
      inactiveText: 'Sell here'
    }
  };

  assert.deepEqual(ShopZone.computed.renderedRows.call(context), [row]);
  assert.equal(ShopZone.computed.titleLabel.call(context), 'Market');
  assert.equal(ShopZone.computed.refreshText.call({
    ...context,
    refreshLabel: 'Reroll',
    refreshPricePrefix: '*'
  }), 'Reroll (*3)');
  assert.equal(ShopZone.computed.pricePrefix.call(context), '* ');
  assert.deepEqual(ShopZone.computed.sellZoneProps.call(context), {
    active: true,
    draggingItemId: 'row_1',
    priceLabel: '2',
    pricePrefix: '*',
    inactivePrefix: '$',
    inactiveText: 'Sell here',
    rootClass: 'sell-zone',
    activeClass: 'sell-zone--active'
  });
  assert.deepEqual(ShopZone.methods.classFor.call({
    itemClass: 'shop-item',
    rowClass: (shopRow) => ({ expensive: !shopRow.canAfford })
  }, row), ['shop-item', { expensive: false }]);
  assert.deepEqual(ShopZone.methods.attrsFor.call({
    itemAttrs: { role: 'button' }
  }, row), { role: 'button' });
  assert.equal(ShopZone.methods.previewHeight(row), 2);
  assert.deepEqual(ShopZone.methods.renderedStats(row), row.statRows);
  assert.deepEqual(ShopZone.methods.statClass.call({
    statChipClass: 'chip',
    positiveTagClass: 'pos',
    negativeTagClass: 'neg'
  }, row.statRows[0]), ['chip', 'pos']);

  const emitted = [];
  const emitContext = {
    $emit: (event, payload) => emitted.push([event, payload])
  };
  ShopZone.methods.emitBuy.call(emitContext, row);
  ShopZone.methods.emitRefresh.call(emitContext);
  ShopZone.methods.emitSellDrop.call(emitContext, { type: 'drop' });
  assert.deepEqual(emitted, [
    ['buy', row],
    ['refresh', undefined],
    ['sell-drop', { type: 'drop' }]
  ]);
});

test('[vue] RecipeCard exposes neutral recipe flow rendering contract', () => {
  assert.equal(RecipeCard.name, 'RecipeCard');
  assert.match(RecipeCard.template, /name="artifact"/);
  assert.match(RecipeCard.template, /data-result-artifact-id/);

  const recipe = {
    id: 'fusion_1',
    resultArtifactId: 'result',
    resultName: 'Result',
    resultDescription: 'Forged together.',
    ingredients: [{ id: 'a' }, { id: 'b' }],
    result: { id: 'result' }
  };
  const context = {
    recipe,
    index: 2,
    active: true,
    cardClass: 'recipe-card',
    activeClass: 'active',
    labels: { kicker: 'Fusion' },
    kickerText: '',
    interactive: true,
    tabindex: 0
  };

  assert.equal(RecipeCard.computed.visible.call(context), true);
  assert.deepEqual(RecipeCard.computed.ingredients.call(context), recipe.ingredients);
  assert.equal(RecipeCard.computed.resultArtifactId.call(context), 'result');
  assert.equal(RecipeCard.computed.titleText.call(context), 'Result');
  assert.equal(RecipeCard.computed.descriptionText.call(context), 'Forged together.');
  assert.equal(RecipeCard.computed.kickerLabel.call(context), 'Fusion');
  assert.deepEqual(RecipeCard.computed.cardClasses.call(context), ['recipe-card', 'active']);
  assert.equal(RecipeCard.computed.componentRole.call(context), 'button');
  assert.equal(RecipeCard.methods.artifactKey(recipe.ingredients[0], 0, 'ingredient'), 'a');

  const emitted = [];
  RecipeCard.methods.emitSelect.call({
    ...context,
    $emit: (event, payload) => emitted.push([event, payload])
  }, { type: 'click' });
  assert.deepEqual(emitted, [['select', { recipe, index: 2, event: { type: 'click' } }]]);
});

test('[vue] RecipeList exposes neutral repeated recipe shell', () => {
  assert.equal(RecipeList.name, 'RecipeList');
  assert.equal(RecipeList.components.RecipeCard, RecipeCard);
  assert.match(RecipeList.template, /recipe-card/);

  const recipes = [
    { id: 'one', resultArtifactId: 'result_1' },
    { id: 'hidden', visible: false },
    { id: 'two', resultArtifactId: 'result_2', interactive: true }
  ];
  assert.deepEqual(RecipeList.computed.renderedRecipes.call({ recipes }), [recipes[0], recipes[2]]);
  assert.equal(RecipeList.methods.recipeKey(recipes[0], 0), 'one');
  assert.deepEqual(RecipeList.methods.classFor.call({
    cardClass: (recipe, index) => ({ [`recipe-${index}`]: !!recipe })
  }, recipes[0], 0), { 'recipe-0': true });
  assert.equal(RecipeList.methods.isActive.call({ activeIndex: 1 }, recipes[0], 1), true);
  assert.equal(RecipeList.methods.isInteractive.call({ interactive: false }, recipes[2]), true);

  const emitted = [];
  RecipeList.methods.emitSelect.call({
    $emit: (event, payload) => emitted.push([event, payload])
  }, { recipe: recipes[0], index: 0 });
  assert.deepEqual(emitted, [['select', { recipe: recipes[0], index: 0 }]]);
});

test('[vue] ArtifactCatalogBrowser exposes neutral catalog shell contract', () => {
  assert.equal(ArtifactCatalogBrowser.name, 'ArtifactCatalogBrowser');
  assert.match(ArtifactCatalogBrowser.template, /name="group-board"/);
  assert.match(ArtifactCatalogBrowser.template, /name="detail-visual"/);
  assert.ok(ArtifactCatalogBrowser.emits.includes('grid-panel-resize'));

  const group = { id: 'damage', label: 'Damage', artifacts: [{ id: 'a' }] };
  const selectedItem = {
    id: 'result',
    title: 'Result',
    description: 'Description',
    kicker: 'Fusion',
    facts: [
      { key: 'footprint', label: 'Footprint', value: '1x1' },
      { key: 'hidden', label: 'Hidden', value: '-', visible: false }
    ]
  };
  const recipe = {
    resultArtifactId: 'result',
    ingredients: [{ id: 'a' }],
    result: { id: 'result' }
  };
  const context = {
    groups: [group],
    selectedItem,
    selectedRecipe: recipe,
    labels: {
      all: 'All',
      gridTitle: 'Catalog',
      closeDetails: 'Close',
      ingredients: 'Ingredients'
    },
    rootClass: 'catalog',
    hasSelectionClass: 'has-selection'
  };

  assert.deepEqual(ArtifactCatalogBrowser.computed.rootClasses.call(context), ['catalog', 'has-selection']);
  assert.deepEqual(ArtifactCatalogBrowser.computed.renderedGroups.call(context), [group]);
  assert.deepEqual(ArtifactCatalogBrowser.computed.renderedFacts.call(context), [selectedItem.facts[0]]);
  assert.deepEqual(ArtifactCatalogBrowser.computed.recipeIngredients.call(context), recipe.ingredients);
  assert.equal(ArtifactCatalogBrowser.computed.recipeResultId.call({
    ...context,
    recipeResult: recipe.result
  }), 'result');
  assert.equal(ArtifactCatalogBrowser.methods.artifactKey({ id: 'needle' }, 0, 'ingredient'), 'needle');

  const emitted = [];
  const emitContext = {
    $refs: { gridPanel: { clientWidth: 320 } },
    $emit: (event, payload) => emitted.push([event, payload])
  };
  ArtifactCatalogBrowser.methods.emitSelectItem.call(emitContext, 'needle', { type: 'click' });
  ArtifactCatalogBrowser.methods.emitCloseDetails.call(emitContext, { type: 'click' });
  ArtifactCatalogBrowser.methods.updateGridPanelMetrics.call(emitContext);
  assert.deepEqual(emitted[0], ['select-item', { artifactId: 'needle', event: { type: 'click' } }]);
  assert.deepEqual(emitted[1], ['close-details', { event: { type: 'click' } }]);
  assert.equal(emitted[2][0], 'grid-panel-resize');
  assert.equal(emitted[2][1].panelWidth, 320);
});

test('[vue] ReplayDuel exposes neutral replay duel shell contract', () => {
  assert.equal(ReplayDuel.name, 'ReplayDuel');
  assert.match(ReplayDuel.template, /name="fighter"/);
  assert.match(ReplayDuel.template, /name="loadout-grid"/);
  assert.ok(ReplayDuel.emits.includes('set-speed'));

  const speedOptions = [{ speed: 3, count: 1 }];
  const attributionGroups = [{ key: 'damage', role: 'damage', label: 'Damage', total: 4 }];
  const context = {
    speedOptions,
    attributionGroups,
    leftRoleSummary: [{ role: { id: 'damage', label: 'Damage', color: '#f00' }, count: 2 }],
    rightRoleSummary: [],
    labels: {
      speedBoost: 'Boost',
      leftRoles: 'Left roles',
      rightRoles: 'Right roles',
      attribution: 'Attribution'
    }
  };

  assert.deepEqual(ReplayDuel.computed.renderedSpeedOptions.call(context), speedOptions);
  assert.deepEqual(ReplayDuel.computed.renderedAttributionGroups.call(context), attributionGroups);
  assert.deepEqual(ReplayDuel.computed.leftRoles.call(context), context.leftRoleSummary);
  assert.equal(ReplayDuel.computed.speedBoostLabel.call(context), 'Boost');
  assert.equal(ReplayDuel.methods.attributionValueText({ key: 'stunChance', total: 15 }), '+15%');
  assert.equal(ReplayDuel.methods.attributionValueText({ total: 2, prefix: '-', suffix: ' hp' }), '-2 hp');

  const emitted = [];
  ReplayDuel.methods.emitSetSpeed.call({
    $emit: (event, payload) => emitted.push([event, payload])
  }, 4);
  assert.deepEqual(emitted, [['set-speed', 4]]);
});

test('[vue] ReplayScreen exposes neutral replay page shell contract', () => {
  assert.equal(ReplayScreen.name, 'ReplayScreen');
  assert.equal(ReplayScreen.components.BattleLog.name, 'BattleLog');
  assert.match(ReplayScreen.template, /name="battle-stage"/);
  assert.match(ReplayScreen.template, /battle-log/);
  assert.ok(ReplayScreen.emits.includes('toggle-result'));
  assert.ok(ReplayScreen.emits.includes('go-results'));
  assert.ok(ReplayScreen.emits.includes('select-log-row'));

  const context = {
    finished: true,
    resultCollapsed: true,
    resultHero: { tone: 'win', title: 'Victory', summary: 'Done' },
    rewardsPanel: {
      visible: true,
      tone: 'win',
      stats: [{ key: 'coins', label: 'Coins', value: '+2' }],
      opponentStats: ['7 HP'],
      runStatus: [{ key: 'wins', label: 'Wins', value: 3 }]
    },
    battleSummary: {
      rows: [{ side: 'left', name: 'Hero', metrics: [{ key: 'damage', label: 'Damage', value: 8 }] }]
    },
    logRows: [{ key: 'a', text: 'Hit' }]
  };

  assert.deepEqual(ReplayScreen.computed.rootClasses.call(context), {
    'replay-layout--result-ready': true,
    'replay-layout--result-collapsed': true
  });
  assert.equal(ReplayScreen.computed.heroTone.call({
    ...context,
    hero: context.resultHero
  }), 'win');
  assert.equal(ReplayScreen.computed.showRewards.call({
    ...context,
    rewards: context.rewardsPanel
  }), true);
  assert.deepEqual(ReplayScreen.computed.rewardStats.call({
    ...context,
    rewards: context.rewardsPanel
  }), context.rewardsPanel.stats);
  assert.deepEqual(ReplayScreen.computed.summaryRows.call({
    ...context,
    summary: context.battleSummary
  }), context.battleSummary.rows);

  const emitted = [];
  const emitContext = { $emit: (event, payload) => emitted.push([event, payload]) };
  ReplayScreen.methods.emitToggleResult.call(emitContext);
  ReplayScreen.methods.emitGoResults.call(emitContext);
  ReplayScreen.methods.emitSelectLogRow.call(emitContext, { row: { replayIndex: 2 } });
  assert.deepEqual(emitted, [
    ['toggle-result', undefined],
    ['go-results', undefined],
    ['select-log-row', { row: { replayIndex: 2 } }]
  ]);
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
