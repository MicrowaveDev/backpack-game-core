export const CharactersScreen = {
  name: 'CharactersScreen',
  props: {
    characters: { type: Array, default: () => [] },
    locale: { type: String, default: 'en' },
    portraitPosition: { type: Function, default: () => '50% 50%' },
    statLabels: {
      type: Object,
      default: () => ({ health: 'HP', attack: 'ATK', speed: 'SPD' })
    }
  },
  emits: ['select-character'],
  template: `
    <section class="character-grid">
      <article class="character-card" v-for="character in characters" :key="character.id" role="button" tabindex="0" @click="$emit('select-character', character.id)" @keydown.enter.prevent="$emit('select-character', character.id)">
        <div class="card-portrait-wrap">
          <img :src="character.imagePath" :alt="character.name?.[locale] || character.displayName || character.id" class="portrait character-portrait" :style="{ objectPosition: portraitPosition(character.id) }"/>
          <h3 class="card-portrait-name">{{ character.name?.[locale] || character.displayName || character.id }}</h3>
        </div>
        <div class="character-card-meta">
          <span class="fighter-style-tag">{{ character.styleTag }}</span>
          <span class="card-stats">{{ character.baseStats.health }} {{ statLabels.health }} · {{ character.baseStats.attack }} {{ statLabels.attack }} · {{ character.baseStats.speed }} {{ statLabels.speed }}</span>
        </div>
      </article>
    </section>
  `
};
