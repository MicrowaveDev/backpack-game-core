function nonEmptyArray(value) {
  return Array.isArray(value) ? value : [];
}

export const AssetRollResultPanel = {
  name: 'AssetRollResultPanel',
  props: {
    panel: {
      type: Object,
      default: null
    },
    as: {
      type: String,
      default: 'div'
    },
    titleTag: {
      type: String,
      default: 'strong'
    }
  },
  computed: {
    visible() {
      return Boolean(this.panel && this.panel.visible !== false);
    },
    renderedLines() {
      return nonEmptyArray(this.panel?.lines);
    }
  },
  template: `
    <component
      v-if="visible"
      :is="as"
      :class="panel.className || null"
      :role="panel.role || null"
      :aria-live="panel.ariaLive || null"
      :data-testid="panel.testId || null"
    >
      <slot name="title" :panel="panel">
        <component :is="titleTag" v-if="panel.title">{{ panel.title }}</component>
      </slot>
      <template v-for="line in renderedLines" :key="line.key">
        <slot name="line" :panel="panel" :line="line">
          <span>{{ line.text }}</span>
        </slot>
      </template>
      <slot :panel="panel" :lines="renderedLines"></slot>
    </component>
  `
};

export const GachaOddsTable = {
  name: 'GachaOddsTable',
  props: {
    sections: {
      type: Array,
      default: () => []
    },
    sectionTag: {
      type: String,
      default: 'div'
    },
    titleTag: {
      type: String,
      default: 'h4'
    },
    showSectionTitles: {
      type: Boolean,
      default: false
    },
    sectionClass: {
      type: [String, Array, Object],
      default: ''
    },
    tableClass: {
      type: [String, Array, Object],
      default: ''
    }
  },
  computed: {
    visibleSections() {
      return nonEmptyArray(this.sections)
        .filter((section) => section && section.visible !== false && nonEmptyArray(section.rows).length);
    }
  },
  methods: {
    rowValue(row, column) {
      if (!row || !column) return '';
      return row[column.field] ?? '';
    }
  },
  template: `
    <component
      v-for="section in visibleSections"
      :key="section.key"
      :is="sectionTag"
      :class="sectionClass || null"
    >
      <slot name="section-title" :section="section">
        <component :is="titleTag" v-if="showSectionTitles && section.title">{{ section.title }}</component>
      </slot>
      <slot name="table" :section="section">
        <table :class="tableClass || null">
          <thead>
            <tr>
              <th v-for="column in section.columns" :key="column.key">{{ column.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in section.rows" :key="row.rowKey">
              <td v-for="column in section.columns" :key="column.key">{{ rowValue(row, column) }}</td>
            </tr>
          </tbody>
        </table>
      </slot>
    </component>
  `
};
