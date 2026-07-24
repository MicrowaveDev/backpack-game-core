import { BattleLog } from './BattleLog.js';

function nonEmptyArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function objectOrEmpty(value) {
  return value && typeof value === 'object' ? value : {};
}

export const ReplayScreen = {
  name: 'ReplayScreen',
  components: { BattleLog },
  props: {
    finished: { type: Boolean, default: false },
    resultCollapsed: { type: Boolean, default: false },
    toggleLabel: { type: String, default: '' },
    resultHero: { type: Object, default: null },
    rewardsPanel: { type: Object, default: null },
    battleSummary: { type: Object, default: null },
    continueLabel: { type: String, default: '' },
    logRows: { type: Array, default: () => [] },
    logRootClass: { type: String, default: 'replay-log' },
    logRowClass: { type: String, default: 'log-entry' },
    logActiveClass: { type: String, default: 'active' }
  },
  emits: ['toggle-result', 'go-results', 'select-log-row'],
  computed: {
    rootClasses() {
      return {
        'replay-layout--result-ready': this.finished,
        'replay-layout--result-collapsed': this.finished && this.resultCollapsed
      };
    },
    hero() {
      return objectOrEmpty(this.resultHero);
    },
    heroTone() {
      return this.hero.tone || 'history';
    },
    rewards() {
      return objectOrEmpty(this.rewardsPanel);
    },
    showRewards() {
      return Boolean(this.rewards.visible);
    },
    rewardTone() {
      return this.rewards.tone || 'neutral';
    },
    rewardStats() {
      return nonEmptyArray(this.rewards.stats);
    },
    opponentStats() {
      return nonEmptyArray(this.rewards.opponentStats);
    },
    runStatus() {
      return nonEmptyArray(this.rewards.runStatus);
    },
    summary() {
      return objectOrEmpty(this.battleSummary);
    },
    summaryRows() {
      return nonEmptyArray(this.summary.rows);
    },
    renderedLogRows() {
      return nonEmptyArray(this.logRows);
    }
  },
  methods: {
    emitToggleResult() {
      this.$emit('toggle-result');
    },
    emitGoResults() {
      this.$emit('go-results');
    },
    emitSelectLogRow(payload) {
      this.$emit('select-log-row', payload);
    }
  },
  template: `
    <section class="replay-layout" :class="rootClasses">
      <div class="battle-stage">
        <slot name="battle-stage"></slot>
      </div>
      <section
        v-if="finished"
        class="replay-result-overlay"
        :class="{ 'replay-result-overlay--collapsed': resultCollapsed }"
        aria-live="polite"
      >
        <div class="replay-result-sheet">
          <button
            type="button"
            class="replay-sheet-toggle"
            :aria-label="toggleLabel"
            :aria-expanded="!resultCollapsed"
            @click="emitToggleResult"
          >
            <span class="replay-sheet-grip" aria-hidden="true"></span>
            <span class="replay-sheet-mini-title" aria-hidden="true"></span>
            <svg class="replay-sheet-chevron" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M4 12 L10 6 L16 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <div class="replay-sheet-body">
            <div class="replay-result-hero" :class="'replay-result-hero--' + heroTone">
              <p class="replay-result-kicker">{{ hero.kicker }}</p>
              <h3 data-testid="battle-result">{{ hero.title }}</h3>
              <p v-if="hero.summary" class="replay-result-summary">{{ hero.summary }}</p>
            </div>
            <div
              v-if="showRewards"
              class="panel replay-rewards-card"
              :class="'replay-rewards-card--' + rewardTone"
              :data-testid="rewards.testId || 'replay-rewards'"
            >
              <div class="replay-rewards-header" :class="'replay-rewards-header--' + rewardTone">
                <h3 class="replay-rewards-title" :class="rewards.titleClass || null">
                  {{ rewards.title }}
                </h3>
                <div v-if="rewards.opponentName" class="replay-rewards-opponent">
                  <span class="replay-rewards-vs">
                    {{ rewards.opponentPrefix || 'vs' }} <b>{{ rewards.opponentName }}</b>
                  </span>
                  <div v-if="opponentStats.length" class="replay-rewards-opponent-stats">
                    <span v-for="chip in opponentStats" :key="chip" class="replay-rewards-stat-chip">{{ chip }}</span>
                  </div>
                </div>
              </div>
              <dl class="stat-grid">
                <div
                  v-for="stat in rewardStats"
                  :key="stat.key"
                  class="stat"
                  :class="stat.className || null"
                >
                  <dt>{{ stat.label }} <span v-if="stat.icon" aria-hidden="true">{{ stat.icon }}</span></dt>
                  <dd>{{ stat.value }}</dd>
                </div>
              </dl>
              <div v-if="runStatus.length" class="replay-run-status">
                <span v-for="item in runStatus" :key="item.key" class="replay-run-chip">
                  <span class="replay-run-chip-label">{{ item.label }}</span>
                  <span class="replay-run-chip-value">{{ item.value }}</span>
                </span>
              </div>
            </div>
            <div class="battle-summary-card">
              <p class="battle-summary-title">{{ summary.title }}</p>
              <div class="battle-summary-grid">
                <article
                  v-for="row in summaryRows"
                  :key="row.key || row.side"
                  class="battle-summary-row"
                  :class="row.className || (row.side ? 'battle-summary-row--' + row.side : null)"
                >
                  <strong>{{ row.name }}</strong>
                  <dl>
                    <div v-for="metric in row.metrics" :key="metric.key">
                      <dt>{{ metric.label }}</dt>
                      <dd>{{ metric.value }}</dd>
                    </div>
                  </dl>
                </article>
              </div>
            </div>
            <button class="primary replay-result-button-full" @click="emitGoResults">{{ continueLabel }}</button>
          </div>
        </div>
      </section>
      <battle-log
        v-else
        data-testid="battle-log"
        :rows="renderedLogRows"
        :root-class="logRootClass"
        :row-class="logRowClass"
        :active-class="logActiveClass"
        selectable
        @select="emitSelectLogRow"
      />
    </section>
  `
};
