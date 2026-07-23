export const SettingsScreen = {
  name: 'SettingsScreen',
  props: {
    settings: { type: Object, required: true },
    mobileActionsMode: { type: String, default: 'auto' },
    locale: { type: String, default: 'en' },
    labels: { type: Object, default: () => ({}) },
    languages: {
      type: Array,
      default: () => [{ value: 'ru', label: 'RU' }, { value: 'en', label: 'EN' }]
    }
  },
  emits: ['update:locale', 'update:reduced-motion', 'update:battle-speed', 'update:mobile-actions-mode', 'save'],
  template: `
    <section class="panel settings-panel">
      <h2>{{ labels.title }}</h2>

      <label class="setting-row">
        <span class="setting-label">{{ labels.language }}</span>
        <span class="setting-control">
          <select class="setting-select" :value="locale" @change="$emit('update:locale', $event.target.value)">
            <option v-for="language in languages" :key="language.value" :value="language.value">{{ language.label }}</option>
          </select>
        </span>
      </label>

      <label class="setting-row">
        <span class="setting-label">{{ labels.reducedMotion }}</span>
        <span class="setting-toggle">
          <input type="checkbox" :checked="settings.reducedMotion" @change="$emit('update:reduced-motion', $event.target.checked)" />
          <span class="setting-toggle-track"><span class="setting-toggle-thumb"></span></span>
        </span>
      </label>

      <label class="setting-row">
        <span class="setting-label">{{ labels.battleSpeed }}</span>
        <span class="setting-control">
          <select class="setting-select" :value="settings.battleSpeed" @change="$emit('update:battle-speed', $event.target.value)">
            <option value="1x">1x</option>
            <option value="2x">2x</option>
          </select>
        </span>
      </label>

      <label class="setting-row">
        <span class="setting-label">{{ labels.mobileActionsMode }}</span>
        <span class="setting-control">
          <select class="setting-select" :value="mobileActionsMode" @change="$emit('update:mobile-actions-mode', $event.target.value)">
            <option value="auto">{{ labels.mobileActionsAuto }}</option>
            <option value="always">{{ labels.mobileActionsAlways }}</option>
            <option value="side">{{ labels.mobileActionsSide }}</option>
            <option value="menu">{{ labels.mobileActionsMenu }}</option>
          </select>
        </span>
      </label>

      <div class="setting-actions">
        <button class="primary setting-save" type="button" @click="$emit('save')">{{ labels.save }}</button>
      </div>
    </section>
  `
};
