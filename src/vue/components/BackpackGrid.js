function array(value) {
  return Array.isArray(value) ? value : [];
}

export const BackpackGrid = {
  name: 'BackpackGrid',
  props: {
    cells: { type: Array, default: () => [] },
    pieces: { type: Array, default: () => [] },
    overlays: { type: Array, default: () => [] },
    gridStyle: { type: Object, default: () => ({}) },
    as: { type: String, default: 'div' },
    layerTag: { type: String, default: 'div' },
    cellTag: { type: String, default: 'span' },
    interactiveCellTag: { type: String, default: 'button' },
    pieceRootTag: { type: String, default: 'div' },
    pieceActionTag: { type: String, default: 'div' },
    clickablePieceTag: { type: String, default: 'button' },
    rotateTag: { type: String, default: 'button' },
    rootClass: { type: [String, Array, Object], default: 'artifact-grid-board' },
    backgroundClass: { type: [String, Array, Object], default: 'artifact-grid-background' },
    piecesClass: { type: [String, Array, Object], default: 'artifact-grid-pieces' },
    overlayClass: { type: [String, Array, Object], default: 'artifact-grid-bag-watermark' },
    rotateClass: { type: [String, Array, Object], default: 'artifact-piece-rotate' },
    testId: { type: String, default: '' },
    interactiveCells: { type: Boolean, default: false },
    clickablePieces: { type: Boolean, default: false },
    rotatablePieces: { type: Boolean, default: false },
    draggablePieces: { type: Boolean, default: false },
    droppable: { type: Boolean, default: false },
    rotateLabel: { type: String, default: 'Rotate' },
    rotateText: { type: String, default: 'Rotate' }
  },
  emits: [
    'cell-click',
    'cell-dragover',
    'cell-dragleave',
    'cell-drop',
    'cell-touch-drop',
    'piece-click',
    'piece-rotate',
    'piece-drag-start',
    'piece-drag-end'
  ],
  computed: {
    renderedCells() {
      return array(this.cells);
    },
    renderedPieces() {
      return array(this.pieces);
    },
    renderedOverlays() {
      return array(this.overlays);
    }
  },
  methods: {
    cellComponent(cell) {
      return this.interactiveCells || cell?.interactive
        ? this.interactiveCellTag
        : this.cellTag;
    },
    pieceActionComponent() {
      return this.clickablePieces ? this.clickablePieceTag : this.pieceActionTag;
    },
    emitCellClick(cell) {
      if (this.interactiveCells || cell?.interactive) this.$emit('cell-click', cell);
    },
    emitCellDragOver(cell, event) {
      if (this.droppable || cell?.dropTarget) {
        this.$emit('cell-dragover', { cell, event });
      }
    },
    emitCellDragLeave(cell) {
      this.$emit('cell-dragleave', cell);
    },
    emitCellDrop(cell, event) {
      if (this.droppable || cell?.dropTarget) this.$emit('cell-drop', { cell, event });
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
    },
    emitPieceDragStart(piece, event) {
      if (this.draggablePieces) this.$emit('piece-drag-start', { piece, event });
    },
    emitPieceDragEnd(piece, event) {
      if (this.draggablePieces) this.$emit('piece-drag-end', { piece, event });
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
            :draggable="draggablePieces"
            v-bind="piece.attrs || {}"
            @dragstart="emitPieceDragStart(piece, $event)"
            @dragend="emitPieceDragEnd(piece, $event)"
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
