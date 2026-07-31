import { prepareGridProps } from '../../client/view-model.js';
import {
  replayFighterEffects,
  replayFighterVisualState
} from '../../client/replay/effects.js';
import {
  ArtifactGridBoard,
  FighterCard,
  ReplayDuel
} from '../components.js';

function defaultArtifactFamily(artifact) {
  return artifact?.family || '';
}

export function createConfiguredReplayDuel({
  name = 'ConfiguredReplayDuel',
  artifactFigureComponent,
  artifactFamily = defaultArtifactFamily,
  containerFamily = 'bag',
  projectGrid = prepareGridProps,
  resolveFighterImage = null
} = {}) {
  if (!artifactFigureComponent) {
    throw new TypeError('artifactFigureComponent is required');
  }

  return {
    name,
    components: {
      ArtifactGridBoard,
      ConfiguredArtifactFigure: artifactFigureComponent,
      FighterCard,
      ReplayDuel
    },
    props: {
      leftFighter: { type: Object, default: () => ({}) },
      rightFighter: { type: Object, default: () => ({}) },
      renderArtifactFigure: { type: Function, default: null },
      getArtifact: { type: Function, required: true },
      actingSide: { type: String, default: '' },
      activeEvent: { type: Object, default: null },
      activeReplayState: { type: Object, default: null },
      replayIndex: { type: Number, default: 0 },
      lang: { type: String, default: 'en' },
      statusText: { type: String, default: '' },
      replaySpeed: { type: Number, default: 1 },
      speedBoost: { type: Number, default: 1 }
    },
    emits: ['set-speed'],
    computed: {
      artifactFigureComponent() {
        return artifactFigureComponent;
      },
      leftGridProps() {
        return this.gridPropsFor(this.leftFighter);
      },
      rightGridProps() {
        return this.gridPropsFor(this.rightFighter);
      }
    },
    methods: {
      gridPropsFor(fighter) {
        const items = fighter?.loadout?.items || fighter?.loadout || [];
        if (!items.length) return null;
        const containerIds = new Set(
          items
            .filter((item) => artifactFamily(this.getArtifact(item.artifactId)) === containerFamily)
            .map((item) => item.artifactId)
        );
        return projectGrid(items, containerIds, this.getArtifact);
      },
      effectsFor(side) {
        return replayFighterEffects({
          event: this.activeEvent,
          side,
          replayState: this.activeReplayState || {},
          replayIndex: this.replayIndex,
          lang: this.lang
        });
      },
      fighterImageFor(fighter, side) {
        const fallback = fighter?.imagePath || fighter?.character?.imagePath || fighter?.character?.image || '';
        if (typeof resolveFighterImage !== 'function') return fallback;
        const visualState = replayFighterVisualState({
          event: this.activeEvent,
          side,
          replayState: this.activeReplayState || {}
        });
        return resolveFighterImage({
          fighter,
          side,
          visualState,
          event: this.activeEvent,
          replayState: this.activeReplayState || {},
          replayIndex: this.replayIndex
        }) || fallback;
      }
    },
    template: `
      <ReplayDuel
        :left-fighter="leftFighter"
        :right-fighter="rightFighter"
        :acting-side="actingSide"
        :status-text="statusText"
        :replay-speed="replaySpeed"
        :speed-boost="speedBoost"
        :left-visual-effects="effectsFor('left')"
        :right-visual-effects="effectsFor('right')"
        :left-grid-props="leftGridProps"
        :right-grid-props="rightGridProps"
        @set-speed="$emit('set-speed', $event)"
      >
        <template #fighter="{ fighter, side, acting, visualEffects }">
          <FighterCard
            :combatant="fighter.character"
            :image-path="fighterImageFor(fighter, side)"
            :name-text="fighter.nameText"
            :health-text="fighter.healthText"
            :speech-text="fighter.speechText"
            :speech-parts="fighter.speechParts"
            :acting="acting"
            :side="side"
            :visual-effects="visualEffects"
            :hide-loadout="true"
          />
        </template>
        <template #loadout-grid="{ gridProps }">
          <ArtifactGridBoard
            v-if="gridProps"
            variant="inventory"
            class="fighter-inline-inventory"
            :items="gridProps.items"
            :bag-rows="gridProps.bagRows"
            :total-rows="gridProps.totalRows"
            :artifact-figure-component="artifactFigureComponent"
            :get-artifact="getArtifact"
          />
        </template>
      </ReplayDuel>
    `
  };
}
