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
    title: { type: String, default: '' },
    authenticated: { type: Boolean, default: true },
    authStatus: { type: String, default: '' },
    locale: { type: String, default: '' },
    locales: { type: Array, default: () => [] },
    menuOpen: { type: Boolean, default: false },
    showLogout: { type: Boolean, default: false }
  },
  emits: [
    'navigate',
    'navigation-blocked',
    'logout',
    'locale-change',
    'update:locale',
    'menu-change',
    'update:menuOpen'
  ],
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
      :authenticated="authenticated"
      :auth-status="authStatus"
      :locale="locale"
      :locales="locales"
      :menu-open="menuOpen"
      :show-logout="showLogout"
      @navigate="navigate"
      @logout="$emit('logout')"
      @locale-change="$emit('locale-change', $event)"
      @update:locale="$emit('update:locale', $event)"
      @menu-change="$emit('menu-change', $event)"
      @update:menuOpen="$emit('update:menuOpen', $event)"
    >
      <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
        <slot :name="slotName" v-bind="slotProps || {}" />
      </template>
    </GameShell>
  `
};
