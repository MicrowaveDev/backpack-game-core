export const PrepActions = {
  name: 'PrepActions',
  props: {
    showOpponentStatus: {
      type: Boolean,
      default: false
    },
    opponentReady: {
      type: Boolean,
      default: false
    },
    actionInFlight: {
      type: Boolean,
      default: false
    },
    labels: {
      type: Object,
      default: () => ({})
    },
    rootClass: {
      type: [String, Array, Object],
      default: 'prep-actions'
    },
    opponentStatusClass: {
      type: [String, Array, Object],
      default: 'prep-opponent-status'
    },
    opponentReadyClass: {
      type: [String, Array, Object],
      default: 'prep-opponent-ready'
    },
    opponentWaitingClass: {
      type: [String, Array, Object],
      default: 'prep-opponent-waiting'
    },
    primaryClass: {
      type: [String, Array, Object],
      default: 'primary prep-ready-btn'
    },
    secondaryClass: {
      type: [String, Array, Object],
      default: 'ghost'
    }
  },
  emits: ['ready', 'abandon', 'primary-action', 'secondary-action'],
  computed: {
    readyLabel() {
      return this.labels?.ready || 'Ready';
    },
    readyingLabel() {
      return this.labels?.readying || this.readyLabel;
    },
    abandonLabel() {
      return this.labels?.abandon || 'Abandon';
    },
    opponentReadyLabel() {
      return this.labels?.opponentReady || 'Opponent ready';
    },
    opponentWaitingLabel() {
      return this.labels?.opponentWaiting || 'Waiting for opponent';
    },
    primaryText() {
      return this.actionInFlight ? this.readyingLabel : this.readyLabel;
    },
    opponentText() {
      return this.opponentReady ? this.opponentReadyLabel : this.opponentWaitingLabel;
    },
    opponentClass() {
      return this.opponentReady ? this.opponentReadyClass : this.opponentWaitingClass;
    }
  },
  methods: {
    emitReady() {
      this.$emit('ready');
      this.$emit('primary-action');
    },
    emitAbandon() {
      this.$emit('abandon');
      this.$emit('secondary-action');
    }
  },
  template: `
    <div :class="rootClass || null">
      <div v-if="showOpponentStatus" :class="opponentStatusClass || null">
        <span :class="opponentClass || null">{{ opponentText }}</span>
      </div>
      <button type="button" :class="primaryClass || null" :disabled="actionInFlight" @click="emitReady">{{ primaryText }}</button>
      <button type="button" :class="secondaryClass || null" @click="emitAbandon">{{ abandonLabel }}</button>
    </div>
  `
};
