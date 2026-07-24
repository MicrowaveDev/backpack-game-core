import test from 'node:test';
import assert from 'node:assert/strict';
import { createConfiguredReplayDuel } from '../src/vue/configured/create-configured-replay-duel.js';

const ArtifactFigure = { name: 'ConfiguredTestArtifactFigure' };

test('[vue/configured] replay duel preserves shared composition without product markup', () => {
  const Duel = createConfiguredReplayDuel({
    artifactFigureComponent: ArtifactFigure
  });

  assert.equal(Duel.components.ConfiguredArtifactFigure, ArtifactFigure);
  assert.match(Duel.template, /<ReplayDuel/);
  assert.match(Duel.template, /<FighterCard/);
  assert.match(Duel.template, /<ArtifactGridBoard/);
  assert.doesNotMatch(Duel.template, /meat|mushroom|spore|mycel/i);
});

test('[vue/configured] replay duel projects loadouts with injected classification', () => {
  const calls = [];
  const artifacts = new Map([
    ['container', { id: 'container', kind: 'container' }],
    ['weapon', { id: 'weapon', kind: 'weapon' }]
  ]);
  const getArtifact = (id) => artifacts.get(id);
  const Duel = createConfiguredReplayDuel({
    artifactFigureComponent: ArtifactFigure,
    artifactFamily: (artifact) => artifact?.kind,
    containerFamily: 'container',
    projectGrid: (items, containerIds, resolver) => {
      calls.push({ items, containerIds, resolver });
      return { items, bagRows: [], totalRows: 4 };
    }
  });
  const items = [{ artifactId: 'container' }, { artifactId: 'weapon' }];
  const result = Duel.methods.gridPropsFor.call(
    { getArtifact },
    { loadout: { items } }
  );

  assert.deepEqual(result, { items, bagRows: [], totalRows: 4 });
  assert.deepEqual([...calls[0].containerIds], ['container']);
  assert.equal(calls[0].resolver, getArtifact);
});

test('[vue/configured] replay duel requires an artifact presentation component', () => {
  assert.throws(
    () => createConfiguredReplayDuel(),
    /artifactFigureComponent is required/
  );
});
