export const CatalogPageScreen = {
  name: 'CatalogPageScreen',
  props: {
    labels: {
      type: Object,
      default: () => ({})
    },
    rootClass: {
      type: [String, Array, Object],
      default: 'catalog-page-screen'
    },
    headerClass: {
      type: [String, Array, Object],
      default: 'catalog-page-cover panel'
    },
    eyebrowClass: {
      type: [String, Array, Object],
      default: 'eyebrow'
    },
    titleTag: {
      type: String,
      default: 'h2'
    },
    testId: {
      type: String,
      default: ''
    }
  },
  computed: {
    eyebrowText() {
      return this.labels?.eyebrow || '';
    },
    titleText() {
      return this.labels?.title || '';
    },
    introText() {
      return this.labels?.intro || '';
    }
  },
  template: `
    <section :class="rootClass || null" :data-testid="testId || null">
      <header :class="headerClass || null">
        <slot name="eyebrow" :text="eyebrowText">
          <p v-if="eyebrowText" :class="eyebrowClass || null">{{ eyebrowText }}</p>
        </slot>
        <slot name="title" :text="titleText">
          <component :is="titleTag" v-if="titleText">{{ titleText }}</component>
        </slot>
        <slot name="intro" :text="introText">
          <p v-if="introText">{{ introText }}</p>
        </slot>
      </header>
      <slot></slot>
    </section>
  `
};
