export const HistoryScreen = {
  name: 'HistoryScreen',
  props: {
    runs: { type: Array, default: () => [] },
    labels: { type: Object, default: () => ({}) },
    describeRun: { type: Function, required: true }
  },
  emits: ['open-run'],
  methods: {
    description(run) {
      return this.describeRun(run) || {};
    },
    recordText(run) {
      const description = this.description(run);
      return String(this.labels.record || '{wins} / {losses} / {rounds}')
        .replace('{wins}', description.wins || 0)
        .replace('{losses}', description.losses || 0)
        .replace('{rounds}', description.completedRounds || 0);
    },
    open(run) {
      this.$emit('open-run', run);
    }
  },
  template: `
    <section class="panel stack history-screen">
      <h2>{{ labels.title }}</h2>
      <p v-if="!runs.length">{{ labels.empty }}</p>
      <ul v-else class="run-list">
        <li
          v-for="run in runs"
          :key="run.id"
          class="run-card"
          :class="'run-card--' + (description(run).outcomeKey || 'abandoned')"
          role="button"
          tabindex="0"
          @click="open(run)"
          @keydown.enter.prevent="open(run)"
          @keydown.space.prevent="open(run)"
        >
          <div class="run-card-header">
            <span class="run-card-outcome">{{ description(run).outcomeLabel }}</span>
            <span class="run-card-meta">
              <span class="run-card-kind">{{ description(run).modeLabel }}</span>
              <span class="run-card-date">{{ description(run).dateLabel }}</span>
            </span>
          </div>
          <div class="run-card-matchup">
            <div class="run-card-fighter">
              <img
                v-if="description(run).ourImage"
                :src="description(run).ourImage"
                :alt="description(run).ourName"
                class="run-card-portrait"
              />
              <span class="run-card-name">{{ description(run).ourName }}</span>
            </div>
            <span class="run-card-vs">·</span>
            <span class="run-card-name">{{ recordText(run) }}</span>
          </div>
        </li>
      </ul>
    </section>
  `
};
