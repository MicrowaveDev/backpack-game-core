export const AchievementBadge = {
  name: 'AchievementBadge',
  props: {
    achievement: { type: Object, required: true },
    size: { type: String, default: 'small' },
    imageBasePath: { type: String, default: '/achievements' },
    rootClass: { type: String, default: 'achievement-badge' },
    imageClass: { type: String, default: 'achievement-badge-img' },
    idField: { type: String, default: 'id' },
    extension: { type: String, default: 'png' }
  },
  computed: {
    imageId() {
      return this.achievement?.[this.idField] || null;
    },
    pngSrc() {
      if (!this.imageId) return null;
      return `${this.imageBasePath}/${this.imageId}.${this.extension}`;
    },
    badgeClass() {
      const sizeClass = `${this.rootClass}--${this.size}`;
      return [this.rootClass, sizeClass];
    }
  },
  template: `
    <span :class="badgeClass" aria-hidden="true">
      <img v-if="pngSrc" :src="pngSrc" :class="imageClass" alt="" />
    </span>
  `
};
