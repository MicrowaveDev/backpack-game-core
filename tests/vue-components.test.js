import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ArtifactTile,
  AssetRollResultPanel,
  GachaOddsTable,
  GachaPackCard,
  GachaPackCardList
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
  assert.match(ArtifactTile.template, /data-artifact-id/);
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
