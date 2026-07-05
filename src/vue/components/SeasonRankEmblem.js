export const SeasonRankEmblem = {
  name: 'SeasonRankEmblem',
  props: {
    rankId: { type: String, default: 'bronze' },
    size: { type: Number, default: 96 },
    imageBasePath: { type: String, default: '/season-ranks' },
    rootClass: { type: String, default: 'season-rank-emblem' },
    imageClass: { type: String, default: 'season-rank-emblem-img' },
    extension: { type: String, default: 'png' }
  },
  computed: {
    pngSrc() {
      return `${this.imageBasePath}/${this.rankId}.${this.extension}`;
    },
    emblemClass() {
      return [this.rootClass, `${this.rootClass}--${this.rankId}`];
    },
    emblemStyle() {
      return { width: `${this.size}px`, height: `${this.size}px` };
    }
  },
  template: `
    <span :class="emblemClass" :style="emblemStyle" aria-hidden="true">
      <img
        :src="pngSrc"
        :class="imageClass"
        :width="size"
        :height="size"
        alt=""
      />
    </span>
  `
};
