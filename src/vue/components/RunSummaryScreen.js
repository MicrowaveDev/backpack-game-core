export const RunSummaryScreen = {
  name: 'RunSummaryScreen',
  props: {
    summary: {
      type: Object,
      default: null
    }
  },
  emits: ['home', 'open-round'],
  computed: {
    stats() {
      return Array.isArray(this.summary?.stats) ? this.summary.stats : [];
    },
    rounds() {
      return Array.isArray(this.summary?.rounds) ? this.summary.rounds : [];
    }
  },
  template: `
    <section class="run-complete-screen" data-testid="run-summary">
      <div class="panel run-complete-card" v-if="summary">
        <h2>{{ summary.title }}</h2>
        <div class="run-summary-header" v-if="summary.character">
          <img
            v-if="summary.character.imageSrc"
            :src="summary.character.imageSrc"
            :alt="summary.character.imageAlt || summary.character.name"
            class="run-summary-portrait"
            :style="summary.character.imageStyle || null"
          />
          <div>
            <strong>{{ summary.character.name }}</strong>
            <p class="run-end-reason" :class="'run-summary-outcome--' + summary.outcome.key">
              {{ summary.outcome.label }}
            </p>
          </div>
        </div>
        <dl class="stat-grid">
          <div v-for="stat in stats" :key="stat.key" class="stat">
            <dt>{{ stat.label }}</dt>
            <dd>{{ stat.value }}</dd>
          </div>
        </dl>

        <div v-if="rounds.length" class="run-summary-rounds">
          <h3>{{ summary.roundsTitle }}</h3>
          <ul class="run-summary-round-list">
            <li
              v-for="round in rounds"
              :key="round.key"
              class="run-summary-round-item"
              :class="'run-summary-round-item--' + (round.tone || 'unknown')"
              @click="$emit('open-round', round.battleId)"
              role="button"
              tabindex="0"
              @keydown.enter.prevent="$emit('open-round', round.battleId)"
              @keydown.space.prevent="$emit('open-round', round.battleId)"
            >
              <span class="run-summary-round-num">{{ round.numberLabel }}</span>
              <span class="run-summary-round-outcome">{{ round.outcomeLabel }}</span>
              <span class="run-summary-round-cta" aria-hidden="true">&#9654;</span>
            </li>
          </ul>
        </div>

        <button class="primary" @click="$emit('home')">{{ summary.homeLabel }}</button>
      </div>
    </section>
  `
};
