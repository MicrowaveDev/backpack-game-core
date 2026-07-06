function nonEmptyArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function artifactNameText(artifact) {
  const name = artifact?.displayName || artifact?.label || artifact?.name;
  if (!name) return artifact?.id || '';
  if (typeof name === 'string') return name;
  return name.en || name.default || Object.values(name).find(Boolean) || artifact?.id || '';
}

export const FusionReveal = {
  name: 'FusionReveal',
  props: {
    ingredientArtifacts: {
      type: Array,
      default: () => []
    },
    resultArtifact: {
      type: Object,
      default: null
    },
    label: {
      type: String,
      default: 'Fusion result'
    },
    durationMs: {
      type: Number,
      default: 2100
    },
    timerApi: {
      type: Object,
      default: null
    },
    radius: {
      type: Number,
      default: 122
    },
    rootClass: {
      type: String,
      default: 'fusion-reveal'
    },
    stageClass: {
      type: String,
      default: 'fusion-reveal-stage'
    },
    ingredientClass: {
      type: String,
      default: 'fusion-reveal-ingredient'
    },
    fieldClass: {
      type: String,
      default: 'fusion-reveal-field'
    },
    burstClass: {
      type: String,
      default: 'fusion-reveal-burst'
    },
    resultClass: {
      type: String,
      default: 'fusion-reveal-result'
    }
  },
  emits: ['done'],
  data() {
    return { timer: null, finished: false };
  },
  computed: {
    resolvedIngredientArtifacts() {
      return nonEmptyArray(this.ingredientArtifacts);
    }
  },
  mounted() {
    this.startTimer();
  },
  beforeUnmount() {
    this.clearTimer();
  },
  methods: {
    runtimeTimerApi() {
      return this.timerApi || globalThis.window || globalThis;
    },
    startTimer() {
      const timerApi = this.runtimeTimerApi();
      if (!timerApi?.setTimeout) return;
      const durationMs = Math.max(0, Number(this.durationMs) || 0);
      this.timer = timerApi.setTimeout(() => this.finish(), durationMs);
    },
    clearTimer() {
      if (!this.timer) return;
      const timerApi = this.runtimeTimerApi();
      if (timerApi?.clearTimeout) timerApi.clearTimeout(this.timer);
      this.timer = null;
    },
    finish() {
      if (this.finished) return;
      this.finished = true;
      this.clearTimer();
      this.$emit('done');
    },
    figureSize(artifact) {
      return {
        width: artifact?.width || 1,
        height: artifact?.height || 1
      };
    },
    figureFrameStyle(artifact) {
      const size = this.figureSize(artifact);
      const gapCols = Math.max(0, size.width - 1);
      const gapRows = Math.max(0, size.height - 1);
      return {
        width: `calc(${size.width} * var(--fusion-reveal-cell-size, 64px) + ${gapCols} * var(--fusion-reveal-gap, 8px))`,
        height: `calc(${size.height} * var(--fusion-reveal-cell-size, 64px) + ${gapRows} * var(--fusion-reveal-gap, 8px))`
      };
    },
    ingredientStyle(artifact, index) {
      const count = Math.max(1, this.resolvedIngredientArtifacts.length);
      const radius = Number(this.radius) || 0;
      const angle = count === 2
        ? (index === 0 ? Math.PI : 0)
        : (-Math.PI / 2) + ((Math.PI * 2 * index) / count);
      const startX = Math.round(Math.cos(angle) * radius);
      const startY = Math.round(Math.sin(angle) * radius);
      const spin = index % 2 === 0 ? '-9deg' : '9deg';
      return {
        ...this.figureFrameStyle(artifact),
        '--fusion-start-x': `${startX}px`,
        '--fusion-start-y': `${startY}px`,
        '--fusion-magnet-x': `${Math.round(startX * 0.26)}px`,
        '--fusion-magnet-y': `${Math.round(startY * 0.26)}px`,
        '--fusion-impact-x': `${Math.round(startX * -0.05)}px`,
        '--fusion-impact-y': `${Math.round(startY * -0.05)}px`,
        '--fusion-spin': spin,
        '--fusion-spin-reverse': spin.startsWith('-') ? '8deg' : '-8deg'
      };
    },
    artifactKey(artifact, index) {
      return artifact?.instanceKey || artifact?.rowId || artifact?.id || index;
    },
    fallbackLabel(artifact) {
      return artifactNameText(artifact);
    }
  },
  template: `
    <div :class="rootClass" role="status" :aria-label="label" @animationend.self="finish">
      <div :class="stageClass" aria-hidden="true">
        <div
          v-for="(artifact, index) in resolvedIngredientArtifacts"
          :key="artifactKey(artifact, index)"
          :class="[ingredientClass, ingredientClass + '--' + index]"
          :style="ingredientStyle(artifact, index)"
        >
          <slot
            name="artifact"
            :artifact="artifact"
            :index="index"
            kind="ingredient"
            :width="figureSize(artifact).width"
            :height="figureSize(artifact).height"
          >
            <span>{{ fallbackLabel(artifact) }}</span>
          </slot>
        </div>
        <div :class="fieldClass"></div>
        <div :class="burstClass"></div>
        <div v-if="resultArtifact" :class="resultClass" :style="figureFrameStyle(resultArtifact)">
          <slot
            name="artifact"
            :artifact="resultArtifact"
            :index="-1"
            kind="result"
            :width="figureSize(resultArtifact).width"
            :height="figureSize(resultArtifact).height"
          >
            <span>{{ fallbackLabel(resultArtifact) }}</span>
          </slot>
        </div>
      </div>
    </div>
  `
};
