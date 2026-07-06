import { RecipeCard } from './RecipeCard.js';

function nonEmptyArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export const RecipeList = {
  name: 'RecipeList',
  components: { RecipeCard },
  props: {
    recipes: {
      type: Array,
      default: () => []
    },
    labels: {
      type: Object,
      default: () => ({})
    },
    activeIndex: {
      type: Number,
      default: -1
    },
    interactive: {
      type: Boolean,
      default: false
    },
    as: {
      type: String,
      default: 'div'
    },
    listClass: {
      type: [String, Array, Object],
      default: 'recipe-list'
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
    titleTag: {
      type: String,
      default: 'h3'
    },
    operatorLabel: {
      type: String,
      default: '+'
    },
    emptyText: {
      type: String,
      default: ''
    },
    emptyClass: {
      type: [String, Array, Object],
      default: ''
    },
    emptyTag: {
      type: String,
      default: 'p'
    },
    testId: {
      type: String,
      default: ''
    },
    cardTestId: {
      type: String,
      default: ''
    }
  },
  emits: ['select'],
  computed: {
    renderedRecipes() {
      return nonEmptyArray(this.recipes).filter((recipe) => recipe && recipe.visible !== false);
    }
  },
  methods: {
    recipeKey(recipe, index) {
      return recipe?.key || recipe?.id || recipe?.resultArtifactId || index;
    },
    classFor(recipe, index) {
      return typeof this.cardClass === 'function'
        ? this.cardClass(recipe, index)
        : this.cardClass;
    },
    isActive(recipe, index) {
      return Boolean(recipe?.active || index === this.activeIndex);
    },
    isInteractive(recipe) {
      return Boolean(this.interactive || recipe?.interactive);
    },
    emitSelect(payload) {
      this.$emit('select', payload);
    }
  },
  template: `
    <component :is="as" :class="listClass || null" :data-testid="testId || null">
      <slot v-if="!renderedRecipes.length" name="empty">
        <component v-if="emptyText" :is="emptyTag" :class="emptyClass || null">{{ emptyText }}</component>
      </slot>
      <recipe-card
        v-for="(recipe, index) in renderedRecipes"
        :key="recipeKey(recipe, index)"
        :recipe="recipe"
        :index="index"
        :active="isActive(recipe, index)"
        :interactive="isInteractive(recipe)"
        :labels="labels"
        :card-class="classFor(recipe, index)"
        :active-class="activeClass"
        :flow-class="flowClass"
        :ingredient-row-class="ingredientRowClass"
        :artifact-class="artifactClass"
        :result-artifact-class="resultArtifactClass"
        :operator-class="operatorClass"
        :copy-class="copyClass"
        :kicker-class="kickerClass"
        :stats-class="statsClass"
        :title-tag="titleTag"
        :operator-label="operatorLabel"
        :test-id="cardTestId || recipe.testId || ''"
        @select="emitSelect"
      >
        <template #artifact="slotProps">
          <slot name="artifact" v-bind="slotProps"></slot>
        </template>
        <template #operator="slotProps">
          <slot name="operator" v-bind="slotProps">
            <span :class="operatorClass">{{ operatorLabel }}</span>
          </slot>
        </template>
        <template v-if="$slots.copy" #copy="slotProps">
          <slot name="copy" v-bind="slotProps"></slot>
        </template>
        <template v-if="$slots.kicker" #kicker="slotProps">
          <slot name="kicker" v-bind="slotProps"></slot>
        </template>
        <template v-if="$slots.title" #title="slotProps">
          <slot name="title" v-bind="slotProps"></slot>
        </template>
        <template v-if="$slots.description" #description="slotProps">
          <slot name="description" v-bind="slotProps"></slot>
        </template>
        <template v-if="$slots.stats" #stats="slotProps">
          <slot name="stats" v-bind="slotProps"></slot>
        </template>
        <slot :recipe="recipe" :index="index"></slot>
      </recipe-card>
    </component>
  `
};
