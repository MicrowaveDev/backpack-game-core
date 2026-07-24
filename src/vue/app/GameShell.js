import { ScreenOutlet } from './ScreenOutlet.js';

export const GameShell = {
  name: 'GameShell',
  components: { ScreenOutlet },
  props: {
    registry: { type: Object, required: true },
    currentScreenId: { type: String, required: true },
    screenProps: { type: Object, default: () => ({}) },
    routeContext: { type: Object, default: () => ({}) },
    navigationItems: { type: Array, default: () => [] },
    title: { type: String, default: '' },
    themeClass: { type: String, default: '' },
    labels: { type: Object, default: () => ({}) },
    authenticated: { type: Boolean, default: true },
    authStatus: { type: String, default: '' },
    locale: { type: String, default: '' },
    locales: { type: Array, default: () => [] },
    menuOpen: { type: Boolean, default: false },
    showLogout: { type: Boolean, default: false }
  },
  emits: [
    'navigate',
    'logout',
    'locale-change',
    'update:locale',
    'menu-change',
    'update:menuOpen'
  ],
  data() {
    return {
      localMenuOpen: this.menuOpen
    };
  },
  computed: {
    isAuthenticated() {
      return this.authStatus
        ? this.authStatus === 'authenticated'
        : this.authenticated;
    },
    isLoading() {
      return this.authStatus === 'loading';
    },
    localeItems() {
      return this.locales.map((locale) => (
        typeof locale === 'string'
          ? { id: locale, label: locale.toUpperCase() }
          : locale
      ));
    },
    logoutVisible() {
      return this.showLogout || Boolean(this.labels.logout);
    }
  },
  watch: {
    menuOpen(value) {
      this.localMenuOpen = value;
    },
    currentScreenId() {
      this.setMenuOpen(false);
    },
    isAuthenticated(value) {
      if (!value) this.setMenuOpen(false);
    }
  },
  methods: {
    setMenuOpen(value) {
      if (this.localMenuOpen === value) return;
      this.localMenuOpen = value;
      this.$emit('menu-change', value);
      this.$emit('update:menuOpen', value);
    },
    navigate(screenId) {
      this.setMenuOpen(false);
      this.$emit('navigate', screenId);
    },
    selectLocale(locale) {
      this.$emit('locale-change', locale);
      this.$emit('update:locale', locale);
    },
    logout() {
      this.setMenuOpen(false);
      this.$emit('logout');
    },
    isNavigationItemActive(item) {
      return item.id === this.currentScreenId
        || (item.activeScreenIds || []).includes(this.currentScreenId);
    }
  },
  template: `
    <div class="shell game-application" :class="themeClass" :data-screen="currentScreenId">
      <header v-if="isAuthenticated" class="app-header game-application__header">
        <slot
          name="header"
          :title="title"
          :locale="locale"
          :locales="localeItems"
          :menu-open="localMenuOpen"
          :toggle-menu="() => setMenuOpen(!localMenuOpen)"
          :select-locale="selectLocale"
        >
          <button
            class="menu-toggle"
            type="button"
            :aria-expanded="localMenuOpen"
            :aria-label="labels.menu || 'Menu'"
            @click="setMenuOpen(!localMenuOpen)"
          >
            <span class="menu-toggle-bar"></span>
            <span class="menu-toggle-bar"></span>
            <span class="menu-toggle-bar"></span>
          </button>
          <span v-if="title" class="app-header-title game-application__title">{{ title }}</span>
          <slot
            name="locale"
            :locale="locale"
            :locales="localeItems"
            :select-locale="selectLocale"
          >
            <div v-if="localeItems.length" class="lang-toggle-group">
              <button
                v-for="item in localeItems"
                :key="item.id"
                class="lang-toggle-btn"
                :class="{ active: item.id === locale }"
                type="button"
                :lang="item.id"
                :aria-pressed="item.id === locale"
                @click="selectLocale(item.id)"
              >
                {{ item.label }}
              </button>
            </div>
          </slot>
        </slot>
      </header>

      <template v-if="isAuthenticated && localMenuOpen">
        <div class="nav-sidebar-backdrop" @click="setMenuOpen(false)"></div>
        <aside class="nav-sidebar" :aria-label="labels.navigation || labels.menu || 'Menu'">
          <div class="home-section-header">
            <slot name="navigation-header" :title="title" :close="() => setMenuOpen(false)">
              <h3>{{ title }}</h3>
              <button
                class="ghost nav-sidebar-close"
                type="button"
                :aria-label="labels.close || 'Close'"
                @click="setMenuOpen(false)"
              >
                ×
              </button>
            </slot>
          </div>
          <nav class="nav-sidebar-list game-application__navigation">
            <slot name="navigation" :items="navigationItems" :navigate="navigate">
            <button
              v-for="item in navigationItems"
              :key="item.id"
              class="nav-btn game-application__navigation-item"
              :class="{ active: isNavigationItemActive(item), 'is-active': isNavigationItemActive(item) }"
              type="button"
              :aria-current="isNavigationItemActive(item) ? 'page' : undefined"
              :data-screen-id="item.id"
              @click="navigate(item.id)"
            >
              {{ item.label }}
            </button>
            </slot>
            <slot name="navigation-actions" :close="() => setMenuOpen(false)" />
            <button
              v-if="logoutVisible"
              class="nav-btn nav-btn--logout"
              type="button"
              data-testid="menu-logout"
              @click="logout"
            >
              {{ labels.logout || 'Logout' }}
            </button>
          </nav>
        </aside>
      </template>

      <main class="game-application__main">
        <slot v-if="isLoading" name="loading" :auth-status="authStatus" />
        <slot
          v-else-if="!isAuthenticated"
          name="unauthenticated"
          :auth-status="authStatus"
        />
        <slot v-else name="screen">
          <ScreenOutlet
            :registry="registry"
            :screen-id="currentScreenId"
            :screen-props="screenProps"
            :route-context="routeContext"
          >
            <template #unavailable="slotProps">
              <slot name="unavailable" v-bind="slotProps" />
            </template>
          </ScreenOutlet>
        </slot>
      </main>
      <slot
        name="overlays"
        :authenticated="isAuthenticated"
        :auth-status="authStatus"
        :current-screen-id="currentScreenId"
        :menu-open="localMenuOpen"
        :close-menu="() => setMenuOpen(false)"
      />
    </div>
  `
};
