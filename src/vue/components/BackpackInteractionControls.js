export const BackpackInteractionControls = {
  name: 'BackpackInteractionControls',
  props: {
    interaction: { type: Object, required: true },
    labels: { type: Object, required: true }
  },
  data() { return { menuOpen: false }; },
  computed: {
    state() { return this.interaction.state; },
    selected() { return this.interaction.getSelectedItem(); },
    sellPrice() { return this.interaction.getSellPrice?.() ?? null; },
    reason() {
      const code = this.state.messageCode || (this.state.preview?.valid === false ? this.state.preview.reason : '');
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
    'state.selectedId'() { this.menuOpen = false; },
    'state.dragVisual'(value) { if (value) this.menuOpen = false; }
  },
  methods: {
    async action(name) {
      this.menuOpen = false;
      await this.interaction[name]();
    },
    async toggleMenu() {
      this.menuOpen = !this.menuOpen;
      if (this.menuOpen) {
        await this.$nextTick();
        this.$refs.menu?.querySelector('button:not(:disabled)')?.focus();
      }
    },
    closeMenu() { this.menuOpen = false; this.$refs.more?.focus(); },
    menuKey(event) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); this.closeMenu(); return; }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const buttons = Array.from(this.$refs.menu?.querySelectorAll('button:not(:disabled)') || []);
      const index = buttons.indexOf(event.target);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 :
        (index + (event.key === 'ArrowUp' ? -1 : 1) + buttons.length) % buttons.length;
      buttons[next]?.focus();
    },
    menuBlur(event) {
      // Touch browsers may report null while focus transfers before the click.
      // Outside taps cancel selection in the controller; keyboard focus has a target.
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) this.menuOpen = false;
    }
  },
  template: `
    <div class="backpack-interaction-controls" data-testid="backpack-interaction-controls">
      <div class="backpack-interaction-rail">
        <div v-if="state.dragVisual && interaction.canSell() && sellPrice != null"
          class="backpack-interaction-sell-target" :class="{ 'backpack-interaction-drop-active': state.dropTarget === 'sell' }"
          data-backpack-drop-zone="sell" data-testid="backpack-sell-drop-zone">
          {{ labels.sell }} · {{ sellPrice }}
        </div>
        <div class="backpack-interaction-item-actions" :class="{ 'backpack-interaction-item-actions--hidden': !selected }"
          :inert="!selected ? true : null" :aria-hidden="!selected">
          <button class="backpack-interaction-action backpack-interaction-icon" type="button" data-testid="backpack-rotate"
            :aria-label="labels.rotate" :title="labels.rotate" :disabled="!selected || interaction.isBusy()"
            @click="action('rotate')">↻</button>
          <button ref="more" class="backpack-interaction-action backpack-interaction-icon" type="button" data-testid="backpack-more"
            aria-haspopup="menu" :aria-expanded="menuOpen" :aria-label="labels.more || '…'"
            :disabled="!selected || interaction.isBusy()" @click="toggleMenu()">⋯</button>
        </div>
        <div v-if="menuOpen && selected" ref="menu" class="backpack-interaction-menu" role="menu"
          data-testid="backpack-context-menu" :aria-label="labels.more || '…'" @keydown="menuKey" @focusout="menuBlur">
          <button class="backpack-interaction-action" type="button" role="menuitem" data-testid="backpack-storage"
            :disabled="interaction.isBusy()" @click="action('unplace')">{{ labels.storage }}</button>
          <button class="backpack-interaction-action" type="button" role="menuitem" data-testid="backpack-auto-place"
            :disabled="interaction.isBusy()" @click="action('autoPlace')">{{ labels.autoPlace }}</button>
          <button v-if="interaction.canSell()" class="backpack-interaction-action" type="button" role="menuitem" data-testid="backpack-sell"
            :disabled="interaction.isBusy()" @click="action('sell')">{{ labels.sell }}<template v-if="sellPrice != null"> · {{ sellPrice }}</template></button>
          <button class="backpack-interaction-action" type="button" role="menuitem" data-testid="backpack-cancel"
            :disabled="interaction.isBusy()" @click="action('cancel')">{{ labels.cancel }}</button>
        </div>
      </div>
      <p class="backpack-interaction-reason" role="status" aria-live="polite" aria-atomic="true"
        data-testid="backpack-placement-reason">{{ reason || bagContentsHint }}</p>
    </div>
  `
};
