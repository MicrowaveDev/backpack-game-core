export const SellZone = {
  name: 'SellZone',
  props: {
    active: {
      type: Boolean,
      default: false
    },
    draggingItemId: {
      type: [String, Number],
      default: ''
    },
    priceLabel: {
      type: [String, Number],
      default: ''
    },
    pricePrefix: {
      type: String,
      default: ''
    },
    inactiveText: {
      type: String,
      default: 'Sell area'
    },
    inactivePrefix: {
      type: String,
      default: ''
    },
    rootClass: {
      type: [String, Array, Object],
      default: 'sell-zone'
    },
    activeClass: {
      type: [String, Array, Object],
      default: 'sell-zone--active'
    },
    priceClass: {
      type: [String, Array, Object],
      default: 'sell-zone-price'
    }
  },
  emits: ['dragover', 'dragleave', 'drop'],
  computed: {
    showPrice() {
      return Boolean(this.active && this.draggingItemId);
    },
    rootClasses() {
      return [this.rootClass, this.active ? this.activeClass : null].filter(Boolean);
    },
    priceText() {
      return `${this.pricePrefix ? `${this.pricePrefix} ` : ''}+${this.priceLabel}`;
    },
    idleText() {
      return `${this.inactivePrefix ? `${this.inactivePrefix} ` : ''}${this.inactiveText}`;
    }
  },
  template: `
    <div
      :class="rootClasses"
      @dragover="$emit('dragover', $event)"
      @dragleave="$emit('dragleave')"
      @drop="$emit('drop', $event)"
    >
      <slot v-if="showPrice" name="price" :price-label="priceLabel" :text="priceText">
        <span :class="priceClass || null">{{ priceText }}</span>
      </slot>
      <slot v-else name="idle" :text="idleText">
        <span>{{ idleText }}</span>
      </slot>
    </div>
  `
};
