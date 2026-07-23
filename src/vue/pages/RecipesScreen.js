import { CatalogPageScreen } from '../components/CatalogPageScreen.js';

export const RecipesScreen = {
  name: 'RecipesScreen',
  components: { CatalogPageScreen },
  props: {
    labels: {
      type: Object,
      default: () => ({})
    }
  },
  template: `
    <catalog-page-screen
      :labels="labels"
      root-class="recipes-screen"
      header-class="recipes-cover panel"
      test-id="recipes-screen"
    >
      <slot name="catalog"></slot>
    </catalog-page-screen>
  `
};
