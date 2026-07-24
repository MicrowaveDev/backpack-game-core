import test from 'node:test';
import assert from 'node:assert/strict';
import { createConfiguredArtifactFigure } from '../src/vue/configured/create-configured-artifact-figure.js';

test('[vue/configured] artifact figure delegates product projection without product markup', () => {
  const projected = [];
  const ArtifactTileStub = { name: 'ArtifactTileStub' };
  const Figure = createConfiguredArtifactFigure({
    name: 'TestArtifactFigure',
    artifactTileComponent: ArtifactTileStub,
    imageForArtifact: (artifact) => `/art/${artifact.id}.png`,
    visualForArtifact: (artifact) => ({ role: { id: artifact.family, label: 'Role' } }),
    projectTile: (artifact, options) => {
      projected.push({ artifact, options });
      return { id: artifact.id, imageSrc: options.imageForArtifact(artifact) };
    }
  });
  const artifact = { id: 'blade', family: 'damage' };
  const vnode = Figure.render.call({
    artifact,
    displayWidth: 2,
    displayHeight: 1
  });

  assert.equal(Figure.name, 'TestArtifactFigure');
  assert.equal(vnode.type, ArtifactTileStub);
  assert.deepEqual(vnode.props.tile, { id: 'blade', imageSrc: '/art/blade.png' });
  assert.equal(vnode.props.roleGlyphExtraClass, 'artifact-figure-role-glyph');
  assert.equal(projected.length, 1);
  assert.equal(projected[0].artifact, artifact);
  assert.equal(projected[0].options.displayWidth, 2);
  assert.equal(projected[0].options.displayHeight, 1);
  assert.equal(typeof projected[0].options.visualForArtifact, 'function');
});

test('[vue/configured] artifact figure renders nothing for a missing artifact', () => {
  const Figure = createConfiguredArtifactFigure();
  assert.equal(Figure.render.call({ artifact: null }), null);
});
