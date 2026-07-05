import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ArtifactTile,
  AssetRollResultPanel,
  BackpackGrid,
  GachaOddsTable,
  GachaPackCard,
  GachaPackCardList,
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
