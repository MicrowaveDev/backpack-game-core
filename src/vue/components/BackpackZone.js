function nonEmptyArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function setHas(collection, value) {
  return Boolean(value && collection?.has?.(value));
}

function localizedName(value, lang = 'en') {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[lang] || value.en || value.default || Object.values(value).find(Boolean) || '';
}

export const BackpackZone = {
  name: 'BackpackZone',
  props: {
    items: {
      type: Array,
      default: () => []
    },
    labels: {
      type: Object,
      default: () => ({})
    },
    lang: {
      type: String,
      default: 'en'
    },
    nameForItem: {
      type: Function,
      default: null
    },
    formatItemStats: {
      type: Function,
      default: null
    },
    previewOrientationForItem: {
      type: Function,
      default: null
    },
    pendingItemIds: {
      type: Object,
      default: null
    },
    highlightedItemIds: {
      type: Object,
      default: null
    },
    bagFamily: {
      type: String,
      default: 'bag'
    },
    rootClass: {
      type: String,
      default: 'artifact-container-zone'
    },
    headerClass: {
      type: String,
      default: 'artifact-container-header'
    },
    countClass: {
      type: String,
      default: 'artifact-container-count'
    },
    listClass: {
      type: String,
      default: 'artifact-container-items'
    },
    itemClass: {
      type: String,
      default: 'container-item'
    },
    itemPendingClass: {
      type: String,
      default: 'container-item--fusion-pending'
    },
    itemHighlightedClass: {
      type: String,
      default: 'container-item--fusion-candidate'
    },
    visualClass: {
      type: String,
      default: 'container-item-visual'
    },
    copyClass: {
      type: String,
      default: 'container-item-copy'
    },
    statListClass: {
      type: String,
      default: 'artifact-stat-chips'
    },
    statChipClass: {
      type: String,
      default: 'artifact-stat-chip'
    },
    statChipPositiveClass: {
      type: String,
      default: 'artifact-stat-chip--pos'
    },
    statChipNegativeClass: {
      type: String,
      default: 'artifact-stat-chip--neg'
    },
    bagSlotClass: {
      type: String,
      default: 'artifact-stat-chip artifact-stat-chip--bag'
    },
    emptyClass: {
      type: String,
      default: 'artifact-container-empty'
    }
  },
  emits: ['select-item', 'container-dragover', 'container-drop'],
  computed: {
    renderedItems() {
      return nonEmptyArray(this.items);
    },
    titleLabel() {
      return this.labels?.title || 'Container';
    },
    bagSlotsLabel() {
      return this.labels?.bagSlots || 'slots';
    },
    emptyLabel() {
      return this.labels?.empty || '';
    }
  },
  methods: {
    itemId(item) {
      return item?.artifactId || item?.id || '';
    },
    itemRowId(item) {
      return item?.rowId || item?.id || '';
    },
    itemKey(item, index) {
      return item?.instanceKey || item?.rowId || item?.id || index;
    },
    itemName(item) {
      if (this.nameForItem) return this.nameForItem(item);
      return localizedName(item?.name, this.lang) || this.itemId(item);
    },
    itemStats(item) {
      return this.formatItemStats ? nonEmptyArray(this.formatItemStats(item)) : [];
    },
    previewOrientation(item) {
      if (this.previewOrientationForItem) return this.previewOrientationForItem(item);
      return {
        width: item?.width || 1,
        height: item?.height || 1
      };
    },
    previewItem(item) {
      const orientation = this.previewOrientation(item);
      return [{
        artifactId: this.itemId(item),
        rowId: item?.rowId,
        x: 0,
        y: 0,
        width: orientation.width,
        height: orientation.height
      }];
    },
    itemDataset(item) {
      const orientation = this.previewOrientation(item);
      return {
        'data-artifact-id': this.itemId(item),
        'data-artifact-row-id': item?.rowId || '',
        'data-artifact-width': orientation.width,
        'data-artifact-height': orientation.height
      };
    },
    isPending(item) {
      return setHas(this.pendingItemIds, this.itemRowId(item));
    },
    isHighlighted(item) {
      return setHas(this.highlightedItemIds, this.itemRowId(item));
    },
    itemTitle(item) {
      if (this.isPending(item)) return this.labels?.pendingTitle || null;
      if (this.isHighlighted(item)) return this.labels?.highlightedTitle || null;
      return null;
    },
    itemClasses(item) {
      return {
        [this.itemPendingClass]: this.isPending(item),
        [this.itemHighlightedClass]: !this.isPending(item) && this.isHighlighted(item)
      };
    },
    selectItem(item) {
      this.$emit('select-item', {
        item,
        artifactId: this.itemId(item),
        id: item?.rowId
      });
    }
  },
  template: `
    <div
      :class="rootClass"
      @dragover="$emit('container-dragover', $event)"
      @drop="$emit('container-drop', $event)"
    >
      <div :class="headerClass">
        <strong>{{ titleLabel }}</strong>
        <span v-if="renderedItems.length" :class="countClass">{{ renderedItems.length }}</span>
      </div>
      <div v-if="renderedItems.length" :class="listClass">
        <div
          v-for="(item, index) in renderedItems"
          :key="itemKey(item, index)"
          :class="[itemClass, itemClasses(item)]"
          :title="itemTitle(item)"
          v-bind="itemDataset(item)"
          @click="selectItem(item)"
        >
          <slot
            name="visual"
            :item="item"
            :orientation="previewOrientation(item)"
            :preview-item="previewItem(item)"
            :visual-class="visualClass"
          >
            <span :class="visualClass">{{ itemName(item) }}</span>
          </slot>
          <div :class="copyClass">
            <strong>{{ itemName(item) }}</strong>
            <span v-if="item.family === bagFamily" :class="bagSlotClass">{{ item.slotCount }} {{ bagSlotsLabel }}</span>
            <span :class="statListClass">
              <span
                v-for="stat in itemStats(item)"
                :key="stat.key"
                :class="[statChipClass, stat.positive ? statChipPositiveClass : statChipNegativeClass]"
              >{{ stat.label }} {{ stat.value }}</span>
            </span>
          </div>
        </div>
      </div>
      <p v-else :class="emptyClass">{{ emptyLabel }}</p>
    </div>
  `
};
