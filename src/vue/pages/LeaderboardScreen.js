export const LeaderboardScreen = {
  name: 'LeaderboardScreen',
  props: {
    entries: { type: Array, default: () => [] },
    title: { type: String, default: '' }
  },
  template: `
    <section class="panel stack">
      <h2>{{ title }}</h2>
      <div class="leaderboard-row" v-for="entry in entries" :key="entry.id">
        <strong>#{{ entry.rank }}</strong>
        <span>{{ entry.name }}</span>
        <span>{{ entry.rating }}</span>
      </div>
    </section>
  `
};
