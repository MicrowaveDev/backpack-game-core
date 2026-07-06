function nonEmptyArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export const ArtifactCatalogBrowser = {
  name: 'ArtifactCatalogBrowser',
  props: {
    groups: {
      type: Array,
      default: () => []
    },
    selectedItem: {
      type: Object,
      default: null
    },
    selectedRecipe: {
      type: Object,
      default: null
    },
    labels: {
      type: Object,
      default: () => ({})
    },
    count: {
      type: Number,
      default: 0
    },
    selectedRowIds: {
      type: [Object, Array],
      default: () => new Set()
    },
    highlightedTitle: {
      type: String,
      default: ''
    },
    rootClass: {
      type: String,
      default: 'artifact-catalog-browser'
    },
    hasSelectionClass: {
      type: String,
      default: 'artifact-catalog-browser--has-selection'
    },
    gridPanelClass: {
      type: String,
      default: 'artifact-catalog-grid-panel panel'
    },
    gridHeaderClass: {
      type: String,
      default: 'artifact-catalog-grid-header'
    },
    countClass: {
      type: String,
      default: 'artifact-catalog-count'
    },
    groupsClass: {
      type: String,
      default: 'artifact-catalog-groups'
    },
    groupClass: {
      type: String,
      default: 'artifact-catalog-group'
    },
    groupHeaderClass: {
      type: String,
      default: 'artifact-catalog-group-header'
    },
    detailClass: {
      type: String,
      default: 'artifact-catalog-detail'
    },
    detailCloseClass: {
      type: String,
      default: 'artifact-catalog-detail-close'
    },
    detailTopClass: {
      type: String,
      default: 'artifact-catalog-detail-top'
    },
    detailArtClass: {
      type: String,
      default: 'artifact-catalog-detail-art'
    },
    detailCopyClass: {
      type: String,
      default: 'artifact-catalog-detail-copy'
    },
    detailKickerClass: {
      type: String,
      default: 'artifact-catalog-detail-kicker'
    },
    detailStatsClass: {
      type: String,
      default: 'artifact-catalog-detail-stats'
    },
    factsClass: {
      type: String,
      default: 'artifact-catalog-facts'
    },
    recipeClass: {
      type: String,
      default: 'artifact-catalog-selected-recipe'
    },
    recipeFlowClass: {
      type: String,
      default: 'artifact-catalog-recipe-flow'
    },
    recipeIngredientsClass: {
      type: String,
      default: 'artifact-catalog-recipe-ingredients'
    },
    recipeArtifactClass: {
      type: String,
      default: 'artifact-catalog-recipe-artifact'
    },
    recipeResultClass: {
      type: String,
      default: 'artifact-catalog-recipe-artifact artifact-catalog-recipe-artifact--result'
    },
    operatorClass: {
      type: String,
      default: 'recipe-magnet-mark'
    },
    operatorLabel: {
      type: String,
      default: '+'
    }
  },
  emits: ['select-item', 'close-details', 'grid-panel-resize'],
  computed: {
    rootClasses() {
      return [
        this.rootClass,
        this.selectedItem ? this.hasSelectionClass : null
      ].filter(Boolean);
    },
    renderedGroups() {
      return nonEmptyArray(this.groups);
    },
    renderedFacts() {
      return nonEmptyArray(this.selectedItem?.facts)
        .filter((fact) => fact && fact.visible !== false);
    },
    recipeIngredients() {
      return nonEmptyArray(this.selectedRecipe?.ingredients);
    },
    recipeResult() {
      return this.selectedRecipe?.result || null;
    },
    selectedId() {
      return this.selectedItem?.id || this.selectedItem?.artifactId || '';
    },
    recipeResultId() {
      return this.selectedRecipe?.resultArtifactId || this.recipeResult?.id || '';
    },
    labelAll() {
      return this.labels?.all || '';
    },
    labelGridTitle() {
      return this.labels?.gridTitle || '';
    },
    labelCloseDetails() {
      return this.labels?.closeDetails || '';
    },
    labelIngredients() {
      return this.labels?.ingredients || '';
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.updateGridPanelMetrics();
      if (typeof ResizeObserver !== 'undefined' && this.$refs.gridPanel) {
        this.catalogResizeObserver = new ResizeObserver(this.updateGridPanelMetrics);
        this.catalogResizeObserver.observe(this.$refs.gridPanel);
      }
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', this.updateGridPanelMetrics);
      }
    });
  },
  beforeUnmount() {
    if (this.catalogResizeObserver) {
      this.catalogResizeObserver.disconnect();
      this.catalogResizeObserver = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.updateGridPanelMetrics);
    }
  },
  methods: {
    groupKey(group, index) {
      return group?.id || index;
    },
    factKey(fact, index) {
      return fact?.key || fact?.label || index;
    },
    artifactId(artifact) {
      return artifact?.artifactId || artifact?.id || '';
    },
    artifactKey(artifact, index, prefix) {
      return artifact?.key || artifact?.rowKey || this.artifactId(artifact) || `${prefix}:${index}`;
    },
    emitSelectItem(artifactId, event) {
      if (!artifactId) return;
      this.$emit('select-item', { artifactId, event });
    },
    emitCloseDetails(event) {
      this.$emit('close-details', { event });
    },
    updateGridPanelMetrics() {
      const panelWidth = this.$refs.gridPanel?.clientWidth || 0;
      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : panelWidth;
      this.$emit('grid-panel-resize', { panelWidth, viewportWidth });
    }
  },
  template: `
    <section :class="rootClasses" data-testid="artifact-catalog-browser">
      <div ref="gridPanel" :class="gridPanelClass">
        <div :class="gridHeaderClass">
          <div>
            <p class="eyebrow">{{ labelAll }}</p>
            <h3>{{ labelGridTitle }}</h3>
          </div>
          <span :class="countClass">{{ count }}</span>
        </div>

        <div :class="groupsClass">
          <section
            v-for="(group, groupIndex) in renderedGroups"
            :key="groupKey(group, groupIndex)"
            :class="groupClass"
            data-testid="artifact-catalog-group"
            :data-artifact-group="group.id || null"
          >
            <div :class="groupHeaderClass">
              <h4>{{ group.label }}</h4>
              <span>{{ group.artifacts?.length ?? group.count ?? 0 }}</span>
            </div>
            <slot
              name="group-board"
              :group="group"
              :selected-row-ids="selectedRowIds"
              :highlighted-title="highlightedTitle"
              :select-item="emitSelectItem"
            ></slot>
          </section>
        </div>
      </div>

      <aside
        v-if="selectedItem"
        :class="detailClass"
        data-testid="artifact-catalog-detail"
        :data-artifact-id="selectedId || null"
      >
        <button
          type="button"
          :class="detailCloseClass"
          :aria-label="labelCloseDetails"
          @pointerdown.stop.prevent="emitCloseDetails"
          @click.stop.prevent="emitCloseDetails"
        >×</button>

        <div :class="detailTopClass">
          <div :class="detailArtClass" aria-hidden="true">
            <slot name="detail-visual" :item="selectedItem"></slot>
          </div>
          <div :class="detailCopyClass">
            <span :class="detailKickerClass">{{ selectedItem.kicker }}</span>
            <h3>{{ selectedItem.title }}</h3>
            <p v-if="selectedItem.description">{{ selectedItem.description }}</p>
          </div>
        </div>

        <slot name="detail-stats" :item="selectedItem" :class-name="detailStatsClass"></slot>

        <dl :class="factsClass">
          <div v-for="(fact, factIndex) in renderedFacts" :key="factKey(fact, factIndex)">
            <dt>{{ fact.label }}</dt>
            <dd>{{ fact.value }}</dd>
          </div>
        </dl>

        <section
          v-if="selectedRecipe"
          :class="recipeClass"
          data-testid="artifact-catalog-selected-recipe"
          :data-selected-result-artifact-id="recipeResultId || null"
        >
          <h4>{{ labelIngredients }}</h4>
          <div :class="recipeFlowClass" aria-hidden="true">
            <div :class="recipeIngredientsClass">
              <button
                v-for="(ingredient, ingredientIndex) in recipeIngredients"
                :key="artifactKey(ingredient, ingredientIndex, 'ingredient')"
                type="button"
                :class="recipeArtifactClass"
                :data-artifact-id="artifactId(ingredient) || null"
                @click="emitSelectItem(artifactId(ingredient), $event)"
              >
                <slot
                  name="recipe-artifact"
                  :recipe="selectedRecipe"
                  :artifact="ingredient"
                  role="ingredient"
                  :artifactIndex="ingredientIndex"
                ></slot>
              </button>
            </div>
            <span :class="operatorClass">{{ operatorLabel }}</span>
            <button
              type="button"
              :class="recipeResultClass"
              :data-artifact-id="recipeResultId || null"
              @click="emitSelectItem(recipeResultId, $event)"
            >
              <slot
                name="recipe-artifact"
                :recipe="selectedRecipe"
                :artifact="recipeResult"
                role="result"
                :artifactIndex="-1"
              ></slot>
            </button>
          </div>
        </section>
      </aside>
    </section>
  `
};
