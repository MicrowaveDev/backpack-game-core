import { AchievementBadge } from './AchievementBadge.js';
import { SeasonRankEmblem } from './SeasonRankEmblem.js';

export const RunCompleteScreen = {
  name: 'RunCompleteScreen',
  components: { AchievementBadge, SeasonRankEmblem },
  props: {
    summary: { type: Object, default: null }
  },
  emits: ['primary', 'secondary'],
  computed: {
    timeline() {
      return Array.isArray(this.summary?.timeline) ? this.summary.timeline : [];
    },
    achievements() {
      return Array.isArray(this.summary?.achievements?.items) ? this.summary.achievements.items : [];
    }
  },
  methods: {
    achievementClass(achievement) {
      return [
        `run-achievement--${achievement.type || 'general'}`,
        `run-achievement--accent-${achievement.accent || achievement.type || 'general'}`,
        achievement.isNew === false ? 'run-achievement--earned' : 'run-achievement--new'
      ];
    },
    achievementDelay(index) {
      return `${760 + index * 180}ms`;
    }
  },
  template: `
    <section
      v-if="summary"
      class="run-complete-screen"
      :class="'run-complete-screen--' + (summary.tone || 'ended')"
      data-testid="run-complete"
    >
      <div class="panel run-complete-card">
        <div class="run-complete-hero">
          <h2>{{ summary.title }}</h2>
          <p class="run-end-reason">{{ summary.reason }}</p>
        </div>

        <div v-if="timeline.length" class="run-complete-record" :aria-label="summary.timelineLabel || null">
          <span
            v-for="round in timeline"
            :key="round.key"
            class="run-complete-round-icon"
            :class="'run-complete-round-icon--' + (round.tone || 'unknown')"
            :title="round.label"
            aria-hidden="true"
          >{{ round.icon }}</span>
        </div>

        <p v-if="summary.earnings?.value" class="run-complete-run-earnings">
          <span class="run-complete-run-earnings-label">{{ summary.earnings.label }}</span>
          <span class="run-complete-run-earnings-values">{{ summary.earnings.value }}</span>
        </p>

        <div class="run-complete-actions">
          <button class="primary run-complete-action" @click="$emit('primary')">{{ summary.primaryLabel }}</button>
          <button class="secondary run-complete-action run-complete-action--secondary" @click="$emit('secondary')">{{ summary.secondaryLabel }}</button>
        </div>
      </div>

      <div class="run-complete-details">
        <section
          v-if="summary.season"
          class="run-season-card"
          :class="[
            'run-season-card--' + summary.season.id,
            {
              'run-season-card--level-up': summary.season.leveledUp,
              'run-season-card--level-down': summary.season.leveledDown
            }
          ]"
        >
          <div class="run-season-header">
            <SeasonRankEmblem
              class="run-season-emblem"
              :rank-id="summary.season.id"
              :size="96"
              :image-base-path="summary.season.imageBasePath || '/season-ranks'"
            />
            <div class="run-season-copy">
              <p class="run-complete-kicker">{{ summary.season.kicker }}</p>
              <h3>{{ summary.season.name }}</h3>
              <p>{{ summary.season.lore }}</p>
            </div>
            <div class="run-season-points-block">
              <span class="run-season-points-value">{{ summary.season.points }}</span>
              <span class="run-season-points-label">{{ summary.season.pointsLabel }}</span>
              <span v-if="summary.season.runPointsText" class="run-season-run-points" :class="summary.season.runPointsTone">
                {{ summary.season.runPointsText }}
              </span>
            </div>
          </div>
          <div class="run-season-meter">
            <div class="run-season-progress" aria-hidden="true">
              <span :style="{ width: summary.season.progress + '%' }"></span>
            </div>
            <div class="run-season-meter-footer">
              <span class="run-season-peak">{{ summary.season.peakText }}</span>
              <span class="run-season-next">{{ summary.season.nextText }}</span>
            </div>
          </div>
        </section>

        <section v-if="achievements.length" class="run-achievements" :aria-label="summary.achievements.title">
          <div class="run-achievements-heading-row">
            <p class="run-complete-kicker">{{ summary.achievements.title }}</p>
            <span class="run-achievements-count">{{ achievements.length }}</span>
          </div>
          <div class="run-achievement-list">
            <article
              v-for="(achievement, index) in achievements"
              :key="achievement.id"
              :style="{ '--achievement-delay': achievementDelay(index) }"
              class="run-achievement"
              :class="achievementClass(achievement)"
            >
              <AchievementBadge
                :achievement="achievement"
                size="medium"
                :image-base-path="summary.achievements.imageBasePath || '/achievements'"
              />
              <div class="run-achievement-copy">
                <h3>
                  {{ achievement.name }}
                  <span v-if="achievement.isNew !== false" class="run-achievement-new">{{ summary.achievements.newLabel }}</span>
                  <span v-else class="run-achievement-earned">{{ summary.achievements.earnedLabel }}</span>
                </h3>
                <p>{{ achievement.lore }}</p>
              </div>
            </article>
          </div>
        </section>
        <section v-else-if="summary.achievements" class="run-achievements run-achievements--empty" :aria-label="summary.achievements.title">
          <div class="run-achievements-heading-row">
            <p class="run-complete-kicker">{{ summary.achievements.title }}</p>
          </div>
          <p class="run-achievements-empty-title">{{ summary.achievements.emptyTitle }}</p>
          <p class="run-achievements-empty-copy">{{ summary.achievements.emptyHint }}</p>
        </section>
      </div>
    </section>
  `
};
