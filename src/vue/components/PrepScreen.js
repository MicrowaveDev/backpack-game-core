export const PrepScreen = {
  name: 'PrepScreen',
  props: {
    ready: { type: Boolean, default: false },
    roundLabel: { type: String, default: '' },
    roundNumber: { type: [Number, String], default: '' },
    showReconnecting: { type: Boolean, default: false },
    reconnectingText: { type: String, default: '' },
    rootClass: {
      type: [String, Array, Object],
      default: 'prep-screen'
    },
    readyTestId: {
      type: String,
      default: 'prep-ready'
    },
    reconnectingTestId: {
      type: String,
      default: 'sse-reconnecting'
    }
  },
  computed: {
    testId() {
      return this.ready ? this.readyTestId : null;
    },
    headingText() {
      return [this.roundLabel, this.roundNumber].filter((part) => part !== '' && part != null).join(' ');
    }
  },
  template: `
    <section :class="rootClass || null" :data-testid="testId">
      <div class="prep-topbar">
        <slot name="heading" :text="headingText" :round-label="roundLabel" :round-number="roundNumber">
          <h2 v-if="headingText" class="run-round-heading">{{ headingText }}</h2>
        </slot>
        <slot name="hud"></slot>
      </div>

      <div class="prep-workspace">
        <div class="prep-loadout-column">
          <slot name="loadout"></slot>
        </div>
        <slot name="shop"></slot>
      </div>

      <slot name="reconnecting" :visible="showReconnecting" :text="reconnectingText">
        <div v-if="showReconnecting" class="prep-reconnecting" :data-testid="reconnectingTestId">
          {{ reconnectingText }}
        </div>
      </slot>

      <slot name="actions"></slot>
      <slot name="overlay"></slot>
    </section>
  `
};
