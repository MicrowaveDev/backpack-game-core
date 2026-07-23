export const ScreenOutlet = {
  name: 'ScreenOutlet',
  props: {
    registry: { type: Object, required: true },
    screenId: { type: String, required: true },
    screenProps: { type: Object, default: () => ({}) },
    routeContext: { type: Object, default: () => ({}) }
  },
  computed: {
    screenResolution() {
      return this.registry.resolve(this.screenId, this.routeContext);
    },
    screenComponent() {
      return this.screenResolution.allowed
        ? this.screenResolution.screen?.component
        : undefined;
    }
  },
  template: `
    <div class="game-screen-outlet" :data-screen-id="screenId">
      <component
        v-if="screenComponent"
        :is="screenComponent"
        v-bind="screenProps"
      />
      <slot
        v-else
        name="unavailable"
        :screen-id="screenId"
        :resolution="screenResolution"
      />
    </div>
  `
};
