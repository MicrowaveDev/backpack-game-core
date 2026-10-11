export const BackpackSaleAction = {
  name: 'BackpackSaleAction',
  props: {
    interaction: { type: Object, required: true },
    labels: { type: Object, required: true }
  },
  computed: {
    state() { return this.interaction.state; },
    selected() { return this.interaction.getSelectedItem(); },
    sellPrice() { return this.interaction.getSellPrice?.() ?? null; },
    visible() { return this.selected && this.interaction.canSell() && this.sellPrice != null; }
  },
  template: `
    <div class="backpack-sale-slot">
      <button v-if="visible" type="button" class="backpack-interaction-action backpack-sale-action"
        data-backpack-context-action="sell"
        :data-backpack-drop-zone="state.dragVisual ? 'sell' : null"
        :data-testid="state.dragVisual ? 'backpack-sell-drop-zone' : 'backpack-sell'"
        :class="{ 'backpack-interaction-drop-active': state.dropTarget === 'sell' }"
        :disabled="interaction.isBusy()"
        @click="interaction.sell()">{{ labels.sell }} · {{ sellPrice }}</button>
    </div>
  `
};
