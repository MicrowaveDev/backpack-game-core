export const BackpackInteractionControls = {
  name: 'BackpackInteractionControls',
  props: {
    interaction: { type: Object, required: true },
    labels: { type: Object, required: true }
  },
  computed: {
    state() { return this.interaction.state; },
    selected() { return this.interaction.getSelectedItem(); },
    reason() {
      const code = this.state.messageCode || (this.state.preview?.valid === false ? this.state.preview.reason : '');
      return this.labels.reasons?.[code] || '';
    }
  },
  template: `
    <div class="backpack-interaction-controls" data-testid="backpack-interaction-controls">
      <button class="backpack-interaction-action" type="button" data-testid="backpack-bag-mode"
        :aria-pressed="state.bagMode" :disabled="interaction.isBusy()" @click="interaction.toggleBagMode()">{{ labels.bagMode }}</button>
      <template v-if="selected">
        <button class="backpack-interaction-action" type="button" data-testid="backpack-rotate"
          :disabled="interaction.isBusy()" @click="interaction.rotate()">{{ labels.rotate }}</button>
        <button class="backpack-interaction-action" type="button" data-testid="backpack-storage"
          :disabled="interaction.isBusy()" @click="interaction.unplace()">{{ labels.storage }}</button>
        <button class="backpack-interaction-action" type="button" data-testid="backpack-auto-place"
          :disabled="interaction.isBusy()" @click="interaction.autoPlace()">{{ labels.autoPlace }}</button>
        <button v-if="interaction.canSell()" class="backpack-interaction-action" type="button" data-testid="backpack-sell"
          :disabled="interaction.isBusy()" @click="interaction.sell()">{{ labels.sell }}</button>
        <button class="backpack-interaction-action" type="button" data-testid="backpack-cancel"
          :disabled="interaction.isBusy()" @click="interaction.cancel()">{{ labels.cancel }}</button>
      </template>
      <p class="backpack-interaction-hint">{{ state.bagMode ? labels.bagModeHint : labels.selectHint }}</p>
      <p class="backpack-interaction-reason" role="status" aria-live="polite" aria-atomic="true"
        data-testid="backpack-placement-reason">{{ reason }}</p>
    </div>
  `
};
