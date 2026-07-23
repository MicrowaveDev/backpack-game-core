import { GameShell } from './GameShell.js';
import { createNavigationItems } from './navigation.js';

export const GameApplicationRoot = {
  name: 'GameApplicationRoot',
  components: { GameShell },
  props: {
    adapter: { type: Object, required: true },
    registry: { type: Object, required: true },
    initialScreenId: { type: String, required: true },
    initialScreenProps: { type: Object, default: () => ({}) },
    routeContext: { type: Object, default: () => ({}) },
    labels: { type: Object, default: () => ({}) },
    title: { type: String, default: '' }
  },
  emits: ['navigate', 'navigation-blocked'],
  data() {
    return {
      currentScreenId: this.initialScreenId
    };
  },
  computed: {
    applicationRouteContext() {
      return {
        ...this.routeContext,
        adapter: this.adapter
      };
    },
    navigationItems() {
      return createNavigationItems(this.registry, this.applicationRouteContext);
    }
  },
  methods: {
    navigate(screenId) {
      const resolution = this.registry.resolve(screenId, this.applicationRouteContext);
      if (resolution.allowed) {
        this.currentScreenId = screenId;
        this.$emit('navigate', screenId);
        return;
      }
      if (resolution.redirect) {
        const redirect = this.registry.resolve(resolution.redirect, this.applicationRouteContext);
        if (redirect.allowed) {
          this.currentScreenId = resolution.redirect;
          this.$emit('navigate', resolution.redirect);
          return;
        }
      }
      this.$emit('navigation-blocked', { screenId, resolution });
    }
  },
  template: `
    <GameShell
      :registry="registry"
      :current-screen-id="currentScreenId"
      :screen-props="initialScreenProps"
      :route-context="applicationRouteContext"
      :navigation-items="navigationItems"
      :title="title"
      :theme-class="adapter.themeClass"
      :labels="labels"
      @navigate="navigate"
    >
      <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
        <slot :name="slotName" v-bind="slotProps || {}" />
      </template>
    </GameShell>
  `
};
