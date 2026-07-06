function nonEmptyArray(value) {
  return Array.isArray(value) ? value : [];
}

export const BattleLog = {
  name: 'BattleLog',
  props: {
    rows: {
      type: Array,
      default: () => []
    },
    as: {
      type: String,
      default: 'div'
    },
    rowTag: {
      type: String,
      default: 'div'
    },
    selectableRowTag: {
      type: String,
      default: 'button'
    },
    emptyTag: {
      type: String,
      default: 'p'
    },
    rootClass: {
      type: [String, Array, Object],
      default: 'battle-log'
    },
    rowClass: {
      type: [String, Array, Object],
      default: 'battle-log-entry'
    },
    activeClass: {
      type: [String, Array, Object],
      default: 'active'
    },
    emptyClass: {
      type: [String, Array, Object],
      default: 'battle-log-empty'
    },
    textField: {
      type: String,
      default: 'text'
    },
    emptyText: {
      type: String,
      default: ''
    },
    selectable: {
      type: Boolean,
      default: false
    },
    testId: {
      type: String,
      default: ''
    }
  },
  emits: ['select'],
  computed: {
    renderedRows() {
      return nonEmptyArray(this.rows).filter((row) => row && row.visible !== false);
    }
  },
  methods: {
    rowComponent(row) {
      if (row?.as) return row.as;
      return this.selectable || row?.selectable ? this.selectableRowTag : this.rowTag;
    },
    rowClasses(row) {
      return [
        this.rowClass,
        row?.className || null,
        row?.classNames || null,
        row?.active ? this.activeClass : null
      ].filter(Boolean);
    },
    rowText(row) {
      if (!row) return '';
      return row[this.textField] ?? row.text ?? row.display?.logText ?? row.narration ?? '';
    },
    rowType(row) {
      return this.rowComponent(row) === 'button' ? (row?.buttonType || 'button') : null;
    },
    rowKey(row, index) {
      return row?.key ?? row?.rowKey ?? row?.replayIndex ?? row?.id ?? index;
    },
    emitSelect(row, event) {
      if (!this.selectable && !row?.selectable) return;
      this.$emit('select', { row, event });
    }
  },
  template: `
    <component :is="as" :class="rootClass || null" :data-testid="testId || null">
      <slot v-if="!renderedRows.length" name="empty">
        <component
          v-if="emptyText"
          :is="emptyTag"
          :class="emptyClass || null"
        >{{ emptyText }}</component>
      </slot>
      <slot v-else name="rows" :rows="renderedRows" :select="emitSelect">
        <component
          v-for="(row, index) in renderedRows"
          :key="rowKey(row, index)"
          :is="rowComponent(row)"
          :class="rowClasses(row)"
          :type="rowType(row)"
          :aria-current="row.active ? 'step' : null"
          v-bind="row.attrs || {}"
          @click="emitSelect(row, $event)"
        >
          <slot name="row" :row="row" :text="rowText(row)" :select="emitSelect">
            {{ rowText(row) }}
          </slot>
        </component>
      </slot>
    </component>
  `
};
