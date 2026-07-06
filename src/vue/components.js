function nonEmptyArray(value) {
  return Array.isArray(value) ? value : [];
}

export { AchievementBadge } from './components/AchievementBadge.js';
export { ArtifactStatSummary } from './components/ArtifactStatSummary.js';
export { FighterCard } from './components/FighterCard.js';
export { SeasonRankEmblem } from './components/SeasonRankEmblem.js';

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

export const ShopItemRow = {
  name: 'ShopItemRow',
  props: {
    row: {
      type: Object,
      default: null
    },
    as: {
      type: String,
      default: 'div'
    },
    headerTag: {
      type: String,
      default: 'div'
    },
    nameTag: {
      type: String,
      default: 'strong'
    },
    priceTag: {
      type: String,
      default: 'span'
    },
    visualTag: {
      type: String,
      default: 'div'
    },
    descriptionTag: {
      type: String,
      default: 'p'
    },
    tagsTag: {
      type: String,
      default: 'div'
    },
    tagTag: {
      type: String,
      default: 'span'
    },
    itemClass: {
      type: [String, Array, Object],
      default: 'shop-item'
    },
    rowClass: {
      type: [String, Array, Object],
      default: ''
    },
    headerClass: {
      type: [String, Array, Object],
      default: 'shop-item-header'
    },
    nameClass: {
      type: [String, Array, Object],
      default: 'shop-item-name'
    },
    priceClass: {
      type: [String, Array, Object],
      default: 'shop-item-price'
    },
    visualClass: {
      type: [String, Array, Object],
      default: 'shop-item-visual'
    },
    descriptionClass: {
      type: [String, Array, Object],
      default: 'shop-item-description'
    },
    tagsClass: {
      type: [String, Array, Object],
      default: 'shop-item-tags'
    },
    tagClass: {
      type: [String, Array, Object],
      default: 'artifact-stat-chip'
    },
    characterTagClass: {
      type: [String, Array, Object],
      default: 'artifact-stat-chip--character'
    },
    bagTagClass: {
      type: [String, Array, Object],
      default: 'artifact-stat-chip--bag'
    },
    positiveTagClass: {
      type: [String, Array, Object],
      default: 'artifact-stat-chip--pos'
    },
    negativeTagClass: {
      type: [String, Array, Object],
      default: 'artifact-stat-chip--neg'
    },
    pricePrefix: {
      type: String,
      default: ''
    },
    characterItemLabel: {
      type: String,
      default: 'Character'
    },
    bagSlotsLabel: {
      type: String,
      default: 'slots'
    },
    itemAttrs: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['buy', 'select'],
  computed: {
    visible() {
      return Boolean(this.row);
    },
    itemClasses() {
      return [this.itemClass, this.rowClass].filter(Boolean);
    },
    renderedStats() {
      return nonEmptyArray(this.row?.statRows);
    },
    previewWidth() {
      return this.row?.previewOrientation?.width || 1;
    },
    previewHeight() {
      return this.row?.previewOrientation?.height || 1;
    }
  },
  methods: {
    emitBuy() {
      if (!this.row) return;
      this.$emit('buy', this.row);
      this.$emit('select', this.row);
    },
    statText(stat) {
      if (!stat) return '';
      return stat.text ?? stat.value ?? '';
    },
    statClass(stat) {
      return [
        this.tagClass,
        stat?.positive ? this.positiveTagClass : this.negativeTagClass
      ].filter(Boolean);
    }
  },
  template: `
    <component
      v-if="visible"
      :is="as"
      :class="itemClasses"
      :data-artifact-draggable="row.canAfford ? 'true' : 'false'"
      :data-artifact-id="row.artifactId || null"
      :data-artifact-width="previewWidth"
      :data-artifact-height="previewHeight"
      v-bind="itemAttrs"
      @click="emitBuy"
    >
      <slot name="header" :row="row">
        <component :is="headerTag" :class="headerClass || null">
          <component :is="nameTag" :class="nameClass || null">{{ row.name || row.artifactId }}</component>
          <component :is="priceTag" :class="priceClass || null">{{ pricePrefix }}{{ row.price }}</component>
        </component>
      </slot>
      <slot name="visual" :row="row" :orientation="row.previewOrientation" :items="row.previewItem">
        <component :is="visualTag" :class="visualClass || null"></component>
      </slot>
      <slot name="description" :row="row">
        <component
          v-if="row.description"
          :is="descriptionTag"
          :class="descriptionClass || null"
        >{{ row.description }}</component>
      </slot>
      <slot name="tags" :row="row" :stats="renderedStats">
        <component :is="tagsTag" :class="tagsClass || null">
          <component
            v-if="row.characterItem"
            :is="tagTag"
            :class="[tagClass, characterTagClass]"
          >{{ characterItemLabel }}</component>
          <component
            v-if="row.isBag"
            :is="tagTag"
            :class="[tagClass, bagTagClass]"
          >{{ row.slotCount }} {{ bagSlotsLabel }}</component>
          <component
            v-for="stat in renderedStats"
            :key="stat.key"
            :is="tagTag"
            :class="statClass(stat)"
          >{{ stat.label }} {{ statText(stat) }}</component>
        </component>
      </slot>
      <slot :row="row"></slot>
    </component>
  `
};

export const ShopItemList = {
  name: 'ShopItemList',
  components: {
    ShopItemRow
  },
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
    listClass: {
      type: [String, Array, Object],
      default: 'artifact-shop-items'
    },
    itemClass: {
      type: [String, Array, Object],
      default: 'shop-item'
    },
    rowClass: {
      type: [String, Array, Object, Function],
      default: ''
    },
    itemAttrs: {
      type: Function,
      default: null
    },
    pricePrefix: {
      type: String,
      default: ''
    },
    characterItemLabel: {
      type: String,
      default: 'Character'
    },
    bagSlotsLabel: {
      type: String,
      default: 'slots'
    }
  },
  emits: ['buy', 'select'],
  computed: {
    renderedRows() {
      return nonEmptyArray(this.rows);
    }
  },
  methods: {
    classFor(row) {
      return typeof this.rowClass === 'function' ? this.rowClass(row) : this.rowClass;
    },
    attrsFor(row) {
      return typeof this.itemAttrs === 'function' ? (this.itemAttrs(row) || {}) : {};
    },
    emitBuy(row) {
      if (!row) return;
      this.$emit('buy', row);
      this.$emit('select', row);
    }
  },
  template: `
    <component
      v-if="renderedRows.length"
      :is="as"
      :class="listClass || null"
    >
      <ShopItemRow
        v-for="row in renderedRows"
        :key="row.id || row.artifactId || row.index"
        :row="row"
        :as="rowTag"
        :item-class="itemClass"
        :row-class="classFor(row)"
        :item-attrs="attrsFor(row)"
        :price-prefix="pricePrefix"
        :character-item-label="characterItemLabel"
        :bag-slots-label="bagSlotsLabel"
        @buy="emitBuy"
      >
        <template #visual="slotProps">
          <slot name="visual" v-bind="slotProps">
            <component :is="'div'" class="shop-item-visual"></component>
          </slot>
        </template>
      </ShopItemRow>
    </component>
  `
};

