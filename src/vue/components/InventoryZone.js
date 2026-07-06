function nonEmptyArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export const InventoryZone = {
  name: 'InventoryZone',
  props: {
    items: {
      type: Array,
      default: () => []
    },
    activeContainers: {
      type: Array,
      default: () => []
    },
    totals: {
      type: Object,
      default: null
    },
    totalRows: {
      type: Number,
      default: 0
    },
    bagRows: {
      type: Array,
      default: () => []
    },
    placementPreviewAt: {
      type: Function,
      default: null
    },
    highlightedRowIds: {
      type: Object,
      default: null
    },
    highlightedTitle: {
      type: String,
      default: ''
    },
    labels: {
      type: Object,
      default: () => ({})
    },
    rootClass: {
      type: String,
      default: 'artifact-inventory-section panel'
    },
    gridClass: {
      type: String,
      default: 'inventory-shell artifact-inventory-grid'
    },
    activeContainersClass: {
      type: String,
      default: 'active-bags-bar'
    },
    containerChipClass: {
      type: String,
      default: 'active-bag-chip'
    },
    containerLockedClass: {
      type: String,
      default: 'active-bag-chip--locked'
    },
    containerDraggableClass: {
      type: String,
      default: 'active-bag-chip--draggable'
    },
    containerActionClass: {
      type: String,
      default: 'active-bag-action'
    },
    footerClass: {
      type: String,
      default: 'artifact-inventory-footer'
    }
  },
  emits: [
    'remove-item',
    'rotate-item',
    'cell-drop',
    'item-drag-start',
    'item-drag-end',
    'deactivate-container',
    'rotate-container',
    'container-chip-drag-start'
  ],
  computed: {
    renderedItems() {
      return nonEmptyArray(this.items);
    },
    visibleContainers() {
      return nonEmptyArray(this.activeContainers).filter((container) => container.hidden !== true);
    },
    showFooter() {
      return this.renderedItems.length > 0;
    },
    rotateActionLabel() {
      return this.labels?.rotateAction || 'Rotate';
    },
    removeActionLabel() {
      return this.labels?.removeAction || 'Remove';
    },
    statSummaryAriaLabel() {
      return this.labels?.statSummaryAriaLabel || 'Item stat summary';
    }
  },
  methods: {
    containerKey(container, index) {
      return container?.id || container?.artifactId || index;
    },
    containerName(container) {
      return container?.name || container?.label || container?.artifactId || container?.id || '';
    },
    containerColor(container) {
      return container?.color || '#888';
    },
    containerClasses(container) {
      return {
        [this.containerLockedClass]: Boolean(container?.locked),
        [this.containerDraggableClass]: container?.draggable !== false
      };
    },
    containerDataset(container) {
      return {
        'data-bag-row-id': container?.id || '',
        'data-bag-locked': container?.locked ? 'true' : 'false'
      };
    },
    containerStyle(container) {
      return {
        borderColor: this.containerColor(container)
      };
    },
    onRemoveItem(payload) {
      this.$emit('remove-item', payload);
    },
    onRotateItem(payload) {
      this.$emit('rotate-item', payload);
    },
    onCellDrop(payload) {
      this.$emit('cell-drop', payload);
    },
    onItemDragStart(payload) {
      this.$emit('item-drag-start', payload);
    },
    onItemDragEnd(payload) {
      this.$emit('item-drag-end', payload);
    },
    onContainerDragStart(container, event) {
      if (container?.draggable === false) return;
      this.$emit('container-chip-drag-start', {
        container,
        id: container?.id,
        artifactId: container?.artifactId,
        event
      });
    },
    onContainerDragEnd() {
      this.$emit('item-drag-end');
    },
    rotateContainer(container) {
      this.$emit('rotate-container', {
        container,
        id: container?.id,
        artifactId: container?.artifactId
      });
    },
    deactivateContainer(container) {
      this.$emit('deactivate-container', {
        container,
        id: container?.id,
        artifactId: container?.artifactId
      });
    }
  },
  template: `
    <div :class="rootClass">
      <slot
        name="grid"
        :grid-class="gridClass"
        :items="renderedItems"
        :total-rows="totalRows"
        :bag-rows="bagRows"
        :placement-preview-at="placementPreviewAt"
        :highlighted-row-ids="highlightedRowIds"
        :highlighted-title="highlightedTitle"
        :on-remove-item="onRemoveItem"
        :on-rotate-item="onRotateItem"
        :on-cell-drop="onCellDrop"
        :on-item-drag-start="onItemDragStart"
        :on-item-drag-end="onItemDragEnd"
      ></slot>
      <div v-if="visibleContainers.length" :class="activeContainersClass">
        <span
          v-for="(container, index) in visibleContainers"
          :key="containerKey(container, index)"
          :class="[containerChipClass, containerClasses(container)]"
          :style="containerStyle(container)"
          :draggable="container.draggable !== false"
          :title="container.title || null"
          v-bind="containerDataset(container)"
          @dragstart="onContainerDragStart(container, $event)"
          @dragend="onContainerDragEnd"
        >
          <slot name="container-chip" :container="container" :name="containerName(container)">
            {{ containerName(container) }}
          </slot>
          <button
            v-if="container.rotatable"
            :class="containerActionClass"
            type="button"
            @click="rotateContainer(container)"
          >{{ rotateActionLabel }}</button>
          <button
            :class="containerActionClass"
            type="button"
            @click="deactivateContainer(container)"
          >{{ removeActionLabel }}</button>
        </span>
      </div>
      <div v-if="showFooter" :class="footerClass">
        <slot name="footer" :totals="totals" :aria-label="statSummaryAriaLabel"></slot>
      </div>
    </div>
  `
};
