export const BackpackInteractionControls = {
  name: 'BackpackInteractionControls',
  props: {
    interaction: { type: Object, required: true },
    labels: { type: Object, required: true },
    nameForItem: { type: Function, default: (item) => item?.artifact?.name || item?.artifactId || '' }
  },
  data() { return { position: { left: '8px', top: '8px' } }; },
  computed: {
    state() { return this.interaction.state; },
    selected() { return this.interaction.getSelectedItem(); },
    menuOpen() { return this.selected && this.state.contextMenuOpen && !this.state.dragVisual; },
    sellPrice() { return this.interaction.getSellPrice?.() ?? null; },
    reason() {
      const code = this.state.messageCode || (this.state.preview?.valid === false ? this.state.preview.reason : this.state.selectedLocked ? 'locked' : '');
      return this.labels.reasons?.[code] || '';
    },
    bagContentsHint() {
      const count = this.state.preview?.affectedIds?.length || 0;
      if (!count) return '';
      const label = this.labels.bagContentsHint;
      return typeof label === 'function' ? label(count) : String(label || '{count} → Storage').replace('{count}', count);
    }
  },
  watch: {
    menuOpen(value) { if (value) this.$nextTick(() => {
      this.positionMenu();
      this.$refs.menu?.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
    }); },
    'state.contextAnchor'() { this.$nextTick(this.positionMenu); }
  },
  mounted() {
    window.addEventListener('resize', this.positionMenu);
    window.addEventListener('scroll', this.positionMenu, true);
    this.$nextTick(this.positionMenu);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.positionMenu);
    window.removeEventListener('scroll', this.positionMenu, true);
  },
  methods: {
    positionMenu() {
      if (!this.menuOpen || !this.$refs.menu) return;
      const rect = this.$refs.menu.getBoundingClientRect();
      const anchor = this.state.contextAnchor || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const width = window.visualViewport?.width || window.innerWidth;
      const height = window.visualViewport?.height || window.innerHeight;
      const topInset = Math.max(8, document.querySelector('.app-header')?.getBoundingClientRect?.().bottom || 0);
      this.position = {
        maxHeight: Math.max(44, height - topInset - 8) + 'px',
        left: Math.max(8, Math.min(anchor.x + (anchor.scrollX || 0) - window.scrollX + 8, width - rect.width - 8)) + 'px',
        top: Math.max(topInset, Math.min(anchor.y + (anchor.scrollY || 0) - window.scrollY + 8, height - rect.height - 8)) + 'px'
      };
    },
    async action(name) {
      this.state.contextMenuOpen = false;
      await this.interaction[name]();
      if (this.selected) this.state.contextMenuOpen = true;
    },
    move() { this.state.contextMenuOpen = false; },
    menuKey(event) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); this.interaction.cancel(); return; }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const buttons = Array.from(this.$refs.menu?.querySelectorAll('button:not(:disabled)') || []);
      const index = buttons.indexOf(event.target);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 :
        (index + (event.key === 'ArrowUp' ? -1 : 1) + buttons.length) % buttons.length;
      buttons[next]?.focus({ preventScroll: true });
    }
  },
  template: `
    <div class="backpack-interaction-controls" data-testid="backpack-interaction-controls">
      <div v-if="menuOpen" ref="menu" class="backpack-interaction-menu" role="menu"
        :style="position" data-testid="backpack-context-menu" :aria-label="nameForItem(selected)" @keydown="menuKey">
        <div class="backpack-context-heading">{{ nameForItem(selected) }}</div>
        <button v-if="!state.selectedLocked" class="backpack-interaction-action" type="button" role="menuitem" data-testid="backpack-move"
          :disabled="interaction.isBusy()" @click="move"><span aria-hidden="true">✥</span>{{ labels.move }}</button>
        <button v-if="!state.selectedLocked" class="backpack-interaction-action" type="button" role="menuitem" data-testid="backpack-rotate"
          :disabled="interaction.isBusy()" @click="action('rotate')"><span aria-hidden="true">↻</span>{{ labels.rotate }}</button>
        <button v-if="!state.selectedLocked" class="backpack-interaction-action" type="button" role="menuitem" data-testid="backpack-storage"
          :disabled="interaction.isBusy()" @click="action('unplace')"><span aria-hidden="true">▣</span>{{ labels.storage }}</button>
        <button v-if="!state.selectedLocked" class="backpack-interaction-action" type="button" role="menuitem" data-testid="backpack-auto-place"
          :disabled="interaction.isBusy()" @click="action('autoPlace')"><span aria-hidden="true">⌖</span>{{ labels.autoPlace }}</button>
        <button v-if="interaction.canSell() && sellPrice != null" class="backpack-interaction-action backpack-context-sell" type="button" role="menuitem" data-testid="backpack-sell"
          :disabled="interaction.isBusy()" @click="action('sell')"><span aria-hidden="true">◉</span>{{ labels.sell }} · {{ sellPrice }}</button>
        <button class="backpack-interaction-action backpack-context-cancel" type="button" role="menuitem" data-testid="backpack-cancel"
          :disabled="interaction.isBusy()" @click="action('cancel')">{{ labels.cancel }}</button>
        <p v-if="reason" class="backpack-context-reason">{{ reason }}</p>
      </div>
      <p v-if="reason || bagContentsHint" class="backpack-interaction-reason" role="status" aria-live="polite" aria-atomic="true"
        data-testid="backpack-placement-reason">{{ reason || bagContentsHint }}</p>
    </div>
  `
};
