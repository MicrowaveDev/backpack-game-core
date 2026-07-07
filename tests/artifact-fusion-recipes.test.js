import test from 'node:test';
import assert from 'node:assert/strict';
import {
  artifactFusionRecipeIngredientIds,
  artifactFusionRecipeResultIds,
  canUseArtifactFusionIngredient,
  createArtifactFusionEvaluator,
  getArtifactFusionRecipe,
  normalizeArtifactFusionRecipe,
  normalizeArtifactFusionRecipes
} from '@microwavedev/backpack-game-core/artifact-fusion-recipes';

const recipes = [
  {
    id: 'blade_knot',
    resultArtifactId: 'super_blade',
    ingredientArtifactIds: ['blade', 'knot']
  },
  {
    id: 'double_super',
    resultArtifactId: 'ultra_blade',
    ingredientArtifactIds: ['super_blade', 'gem'],
    allowFusionIngredients: true
  }
];

const artifacts = new Map([
  ['blade', { id: 'blade', family: 'damage' }],
  ['knot', { id: 'knot', family: 'stun' }],
  ['gem', { id: 'gem', family: 'stun' }],
  ['bag', { id: 'bag', family: 'bag' }],
  ['starter', { id: 'starter', family: 'damage', starterOnly: true }],
  ['super_blade', { id: 'super_blade', family: 'damage', fusionOnly: true }]
]);

function getArtifact(id) {
  return artifacts.get(id) || null;
}

function row(id, artifactId, x = 0, y = 0) {
  return { id, artifactId, x, y, width: 1, height: 1 };
}

test('[artifact-fusion-recipes] normalizes recipe rows and lookup helpers', () => {
  assert.deepEqual(normalizeArtifactFusionRecipe({
    resultArtifactId: 'result',
    ingredientArtifactIds: ['a', null, 'b']
  }), {
    id: 'result',
    resultArtifactId: 'result',
    ingredientArtifactIds: ['a', 'b'],
    allowFusionIngredients: false
  });
  assert.equal(normalizeArtifactFusionRecipes([{ id: 'missing_result' }]).length, 0);
  assert.equal(getArtifactFusionRecipe('blade_knot', recipes).resultArtifactId, 'super_blade');
  assert.deepEqual(artifactFusionRecipeResultIds(recipes), ['super_blade', 'ultra_blade']);
  assert.deepEqual([...artifactFusionRecipeIngredientIds(recipes)].sort(), ['blade', 'gem', 'knot', 'super_blade']);
});

test('[artifact-fusion-recipes] applies configurable ingredient policy', () => {
  assert.equal(canUseArtifactFusionIngredient({
    artifact: getArtifact('bag'),
    recipe: recipes[0]
  }, {
    excludedFamilies: ['bag']
  }), false);
  assert.equal(canUseArtifactFusionIngredient({
    artifact: getArtifact('starter'),
    recipe: recipes[0]
  }), false);
  assert.equal(canUseArtifactFusionIngredient({
    artifact: getArtifact('super_blade'),
    recipe: recipes[0]
  }), false);
  assert.equal(canUseArtifactFusionIngredient({
    artifact: getArtifact('super_blade'),
    recipe: recipes[1]
  }), true);
});

test('[artifact-fusion-recipes] creates a product-configured evaluator over injected recipes', () => {
  const evaluator = createArtifactFusionEvaluator({
    recipes,
    excludedFamilies: ['bag']
  });
  const matches = evaluator.findArtifactFusionMatches([
    row('blade_row', 'blade', 0, 0),
    row('knot_row', 'knot', 1, 0),
    row('bag_row', 'bag', 2, 0)
  ], getArtifact);

  assert.equal(matches.length, 1);
  assert.equal(matches[0].recipeId, 'blade_knot');
  assert.deepEqual([...evaluator.fusionIngredientRowIdSet(matches)].sort(), ['blade_row', 'knot_row']);
});