export const BackpackGrid = {
  name: 'BackpackGrid',
  props: {
    cells: {
      type: Array,
      default: () => []
    },
    pieces: {
      type: Array,
      default: () => []
    },
    overlays: {
      type: Array,
      default: () => []
    },
    gridStyle: {
      type: Object,
      default: () => ({})
    },
    as: {
      type: String,
      default: 'div'
    },
    layerTag: {
      type: String,
      default: 'div'
    },
    cellTag: {
      type: String,
      default: 'span'
    },
    interactiveCellTag: {
      type: String,
      default: 'button'
    },
    pieceRootTag: {
      type: String,
      default: 'div'
    },
    pieceActionTag: {
      type: String,
      default: 'div'
    },
    clickablePieceTag: {
      type: String,
      default: 'button'
    },
    rotateTag: {
      type: String,
      default: 'button'
    },
    rootClass: {
      type: [String, Array, Object],
      default: 'artifact-grid-board'
    },
    backgroundClass: {
      type: [String, Array, Object],
      default: 'artifact-grid-background'
    },
    piecesClass: {
      type: [String, Array, Object],
      default: 'artifact-grid-pieces'
    },
    overlayClass: {
      type: [String, Array, Object],
      default: 'artifact-grid-bag-watermark'
    },
    rotateClass: {
      type: [String, Array, Object],
      default: 'artifact-piece-rotate'
    },
    testId: {
      type: String,
      default: ''
    },
    interactiveCells: {
      type: Boolean,
      default: false
    },
    clickablePieces: {
      type: Boolean,
      default: false
    },
    rotatablePieces: {
      type: Boolean,
      default: false
    },
    droppable: {
      type: Boolean,
      default: false
    },
    rotateLabel: {
      type: String,
      default: 'Rotate'
    },
    rotateText: {
      type: String,
      default: 'Rotate'
    }
  },
  emits: [
    'cell-click',
    'cell-dragover',
    'cell-dragleave',
    'cell-drop',
    'cell-touch-drop',
    'piece-click',
    'piece-rotate'
  ],
  computed: {
    renderedCells() {
      return nonEmptyArray(this.cells);
    },
    renderedPieces() {
      return nonEmptyArray(this.pieces);
    },
    renderedOverlays() {
      return nonEmptyArray(this.overlays);
    }
  },
  methods: {
    cellComponent(cell) {
      return this.interactiveCells || cell?.interactive ? this.interactiveCellTag : this.cellTag;
    },
    pieceActionComponent() {
      return this.clickablePieces ? this.clickablePieceTag : this.pieceActionTag;
    },
    emitCellClick(cell) {
      if (!this.interactiveCells && !cell?.interactive) return;
      this.$emit('cell-click', cell);
    },
    emitCellDragOver(cell, event) {
      if (!this.droppable && !cell?.dropTarget) return;
      this.$emit('cell-dragover', { cell, event });
    },
    emitCellDragLeave(cell) {
      this.$emit('cell-dragleave', cell);
    },
    emitCellDrop(cell, event) {
      if (!this.droppable && !cell?.dropTarget) return;
      this.$emit('cell-drop', { cell, event });
    },
    emitCellTouchDrop(cell, event) {
      this.$emit('cell-touch-drop', { cell, event });
    },
    emitPieceClick(piece, event) {
      if (!this.clickablePieces) return;
      event?.stopPropagation?.();
      this.$emit('piece-click', { piece, event });
    },
    emitPieceRotate(piece, event) {
      event?.stopPropagation?.();
      this.$emit('piece-rotate', { piece, event });
    }
  },
  template: `
    <component :is="as" :class="rootClass || null" :data-testid="testId || null">
      <component :is="layerTag" :class="backgroundClass || null" :style="gridStyle || null">
        <slot name="overlays" :overlays="renderedOverlays">
          <slot
            v-for="overlay in renderedOverlays"
            name="overlay"
            :key="'overlay:' + overlay.key"
            :overlay="overlay"
          >
            <span
              :class="overlay.className || overlay.classNames || overlayClass || null"
              :style="overlay.style || null"
              v-bind="overlay.attrs || {}"
              aria-hidden="true"
            ></span>
          </slot>
        </slot>
        <slot name="cells" :cells="renderedCells">
          <slot
            v-for="cell in renderedCells"
            name="cell"
            :key="'cell:' + cell.key"
            :cell="cell"
          >
            <component
              :is="cell.as || cellComponent(cell)"
              :class="cell.className || cell.classNames || null"
              :style="cell.style || null"
              v-bind="cell.attrs || {}"
              @click="emitCellClick(cell)"
              @dragover="emitCellDragOver(cell, $event)"
              @dragleave="emitCellDragLeave(cell)"
              @drop="emitCellDrop(cell, $event)"
              @cell-drop-touch="emitCellTouchDrop(cell, $event)"
            ></component>
          </slot>
        </slot>
      </component>
      <component :is="layerTag" :class="piecesClass || null" :style="gridStyle || null">
        <slot name="pieces" :pieces="renderedPieces">
          <component
            v-for="piece in renderedPieces"
            :key="piece.key"
            :is="pieceRootTag"
            :class="piece.className || piece.classNames || null"
            :style="piece.style || null"
            :title="piece.title || null"
            v-bind="piece.attrs || {}"
          >
            <slot name="piece" :piece="piece">
              <component
                :is="piece.actionAs || pieceActionComponent()"
                :class="piece.actionClass || null"
                :data-artifact-id="piece.artifactId || null"
                :aria-label="piece.ariaLabel || null"
                @click="emitPieceClick(piece, $event)"
              >
                <slot name="piece-content" :piece="piece"></slot>
              </component>
              <slot name="rotate-control" :piece="piece" :rotate="emitPieceRotate">
                <component
                  v-if="rotatablePieces && piece.canRotate"
                  :is="rotateTag"
                  :class="rotateClass || null"
                  type="button"
                  :aria-label="rotateLabel"
                  @click="emitPieceRotate(piece, $event)"
                >{{ rotateText }}</component>
              </slot>
            </slot>
          </component>
        </slot>
      </component>
    </component>
  `
};

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
