import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AssetRollResultPanel,
  GachaOddsTable
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
