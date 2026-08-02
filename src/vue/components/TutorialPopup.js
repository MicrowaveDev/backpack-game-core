export const TutorialPopup = {
  name: 'TutorialPopup',
  props: {
    step: { type: Object, default: null },
    reducedMotion: { type: Boolean, default: false }
  },
  emits: ['dismiss', 'skip'],
  data() {
    return {
      positionStyle: {},
      placement: 'bottom',
      positionFrame: 0,
      positionRetry: 0
    };
  },
  watch: {
    step: {
      handler() {
        this.positionRetry = 0;
        this.queuePosition();
      }
    }
  },
  mounted() {
    window.addEventListener('resize', this.queuePosition);
    window.addEventListener('scroll', this.queuePosition, true);
    document.addEventListener('keydown', this.onKeydown);
    this.queuePosition();
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.queuePosition);
    window.removeEventListener('scroll', this.queuePosition, true);
    document.removeEventListener('keydown', this.onKeydown);
    if (this.positionFrame) cancelAnimationFrame(this.positionFrame);
  },
  methods: {
    queuePosition() {
      if (!this.step) return;
      this.$nextTick?.(() => {
        if (this.positionFrame) cancelAnimationFrame(this.positionFrame);
        this.positionFrame = requestAnimationFrame(() => this.positionPopup());
      });
    },
    positionPopup() {
      this.positionFrame = 0;
      const popup = this.$refs.popup;
      if (!popup || !this.step) return;
      const anchor = (this.step.anchorSelector
        ? document.querySelector(this.step.anchorSelector)
        : null)
        || (this.step.anchorFallbackSelector
          ? document.querySelector(this.step.anchorFallbackSelector)
          : null);
      if (!anchor) {
        this.positionFallback(popup);
        if (this.positionRetry < 4) {
          this.positionRetry += 1;
          window.setTimeout(this.queuePosition, 80);
        }
        return;
      }

      const margin = 12;
      const gap = 12;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const anchorRect = anchor.getBoundingClientRect();
      const popupWidth = popup.offsetWidth;
      const popupHeight = popup.offsetHeight;
      const centerX = anchorRect.left + anchorRect.width / 2;
      const centerY = anchorRect.top + anchorRect.height / 2;
      const positions = {
        top: { top: anchorRect.top - popupHeight - gap, left: centerX - popupWidth / 2 },
        bottom: { top: anchorRect.bottom + gap, left: centerX - popupWidth / 2 },
        left: { top: centerY - popupHeight / 2, left: anchorRect.left - popupWidth - gap },
        right: { top: centerY - popupHeight / 2, left: anchorRect.right + gap }
      };
      const preferred = this.step.anchorPlacement || 'bottom';
      const opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[preferred];
      const order = [...new Set([preferred, opposite, 'bottom', 'top', 'right', 'left'])];
      const fits = ({ top, left }) => (
        top >= margin
        && left >= margin
        && top + popupHeight <= viewportHeight - margin
        && left + popupWidth <= viewportWidth - margin
      );
      this.placement = order.find((candidate) => fits(positions[candidate])) || preferred;
      const selected = positions[this.placement];
      const top = Math.min(
        Math.max(selected.top, margin),
        Math.max(margin, viewportHeight - popupHeight - margin)
      );
      const left = Math.min(
        Math.max(selected.left, margin),
        Math.max(margin, viewportWidth - popupWidth - margin)
      );
      const arrowOffset = this.placement === 'top' || this.placement === 'bottom'
        ? Math.min(Math.max(centerX - left, 24), popupWidth - 24)
        : Math.min(Math.max(centerY - top, 24), popupHeight - 24);
      this.positionStyle = {
        top: `${Math.round(top)}px`,
        left: `${Math.round(left)}px`,
        '--tutorial-arrow-offset': `${Math.round(arrowOffset)}px`
      };
      if (this.positionRetry < 2) {
        this.positionRetry += 1;
        window.setTimeout(this.queuePosition, 80);
      }
    },
    positionFallback(popup) {
      const margin = 12;
      this.placement = 'fallback';
      this.positionStyle = {
        top: `${Math.max(margin, window.innerHeight - popup.offsetHeight - margin)}px`,
        left: `${Math.max(margin, (window.innerWidth - popup.offsetWidth) / 2)}px`
      };
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
      >
        <section
          ref="popup"
          class="tutorial-popup panel"
          :class="{ 'tutorial-popup--with-image': step.imageSrc }"
          role="dialog"
          aria-live="polite"
          :data-placement="placement"
          :style="positionStyle"
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
            @load="queuePosition"
          />
          <h2 :id="'tutorial-title-' + step.id" class="tutorial-popup-title">{{ step.title }}</h2>
          <p :id="'tutorial-body-' + step.id" class="tutorial-popup-body">{{ step.body }}</p>
          <div
            class="tutorial-popup-actions"
            :class="{ 'tutorial-popup-actions--action-required': step.actionRequired }"
          >
            <button
              v-if="!step.actionRequired"
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
