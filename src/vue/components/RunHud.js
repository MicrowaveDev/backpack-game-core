export const RunHud = {
  name: 'RunHud',
  props: {
    player: {
      type: Object,
      default: () => ({})
    },
    labels: {
      type: Object,
      default: () => ({})
    },
    runCurrency: {
      type: Object,
      default: () => ({})
    },
    rootClass: {
      type: [String, Array, Object],
      default: 'run-hud-wrap'
    },
    hudClass: {
      type: [String, Array, Object],
      default: 'run-hud'
    },
    itemClass: {
      type: [String, Array, Object],
      default: 'run-hud-item'
    },
    currencyClass: {
      type: [String, Array, Object],
      default: 'run-hud-item run-hud-currency'
    }
  },
  computed: {
    winsLabel() {
      return this.labels?.wins || 'Wins';
    },
    livesLabel() {
      return this.labels?.lives || 'Lives';
    },
    winsValue() {
      return Number.isFinite(Number(this.player?.wins)) ? Number(this.player.wins) : 0;
    },
    livesValue() {
      const value = this.player?.livesRemaining ?? this.player?.lives;
      return Number.isFinite(Number(value)) ? Number(value) : 0;
    },
    currencyAmount() {
      const value = this.runCurrency?.amount ?? this.player?.runCurrency;
      return Number.isFinite(Number(value)) ? Number(value) : 0;
    },
    currencyParts() {
      return [
        this.runCurrency?.icon || '',
        this.currencyAmount,
        this.runCurrency?.label || ''
      ].filter((part) => part !== '');
    },
    currencyText() {
      return this.currencyParts.join(' ');
    }
  },
  template: `
    <div :class="rootClass || null">
      <div :class="hudClass || null">
        <span :class="itemClass || null">{{ winsLabel }}: {{ winsValue }}</span>
        <span :class="itemClass || null">{{ livesLabel }}: {{ livesValue }}</span>
        <span :class="currencyClass || null">{{ currencyText }}</span>
      </div>
    </div>
  `
};
