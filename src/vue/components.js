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

export const ArtifactTile = {
  name: 'ArtifactTile',
  props: {
    tile: {
      type: Object,
      default: null
    },
    as: {
      type: String,
      default: 'div'
    },
    cellTag: {
      type: String,
      default: 'div'
    },
    imageTag: {
      type: String,
      default: 'span'
    },
    roleGlyphTag: {
      type: String,
      default: 'span'
    },
    roleGlyphInnerTag: {
      type: String,
      default: 'span'
    },
    rootClass: {
      type: [String, Array, Object],
      default: 'artifact-figure-grid'
    },
    roleGlyphExtraClass: {
      type: [String, Array, Object],
      default: ''
    },
    showImage: {
      type: Boolean,
      default: true
    },
    showRoleGlyph: {
      type: Boolean,
      default: true
    }
  },
  computed: {
    visible() {
      return Boolean(this.tile);
    },
    renderedCells() {
      return nonEmptyArray(this.tile?.cells);
    },
    rootClasses() {
      return [this.rootClass, ...nonEmptyArray(this.tile?.cssClasses)].filter(Boolean);
    },
    imageClasses() {
      return nonEmptyArray(this.tile?.imageClassNames);
    },
    roleGlyphClasses() {
      return [
        ...nonEmptyArray(this.tile?.roleGlyph?.classNames),
        this.roleGlyphExtraClass
      ].filter(Boolean);
    },
    roleGlyphLabel() {
      return this.tile?.roleGlyph?.label || null;
    }
  },
  template: `
    <component
      v-if="visible"
      :is="as"
      :class="rootClasses"
      :style="tile.gridStyle || null"
      :data-artifact-id="tile.dataset?.artifactId || tile.id || null"
      :data-artifact-family="tile.dataset?.family || tile.family || null"
      :data-artifact-role="tile.dataset?.role || tile.roleId || null"
      :data-artifact-shine="tile.dataset?.shine || tile.shineId || null"
      :data-artifact-width="tile.dataset?.width || tile.width || null"
      :data-artifact-height="tile.dataset?.height || tile.height || null"
    >
      <slot name="cells" :tile="tile" :cells="renderedCells">
        <component
          v-for="cell in renderedCells"
          :key="cell.key"
          :is="cellTag"
          :class="cell.className || cell.classNames || null"
        />
      </slot>
      <slot name="image" :tile="tile" :classes="imageClasses">
        <component
          v-if="showImage"
          :is="imageTag"
          :class="imageClasses"
          :style="tile.imageStyle || null"
          aria-hidden="true"
        />
      </slot>
      <slot name="role-glyph" :tile="tile" :classes="roleGlyphClasses" :label="roleGlyphLabel">
        <component
          v-if="showRoleGlyph && tile.roleGlyph"
          :is="roleGlyphTag"
          :class="roleGlyphClasses"
          :aria-label="roleGlyphLabel"
          :title="roleGlyphLabel"
        >
          <slot name="role-glyph-icon" :tile="tile">
            <component :is="roleGlyphInnerTag" aria-hidden="true" />
          </slot>
        </component>
      </slot>
      <slot :tile="tile" :cells="renderedCells"></slot>
    </component>
  `
};

function actionEventName(action) {
  const kind = String(action?.kind || '');
  return ['roll', 'burn', 'select', 'buy', 'place', 'remove', 'open'].includes(kind)
    ? kind
    : '';
}

export const GachaPackCard = {
  name: 'GachaPackCard',
  props: {
    pack: {
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
    },
    actionsTag: {
      type: String,
      default: 'span'
    },
    actionTag: {
      type: String,
      default: 'button'
    },
    actionButtonType: {
      type: String,
      default: 'button'
    },
    cardClass: {
      type: [String, Array, Object],
      default: ''
    },
    actionsClass: {
      type: [String, Array, Object],
      default: ''
    },
    actionClass: {
      type: [String, Array, Object],
      default: ''
    }
  },
  emits: ['action', 'roll', 'burn', 'select', 'buy', 'place', 'remove', 'open'],
  computed: {
    visible() {
      return Boolean(this.pack);
    },
    renderedLines() {
      return nonEmptyArray(this.pack?.lines);
    },
    renderedActions() {
      return nonEmptyArray(this.pack?.actions);
    }
  },
  methods: {
    emitAction(action) {
      if (!action) return;
      this.$emit('action', action);
      const eventName = actionEventName(action);
      if (eventName) this.$emit(eventName, action);
    },
    actionType() {
      return this.actionTag === 'button' ? this.actionButtonType : null;
    }
  },
  template: `
    <component
      v-if="visible"
      :is="as"
      :class="cardClass || null"
      :data-pack-id="pack.id || null"
    >
      <slot name="title" :pack="pack">
        <component :is="titleTag" v-if="pack.title">{{ pack.title }}</component>
      </slot>
      <template v-for="line in renderedLines" :key="line.key">
        <slot name="line" :pack="pack" :line="line">
          <span>{{ line.text }}</span>
        </slot>
      </template>
      <slot name="actions" :pack="pack" :actions="renderedActions" :emit-action="emitAction">
        <component
          v-if="renderedActions.length"
          :is="actionsTag"
          :class="actionsClass || null"
        >
          <slot
            v-for="action in renderedActions"
            name="action"
            :key="action.key"
            :pack="pack"
            :action="action"
            :emit-action="emitAction"
          >
            <component
              :is="actionTag"
              :class="actionClass || null"
              :type="actionType()"
              :disabled="action.disabled || null"
              @click="emitAction(action)"
            >
              {{ action.label }}
            </component>
          </slot>
        </component>
      </slot>
      <slot :pack="pack" :lines="renderedLines" :actions="renderedActions"></slot>
    </component>
  `
};

export const GachaPackCardList = {
  name: 'GachaPackCardList',
  components: {
    GachaPackCard
  },
  props: {
    packs: {
      type: Array,
      default: () => []
    },
    as: {
      type: String,
      default: 'div'
    },
    cardTag: {
      type: String,
      default: 'div'
    },
    titleTag: {
      type: String,
      default: 'strong'
    },
    actionsTag: {
      type: String,
      default: 'span'
    },
    actionTag: {
      type: String,
      default: 'button'
    },
    actionButtonType: {
      type: String,
      default: 'button'
    },
    listClass: {
      type: [String, Array, Object],
      default: ''
    },
    cardClass: {
      type: [String, Array, Object],
      default: ''
    },
    actionsClass: {
      type: [String, Array, Object],
      default: ''
    },
    actionClass: {
      type: [String, Array, Object],
      default: ''
    }
  },
  emits: ['action', 'roll', 'burn', 'select', 'buy', 'place', 'remove', 'open'],
  computed: {
    renderedPacks() {
      return nonEmptyArray(this.packs);
    }
  },
  methods: {
    emitAction(action) {
      if (!action) return;
      this.$emit('action', action);
      const eventName = actionEventName(action);
      if (eventName) this.$emit(eventName, action);
    }
  },
  template: `
    <component
      v-if="renderedPacks.length"
      :is="as"
      :class="listClass || null"
    >
      <GachaPackCard
        v-for="(pack, packIndex) in renderedPacks"
        :key="pack.key || pack.id || packIndex"
        :pack="pack"
        :as="cardTag"
        :title-tag="titleTag"
        :actions-tag="actionsTag"
        :action-tag="actionTag"
        :action-button-type="actionButtonType"
        :card-class="cardClass"
        :actions-class="actionsClass"
        :action-class="actionClass"
        @action="emitAction"
      />
    </component>
  `
};
