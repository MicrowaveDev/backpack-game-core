function nonEmptyArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function artifactId(artifact) {
  return artifact?.artifactId || artifact?.id || artifact?.resultArtifactId || '';
}

export const RecipeCard = {
  name: 'RecipeCard',
  props: {
    recipe: {
      type: Object,
      default: null
    },
    index: {
      type: Number,
      default: 0
    },
    active: {
      type: Boolean,
      default: false
    },
    interactive: {
      type: Boolean,
      default: false
    },
    as: {
      type: String,
      default: 'article'
    },
    artifactTag: {
      type: String,
      default: 'div'
    },
    resultArtifactTag: {
      type: String,
      default: 'div'
    },
    titleTag: {
      type: String,
      default: 'h3'
    },
    labels: {
      type: Object,
      default: () => ({})
    },
    kickerText: {
      type: String,
      default: ''
    },
    operatorLabel: {
      type: String,
      default: '+'
    },
    cardClass: {
      type: [Function, String, Array, Object],
      default: 'recipe-card'
    },
    activeClass: {
      type: [String, Array, Object],
      default: 'recipe-card--active'
    },
    flowClass: {
      type: [String, Array, Object],
      default: 'recipe-card-flow'
    },
    ingredientRowClass: {
      type: [String, Array, Object],
      default: 'recipe-ingredient-row'
    },
    artifactClass: {
      type: [String, Array, Object],
      default: 'recipe-artifact-tile recipe-artifact-tile--ingredient'
    },
    resultArtifactClass: {
      type: [String, Array, Object],
      default: 'recipe-artifact-tile recipe-artifact-tile--result'
    },
    operatorClass: {
      type: [String, Array, Object],
      default: 'recipe-magnet-mark'
    },
    copyClass: {
      type: [String, Array, Object],
      default: 'recipe-card-copy'
    },
    kickerClass: {
      type: [String, Array, Object],
      default: 'recipe-card-kicker'
    },
    statsClass: {
      type: [String, Array, Object],
      default: 'recipe-card-stats'
    },
    testId: {
      type: String,
      default: ''
    },
    tabindex: {
      type: [String, Number],
      default: 0
    }
  },
  emits: ['select'],
  computed: {
    visible() {
      return Boolean(this.recipe && this.recipe.visible !== false);
    },
    ingredients() {
      return nonEmptyArray(this.recipe?.ingredients);
    },
    result() {
      return this.recipe?.result || this.recipe?.asset || null;
    },
    resultArtifactId() {
      return this.recipe?.resultArtifactId || artifactId(this.result);
    },
    titleText() {
      return this.recipe?.resultName || this.recipe?.title || this.result?.name || this.resultArtifactId;
    },
    descriptionText() {
      return this.recipe?.resultDescription || this.recipe?.description || '';
    },
    kickerLabel() {
      return this.kickerText || this.recipe?.kicker || this.labels?.kicker || this.labels?.fusionOnly || '';
    },
    cardClasses() {
      const baseClass = typeof this.cardClass === 'function'
        ? this.cardClass(this.recipe, this.index)
        : this.cardClass;
      return [
        baseClass,
        this.recipe?.className || null,
        this.recipe?.classNames || null,
        this.active ? this.activeClass : null
      ].filter(Boolean);
    },
    componentRole() {
      return this.interactive ? 'button' : null;
    },
    componentTabindex() {
      return this.interactive ? this.tabindex : null;
    }
  },
  methods: {
    artifactId,
    artifactKey(artifact, index, role) {
      return artifact?.key || artifact?.rowKey || artifactId(artifact) || `${role}:${index}`;
    },
    emitSelect(event) {
      if (!this.interactive) return;
      this.$emit('select', { recipe: this.recipe, index: this.index, event });
    }
  },
  template: `
    <component
      v-if="visible"
      :is="as"
      :class="cardClasses"
      :data-testid="testId || null"
      :data-result-artifact-id="resultArtifactId || null"
      :role="componentRole"
      :tabindex="componentTabindex"
      @click="emitSelect"
      @keydown.enter.prevent="emitSelect"
      @keydown.space.prevent="emitSelect"
    >
      <slot name="flow" :recipe="recipe" :ingredients="ingredients" :result="result">
        <div :class="flowClass" aria-hidden="true">
          <div :class="ingredientRowClass">
            <component
              v-for="(artifact, artifactIndex) in ingredients"
              :key="artifactKey(artifact, artifactIndex, 'ingredient')"
              :is="artifactTag"
              :class="artifactClass"
              :data-artifact-id="artifactId(artifact) || null"
            >
              <slot
                name="artifact"
                :recipe="recipe"
                :artifact="artifact"
                role="ingredient"
                :index="index"
                :artifactIndex="artifactIndex"
              >
                <slot
                  name="ingredient"
                  :recipe="recipe"
                  :artifact="artifact"
                  :index="index"
                  :artifactIndex="artifactIndex"
                ></slot>
              </slot>
            </component>
          </div>
          <slot name="operator" :recipe="recipe">
            <span :class="operatorClass">{{ operatorLabel }}</span>
          </slot>
          <component
            :is="resultArtifactTag"
            :class="resultArtifactClass"
            :data-artifact-id="resultArtifactId || null"
          >
            <slot
              name="artifact"
              :recipe="recipe"
              :artifact="result"
              role="result"
              :index="index"
              :artifactIndex="-1"
            >
              <slot name="result" :recipe="recipe" :artifact="result" :index="index"></slot>
            </slot>
          </component>
        </div>
      </slot>

      <slot name="copy" :recipe="recipe" :result="result" :index="index">
        <div :class="copyClass">
          <slot name="kicker" :recipe="recipe" :result="result" :index="index">
            <span v-if="kickerLabel" :class="kickerClass">{{ kickerLabel }}</span>
          </slot>
          <slot name="title" :recipe="recipe" :result="result" :index="index">
            <component :is="titleTag" v-if="titleText">{{ titleText }}</component>
          </slot>
          <slot name="description" :recipe="recipe" :result="result" :index="index">
            <p v-if="descriptionText">{{ descriptionText }}</p>
          </slot>
          <slot name="stats" :recipe="recipe" :result="result" :index="index" :statsClass="statsClass"></slot>
        </div>
      </slot>

      <slot :recipe="recipe" :result="result" :ingredients="ingredients" :index="index"></slot>
    </component>
  `
};
