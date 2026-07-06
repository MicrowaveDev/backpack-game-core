function nonEmptyArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export const ReplayDuel = {
  name: 'ReplayDuel',
  props: {
    leftFighter: { type: Object, default: () => ({}) },
    rightFighter: { type: Object, default: () => ({}) },
    actingSide: { type: String, default: '' },
    statusText: { type: String, default: '' },
    replaySpeed: { type: Number, default: 1 },
    speedBoost: { type: Number, default: 1 },
    speedOptions: {
      type: Array,
      default: () => [{ speed: 2, count: 1 }, { speed: 4, count: 2 }, { speed: 8, count: 3 }]
    },
    leftGridProps: { type: Object, default: null },
    rightGridProps: { type: Object, default: null },
    leftRoleSummary: { type: Array, default: () => [] },
    rightRoleSummary: { type: Array, default: () => [] },
    leftVisualEffects: { type: Object, default: null },
    rightVisualEffects: { type: Object, default: null },
    attributionGroups: { type: Array, default: () => [] },
    labels: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['set-speed'],
  computed: {
    renderedSpeedOptions() {
      return nonEmptyArray(this.speedOptions);
    },
    renderedAttributionGroups() {
      return nonEmptyArray(this.attributionGroups);
    },
    leftRoles() {
      return nonEmptyArray(this.leftRoleSummary);
    },
    rightRoles() {
      return nonEmptyArray(this.rightRoleSummary);
    },
    speedBoostLabel() {
      return this.labels?.speedBoost || 'Long battle speed boost';
    },
    leftRolesLabel() {
      return this.labels?.leftRoles || 'Left loadout roles';
    },
    rightRolesLabel() {
      return this.labels?.rightRoles || 'Right loadout roles';
    },
    attributionLabel() {
      return this.labels?.attribution || 'Artifact attribution';
    }
  },
  methods: {
    attributionValueText(group) {
      const suffix = group?.suffix ?? (group?.key === 'stunChance' ? '%' : '');
      return `${group?.prefix ?? '+'}${group?.total ?? 0}${suffix}`;
    },
    emitSetSpeed(speed) {
      this.$emit('set-speed', speed);
    }
  },
  template: `
    <div class="duel">
      <div class="duel-fighters">
        <slot
          name="fighter"
          side="left"
          :fighter="leftFighter"
          :acting="actingSide === 'left'"
          :visual-effects="leftVisualEffects"
        ></slot>
        <slot
          name="fighter"
          side="right"
          :fighter="rightFighter"
          :acting="actingSide === 'right'"
          :visual-effects="rightVisualEffects"
        ></slot>
      </div>
      <div class="duel-loadouts">
        <div class="duel-loadout-side">
          <span class="duel-loadout-name">{{ leftFighter.nameText }}</span>
          <div v-if="leftRoles.length" class="duel-role-summary" :aria-label="leftRolesLabel">
            <span
              v-for="item in leftRoles"
              :key="item.role.id"
              class="duel-role-chip"
              :class="'duel-role-chip--' + item.role.id"
              :style="{ '--artifact-role-color': item.role.color }"
            >
              <span class="duel-role-chip-mark" aria-hidden="true"></span>
              <span class="duel-role-chip-label">{{ item.role.label }}</span>
              <b>{{ item.count }}</b>
            </span>
          </div>
          <slot name="loadout-grid" side="left" :fighter="leftFighter" :grid-props="leftGridProps"></slot>
        </div>
        <div class="duel-loadout-center">
          <div v-if="renderedAttributionGroups.length" class="duel-attribution" :aria-label="attributionLabel">
            <span
              v-for="group in renderedAttributionGroups"
              :key="group.key"
              class="duel-attribution-chip"
              :class="'duel-attribution-chip--' + group.role"
              :style="{ '--artifact-role-color': group.roleClass?.color }"
            >
              <span
                class="artifact-role-glyph artifact-role-legend-glyph"
                :class="'artifact-role-glyph--' + group.role"
                aria-hidden="true"
              ><span></span></span>
              <span class="duel-attribution-label">{{ group.label }}</span>
              <b>{{ attributionValueText(group) }}</b>
            </span>
          </div>
          <p v-if="statusText" class="duel-loadout-status">{{ statusText }}</p>
          <svg v-else class="duel-loadout-icon" viewBox="0 0 64 64" aria-hidden="true">
            <path d="M20 14 L30 24 L24 30 L14 20 Z" fill="#8a6135" />
            <path d="M34 40 L44 50 L50 44 L40 34 Z" fill="#8a6135" />
            <path d="M44 14 L50 20 L20 50 L14 44 Z" fill="#b07d47" />
            <path d="M14 14 L20 20 L50 50 L44 44 Z" fill="#7f9872" />
          </svg>
          <div class="replay-speed-controls">
            <button
              v-for="item in renderedSpeedOptions"
              :key="item.speed"
              type="button"
              class="replay-speed-btn"
              :class="{ 'replay-speed-btn--active': replaySpeed === item.speed }"
              :aria-label="item.label || item.speed + 'x'"
              @click="emitSetSpeed(item.speed)"
            >
              <slot name="speed-icon" :item="item">
                <svg :viewBox="'0 0 ' + (item.count * 8 + 2) + ' 10'" aria-hidden="true">
                  <polygon v-for="n in item.count" :key="n" :points="((n - 1) * 8) + ',1 ' + ((n - 1) * 8 + 7) + ',5 ' + ((n - 1) * 8) + ',9'" fill="currentColor" />
                </svg>
              </slot>
            </button>
            <span v-if="speedBoost > 1" class="replay-speed-boost" :aria-label="speedBoostLabel">
              {{ speedBoost }}x
            </span>
          </div>
        </div>
        <div class="duel-loadout-side duel-loadout-side--right">
          <span class="duel-loadout-name">{{ rightFighter.nameText }}</span>
          <div v-if="rightRoles.length" class="duel-role-summary" :aria-label="rightRolesLabel">
            <span
              v-for="item in rightRoles"
              :key="item.role.id"
              class="duel-role-chip"
              :class="'duel-role-chip--' + item.role.id"
              :style="{ '--artifact-role-color': item.role.color }"
            >
              <span class="duel-role-chip-mark" aria-hidden="true"></span>
              <span class="duel-role-chip-label">{{ item.role.label }}</span>
              <b>{{ item.count }}</b>
            </span>
          </div>
          <slot name="loadout-grid" side="right" :fighter="rightFighter" :grid-props="rightGridProps"></slot>
        </div>
      </div>
    </div>
  `
};
