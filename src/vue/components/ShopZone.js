import { SellZone } from './SellZone.js';

function nonEmptyArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export const ShopZone = {
  name: 'ShopZone',
  components: { SellZone },
  props: {
    rows: {
      type: Array,
      default: () => []
    },
    labels: {
      type: Object,
      default: () => ({})
    },
    refreshCost: {
      type: [Number, String],
      default: null
    },
    refreshDisabled: {
      type: Boolean,
      default: false
    },
    rowClass: {
      type: [Function, String, Array, Object],
      default: ''
    },
    itemAttrs: {
      type: [Function, Object],
      default: null
    },
    sellZone: {
      type: Object,
      default: () => ({})
    },
    showSellZone: {
      type: Boolean,
      default: true
    },
    rootClass: {
      type: String,
      default: 'artifact-shop'
    },
    headerClass: {
      type: String,
      default: 'artifact-shop-header'
    },
    refreshButtonClass: {
      type: String,
      default: 'link'
    },
    listClass: {
      type: String,
      default: 'artifact-shop-items'
    },
    itemClass: {
      type: String,
      default: 'shop-item'
    },
    itemHeaderClass: {
      type: String,
      default: 'shop-item-header'
    },
    itemNameClass: {
      type: String,
      default: 'shop-item-name'
    },
    itemPriceClass: {
      type: String,
      default: 'shop-item-price'
    },
    itemDescriptionClass: {
      type: String,
      default: 'shop-item-description'
    },
    visualClass: {
      type: String,
      default: 'shop-item-visual'
    },
    itemTagsClass: {
      type: String,
      default: 'shop-item-tags'
    },
    statChipClass: {
      type: String,
      default: 'artifact-stat-chip'
    },
    characterTagClass: {
      type: String,
      default: 'artifact-stat-chip--character'
    },
    bagTagClass: {
      type: String,
      default: 'artifact-stat-chip--bag'
    },
    positiveTagClass: {
      type: String,
      default: 'artifact-stat-chip--pos'
    },
    negativeTagClass: {
      type: String,
      default: 'artifact-stat-chip--neg'
    }
  },
  emits: [
    'buy',
    'refresh',
    'sell-dragover',
    'sell-dragleave',
    'sell-drop'
  ],
  computed: {
    renderedRows() {
      return nonEmptyArray(this.rows);
    },
    titleLabel() {
      return this.labels?.title || 'Shop';
    },
    refreshLabel() {
      return this.labels?.refresh || 'Refresh';
    },
    refreshPricePrefix() {
      return this.labels?.refreshPricePrefix || '';
    },
    refreshText() {
      if (this.refreshCost === null || this.refreshCost === undefined || this.refreshCost === '') {
        return this.refreshLabel;
      }
      return `${this.refreshLabel} (${this.refreshPricePrefix}${this.refreshCost})`;
    },
    pricePrefix() {
      return this.labels?.pricePrefix || '';
    },
    characterItemLabel() {
      return this.labels?.characterItem || '';
    },
    bagSlotsLabel() {
      return this.labels?.bagSlots || '';
    },
    sellZoneProps() {
      return {
        active: Boolean(this.sellZone?.active),
        draggingItemId: this.sellZone?.draggingItemId || '',
        priceLabel: this.sellZone?.priceLabel || '',
        pricePrefix: this.sellZone?.pricePrefix || '',
        inactivePrefix: this.sellZone?.inactivePrefix || '',
        inactiveText: this.sellZone?.inactiveText || '',
        rootClass: this.sellZone?.rootClass || 'sell-zone',
        activeClass: this.sellZone?.activeClass || 'sell-zone--active'
      };
    }
  },
  methods: {
    rowKey(row, index) {
      return row?.id || row?.artifactId || row?.index || index;
    },
    classFor(row) {
      return [
        this.itemClass,
        typeof this.rowClass === 'function' ? this.rowClass(row) : this.rowClass
      ].filter(Boolean);
    },
    attrsFor(row) {
      if (typeof this.itemAttrs === 'function') return this.itemAttrs(row) || {};
      if (this.itemAttrs && typeof this.itemAttrs === 'object') return this.itemAttrs;
      return {};
    },
    previewWidth(row) {
      return row?.previewOrientation?.width || 1;
    },
    previewHeight(row) {
      return row?.previewOrientation?.height || 1;
    },
    renderedStats(row) {
      return nonEmptyArray(row?.statRows);
    },
    statText(stat) {
      if (!stat) return '';
      return stat.text ?? stat.value ?? '';
    },
    statClass(stat) {
      return [
        this.statChipClass,
        stat?.positive ? this.positiveTagClass : this.negativeTagClass
      ].filter(Boolean);
    },
    emitBuy(row) {
      this.$emit('buy', row);
    },
    emitRefresh() {
      this.$emit('refresh');
    },
    emitSellDragover(event) {
      this.$emit('sell-dragover', event);
    },
    emitSellDragleave() {
      this.$emit('sell-dragleave');
    },
    emitSellDrop(event) {
      this.$emit('sell-drop', event);
    }
  },
  template: `
    <div :class="rootClass">
      <div :class="headerClass">
        <strong>{{ titleLabel }}</strong>
        <button
          type="button"
          :class="refreshButtonClass"
          :disabled="refreshDisabled"
          @click="emitRefresh"
        >{{ refreshText }}</button>
      </div>
      <div v-if="renderedRows.length" :class="listClass">
        <div
          v-for="(row, index) in renderedRows"
          :key="rowKey(row, index)"
          :class="classFor(row)"
          :data-artifact-draggable="row.canAfford ? 'true' : 'false'"
          :data-artifact-id="row.artifactId || null"
          :data-artifact-width="previewWidth(row)"
          :data-artifact-height="previewHeight(row)"
          v-bind="attrsFor(row)"
          @click="emitBuy(row)"
        >
          <slot name="item-header" :row="row">
            <div :class="itemHeaderClass">
              <strong :class="itemNameClass">{{ row.name || row.artifactId }}</strong>
              <span :class="itemPriceClass">{{ pricePrefix }}{{ row.price }}</span>
            </div>
          </slot>
          <slot name="visual" :row="row" :orientation="row.previewOrientation" :items="row.previewItem">
            <div :class="visualClass"></div>
          </slot>
          <slot name="item-description" :row="row">
            <p v-if="row.description" :class="itemDescriptionClass">{{ row.description }}</p>
          </slot>
          <slot name="item-tags" :row="row" :stats="renderedStats(row)">
            <div :class="itemTagsClass">
              <span
                v-if="row.characterItem"
                :class="[statChipClass, characterTagClass]"
              >{{ characterItemLabel }}</span>
              <span
                v-if="row.isBag"
                :class="[statChipClass, bagTagClass]"
              >{{ row.slotCount }} {{ bagSlotsLabel }}</span>
              <span
                v-for="stat in renderedStats(row)"
                :key="stat.key"
                :class="statClass(stat)"
              >{{ stat.label }} {{ statText(stat) }}</span>
            </div>
          </slot>
          <slot :row="row"></slot>
        </div>
      </div>
      <slot name="sell-zone" :sell-zone="sellZoneProps">
        <sell-zone
          v-if="showSellZone"
          v-bind="sellZoneProps"
          @dragover="emitSellDragover"
          @dragleave="emitSellDragleave"
          @drop="emitSellDrop"
        />
      </slot>
    </div>
  `
};
