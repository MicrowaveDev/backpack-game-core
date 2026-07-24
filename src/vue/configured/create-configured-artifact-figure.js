import { h } from 'vue';
import { shapeArtifactTileDisplay } from '../../client/view-model.js';
import { ArtifactTile } from '../components.js';

function defaultImageForArtifact(artifact) {
  return artifact?.image || artifact?.imagePath || '';
}

export function createConfiguredArtifactFigure({
  name = 'ConfiguredArtifactFigure',
  projectTile = shapeArtifactTileDisplay,
  imageForArtifact = defaultImageForArtifact,
  shapeForArtifact = null,
  visualForArtifact = null,
  roleForArtifact = null,
  shineForArtifact = null,
  roleGlyphLabel = null,
  roleGlyphExtraClass = 'artifact-figure-role-glyph',
  artifactTileComponent = ArtifactTile
} = {}) {
  return {
    name,
    props: {
      artifact: { type: Object, default: null },
      displayWidth: { type: Number, default: 0 },
      displayHeight: { type: Number, default: 0 }
    },
    render() {
      if (!this.artifact) return null;
      return h(artifactTileComponent, {
        tile: projectTile(this.artifact, {
          displayWidth: this.displayWidth,
          displayHeight: this.displayHeight,
          imageForArtifact,
          shapeForArtifact,
          visualForArtifact,
          roleForArtifact,
          shineForArtifact,
          roleGlyphLabel
        }),
        roleGlyphExtraClass
      });
    }
  };
}
