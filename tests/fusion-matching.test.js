import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findFusionMatches,
  fusionIngredientRowIdSet
} from '../src/index.js';

const artifacts = new Map([
  ['blade', { id: 'blade' }],
  ['knot', { id: 'knot' }],
  ['gem', { id: 'gem' }],
  ['blocked', { id: 'blocked', blocked: true }]
]);

const recipes = [
  {
    id: 'blade_knot',
    resultArtifactId: 'sickle',
    ingredientArtifactIds: ['blade', 'knot']
  }
];

function getArtifact(id) {
  return artifacts.get(id) || null;
}

function row(id, artifactId, x = 0, y = 0, width = 1, height = 1) {
  return { id, artifactId, x, y, width, height };
}

test('[fusion-matching] finds adjacent ingredients by row id', () => {
  const matches = findFusionMatches([
    row('a', 'blade', 0, 0),
    row('b', 'knot', 1, 0)
  ], getArtifact, recipes);

  assert.equal(matches.length, 1);
  assert.equal(matches[0].recipeId, 'blade_knot');
  assert.deepEqual(matches[0].ingredientRowIds, ['a', 'b']);
  assert.deepEqual([...fusionIngredientRowIdSet(matches)], ['a', 'b']);
});

test('[fusion-matching] requires side-connected placed rows', () => {
  assert.equal(findFusionMatches([
    row('a', 'blade', -1, -1),
    row('b', 'knot', 0, 0)
  ], getArtifact, recipes).length, 0);

  assert.equal(findFusionMatches([
    row('a', 'blade', 0, 0),
    row('b', 'knot', 1, 1)
  ], getArtifact, recipes).length, 0);
});

test('[fusion-matching] consumes duplicate rows once in deterministic order', () => {
  const matches = findFusionMatches([
    row('blade_one', 'blade', 0, 0),
    row('knot_one', 'knot', 1, 0),
    row('blade_two', 'blade', 0, 1),
    row('knot_two', 'knot', 1, 1)
  ], getArtifact, recipes);

  assert.equal(matches.length, 2);
  assert.deepEqual(matches.map((match) => match.ingredientRowIds), [
    ['blade_one', 'knot_one'],
    ['blade_two', 'knot_two']
  ]);
});

test('[fusion-matching] supports product ingredient policy hooks', () => {
  const policyRecipes = [{
    id: 'blocked_gem',
    resultArtifactId: 'blocked_result',
    ingredientArtifactIds: ['blocked', 'gem']
  }];
  const matches = findFusionMatches([
    row('blocked_row', 'blocked', 0, 0),
    row('gem_row', 'gem', 1, 0)
  ], getArtifact, policyRecipes, {
    canUseIngredient({ artifact }) {
      return !artifact.blocked;
    }
  });

  assert.equal(matches.length, 0);
});

