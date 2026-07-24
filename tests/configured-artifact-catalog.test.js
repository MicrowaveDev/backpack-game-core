import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createConfiguredArtifactCatalogBrowser,
  placeConfiguredArtifactGroup
} from '../src/vue/configured/create-configured-artifact-catalog-browser.js';

const ArtifactFigure = { name: 'ConfiguredTestArtifactFigure' };

test('[vue/configured] catalog preserves shared component composition and neutral contracts', () => {
  const Catalog = createConfiguredArtifactCatalogBrowser({
    artifactFigureComponent: ArtifactFigure
  });

  assert.equal(Catalog.components.ConfiguredArtifactFigure, ArtifactFigure);
  assert.match(Catalog.template, /<ArtifactCatalogBrowser/);
  assert.match(Catalog.template, /<ArtifactGridBoard/);
  assert.match(Catalog.template, /<ArtifactStatSummary/);
  assert.match(Catalog.template, /<ConfiguredArtifactFigure/);
  assert.doesNotMatch(Catalog.template, /meat|mushroom|spore|mycel/i);
});

test('[vue/configured] catalog groups artifacts with injected orientation', () => {
  const group = placeConfiguredArtifactGroup(
    'weapons',
    'Weapons',
    [{ id: 'wide' }, { id: 'small' }],
    3,
    (artifact) => artifact.id === 'wide'
      ? { width: 2, height: 1 }
      : { width: 1, height: 1 }
  );

  assert.equal(group.columns, 3);
  assert.equal(group.rows, 1);
  assert.deepEqual(group.items, [
    {
      id: 'wide',
      rowId: 'wide',
      artifactId: 'wide',
      x: 0,
      y: 0,
      width: 2,
      height: 1
    },
    {
      id: 'small',
      rowId: 'small',
      artifactId: 'small',
      x: 2,
      y: 0,
      width: 1,
      height: 1
    }
  ]);
});

test('[vue/configured] catalog resolves product data through factory options', () => {
  const artifacts = [
    { id: 'result', family: 'damage', name: { en: 'Result' } },
    { id: 'part', family: 'armor', name: { en: 'Part' } }
  ];
  const recipe = {
    resultArtifactId: 'result',
    ingredientArtifactIds: ['part']
  };
  const Catalog = createConfiguredArtifactCatalogBrowser({
    artifactFigureComponent: ArtifactFigure,
    artifactsFor: () => artifacts,
    recipesFor: () => [recipe],
    localeFor: () => 'en'
  });
  const context = { controller: {} };
  context.locale = Catalog.computed.locale.call(context);
  context.artifacts = Catalog.computed.artifacts.call(context);
  context.artifactMap = Catalog.computed.artifactMap.call(context);
  const recipes = Catalog.computed.recipes.call(context);

  assert.equal(context.artifacts[0].id, 'part');
  assert.equal(recipes[0].result.id, 'result');
  assert.deepEqual(recipes[0].ingredients.map((artifact) => artifact.id), ['part']);
});
