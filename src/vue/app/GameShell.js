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
    labels: { type: Object, default: () => ({}) }
  },
  emits: ['navigate'],
  template: `
    <div class="game-application" :class="themeClass" :data-screen="currentScreenId">
      <header class="game-application__header">
        <slot name="header" :title="title">
          <span v-if="title" class="game-application__title">{{ title }}</span>
        </slot>
        <nav
          v-if="navigationItems.length"
          class="game-application__navigation"
          :aria-label="labels.navigation"
        >
          <slot name="navigation" :items="navigationItems" :navigate="(id) => $emit('navigate', id)">
            <button
              v-for="item in navigationItems"
              :key="item.id"
              class="game-application__navigation-item"
              :class="{ 'is-active': item.id === currentScreenId }"
              type="button"
              :aria-current="item.id === currentScreenId ? 'page' : undefined"
              :data-screen-id="item.id"
              @click="$emit('navigate', item.id)"
            >
              {{ item.label }}
            </button>
          </slot>
        </nav>
      </header>
      <main class="game-application__main">
        <slot name="screen">
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
      <slot name="overlays" />
    </div>
  `
};
