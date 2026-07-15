import { shapeArtifactStatRows } from '../../client/view-model.js';

function nonEmptyArray(value) {
  return Array.isArray(value) ? value : [];
}

function plainObject(value) {
  return value && typeof value === 'object' ? value : {};
}

export const ArtifactStatSummary = {
  name: 'ArtifactStatSummary',
  props: {
    rows: { type: Array, default: null },
    source: { type: Object, default: null },
    artifact: { type: Object, default: null },
    totals: { type: Object, default: null },
    definitions: { type: Array, default: () => [] },
    labels: { type: Object, default: () => ({}) },
    roleMap: { type: Object, default: () => ({}) },
    includeZeroes: { type: Boolean, default: true },
    variant: { type: String, default: '' },
    ariaLabel: { type: String, default: 'Artifact stat summary' },
    rootClass: { type: [String, Array, Object], default: 'artifact-stat-summary artifact-inventory-stats' },
    rootModifierBase: { type: String, default: 'artifact-stat-summary' },
    chipClass: { type: String, default: 'artifact-inventory-stat-chip' },
    plainChipClass: { type: String, default: 'artifact-inventory-stat-chip--plain' },
    labelClass: { type: String, default: 'artifact-inventory-stat-label' },
    roleGlyphClass: { type: String, default: 'artifact-role-glyph' },
    roleGlyphExtraClass: { type: String, default: 'artifact-role-legend-glyph' },
    roleColorStyleVar: { type: String, default: '--artifact-role-color' },
    roleGlyphInnerTag: { type: String, default: 'span' }
  },
  computed: {
    statSource() {
      return this.source || this.totals || this.artifact?.bonus || null;
    },
    statSummaryItems() {
      const suppliedRows = nonEmptyArray(this.rows);
      const rows = suppliedRows.length
        ? suppliedRows
        : this.statSource
          ? shapeArtifactStatRows(this.statSource, {
            definitions: this.definitions,
            labels: this.labels,
            includeZeroes: this.includeZeroes
          })
          : [];
      const roleMap = plainObject(this.roleMap);
      return rows.map((entry) => {
        const role = entry.role || (entry.roleId ? roleMap[entry.roleId] : null);
        return {
          ...entry,
          role
        };
      });
    },
    summaryClass() {
      return [
        this.rootClass,
        this.variant ? `${this.rootModifierBase}--${this.variant}` : ''
      ].filter(Boolean);
    }
  },
  methods: {
    chipClasses(item) {
      return [
        this.chipClass,
        item.sign ? `${this.chipClass}--${item.sign}` : '',
        { [this.plainChipClass]: !item.role }
      ].filter(Boolean);
    },
    roleGlyphClasses(item) {
      return [
        this.roleGlyphClass,
        this.roleGlyphExtraClass,
        item.roleId ? `${this.roleGlyphClass}--${item.roleId}` : ''
      ].filter(Boolean);
    },
    roleStyle(item) {
      return item.role?.color ? { [this.roleColorStyleVar]: item.role.color } : null;
    },
    itemLabel(item) {
      return item.label ?? item.key ?? item.id ?? '';
    },
    itemText(item) {
      return item.text ?? item.value ?? '';
    }
  },
  template: `
    <span
      v-if="statSummaryItems.length"
      :class="summaryClass"
      :aria-label="ariaLabel"
    >
      <slot name="items" :items="statSummaryItems">
        <span
          v-for="item in statSummaryItems"
          :key="item.id || item.key"
          :class="chipClasses(item)"
          :style="roleStyle(item)"
        >
          <slot name="role" :item="item">
            <span
              v-if="item.role"
              :class="roleGlyphClasses(item)"
              aria-hidden="true"
            ><component :is="roleGlyphInnerTag"></component></span>
          </slot>
          <slot name="label" :item="item">
            <span :class="labelClass">{{ itemLabel(item) }}</span>
          </slot>
          <slot name="value" :item="item">
            <b>{{ itemText(item) }}</b>
          </slot>
        </span>
      </slot>
    </span>
  `
};
