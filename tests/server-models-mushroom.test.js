import test from 'node:test';
import assert from 'node:assert/strict';
import { initModels } from '@microwavedev/backpack-game-core/server/models/mushroom';

function createFakeSequelize() {
  const definitions = [];
  const associations = [];

  function model(name) {
    return {
      name,
      hasOne(target, options) {
        associations.push({ type: 'hasOne', source: name, target: target.name, options });
      },
      hasMany(target, options) {
        associations.push({ type: 'hasMany', source: name, target: target.name, options });
      },
      belongsTo(target, options) {
        associations.push({ type: 'belongsTo', source: name, target: target.name, options });
      }
    };
  }

  return {
    definitions,
    associations,
    define(name, attributes, options) {
      definitions.push({ name, attributes, options });
      return model(name);
    }
  };
}

test('[server-models][mushroom] registers moved Sequelize model definitions', () => {
  const sequelize = createFakeSequelize();
  const models = initModels(sequelize);

  assert.equal(sequelize.definitions.length, 44);
  assert.equal(typeof models.Player, 'object');
  assert.equal(typeof models.GameRunLoadoutItem, 'object');
  assert.equal(typeof models.GameRunFusion, 'object');
  assert.equal(typeof models.AssetGachaPack, 'object');
  assert.equal(typeof models.WalletPurchaseIntent, 'object');

  const player = sequelize.definitions.find((definition) => definition.name === 'Player');
  assert.equal(player.options.tableName, 'players');
  assert.equal(player.attributes.friend_code.unique, true);

  const playerMushroom = sequelize.definitions.find((definition) => definition.name === 'PlayerMushroom');
  assert.equal(playerMushroom.options.tableName, 'player_mushrooms');
  assert.equal(playerMushroom.attributes.mushroom_id.primaryKey, true);

  const loadoutItem = sequelize.definitions.find((definition) => definition.name === 'GameRunLoadoutItem');
  assert.equal(loadoutItem.options.tableName, 'game_run_loadout_items');
  assert.equal(loadoutItem.attributes.rotated.defaultValue, 0);

  const fusion = sequelize.definitions.find((definition) => definition.name === 'GameRunFusion');
  assert.equal(fusion.options.tableName, 'game_run_fusions');
  assert.equal(fusion.attributes.result_row_id.allowNull, false);

  assert.ok(sequelize.associations.some((association) => (
    association.type === 'hasMany'
    && association.source === 'GameRun'
    && association.target === 'GameRunFusion'
  )));
  assert.ok(sequelize.associations.some((association) => (
    association.type === 'belongsTo'
    && association.source === 'AssetGachaPackItem'
    && association.target === 'AssetGachaPack'
  )));
});
