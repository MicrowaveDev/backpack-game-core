export const TutorialPopup = {
  name: 'TutorialPopup',
  props: {
    step: { type: Object, default: null },
    reducedMotion: { type: Boolean, default: false }
  },
  emits: ['dismiss', 'skip'],
  mounted() {
    this.focusPrimary();
  },
  updated() {
    this.focusPrimary();
  },
  methods: {
    focusPrimary() {
      if (!this.step) return;
      this.$nextTick?.(() => this.$refs.primary?.focus?.());
    },
    onKeydown(event) {
      if (event.key === 'Escape') this.$emit('dismiss');
    }
  },
  template: `
    <Teleport to="body">
      <div
        v-if="step"
        class="tutorial-popup-backdrop"
        :class="{ 'tutorial-popup--reduced-motion': reducedMotion }"
        data-testid="tutorial-popup"
        @keydown="onKeydown"
      >
        <section
          class="tutorial-popup panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="'tutorial-title-' + step.id"
          :aria-describedby="'tutorial-body-' + step.id"
        >
          <button
            class="tutorial-popup-close"
            type="button"
            :aria-label="step.closeLabel"
            @click="$emit('dismiss')"
          >×</button>
          <img
            v-if="step.imageSrc"
            class="tutorial-popup-image"
            :src="step.imageSrc"
            :alt="step.imageAlt || ''"
          />
          <h2 :id="'tutorial-title-' + step.id" class="tutorial-popup-title">{{ step.title }}</h2>
          <p :id="'tutorial-body-' + step.id" class="tutorial-popup-body">{{ step.body }}</p>
          <div class="tutorial-popup-actions">
            <button
              ref="primary"
              class="primary tutorial-popup-primary"
              type="button"
              @click="$emit('dismiss')"
            >{{ step.primaryLabel }}</button>
            <button
              class="ghost tutorial-popup-skip"
              type="button"
              @click="$emit('skip')"
            >{{ step.skipLabel }}</button>
          </div>
        </section>
      </div>
    </Teleport>
  `
};
