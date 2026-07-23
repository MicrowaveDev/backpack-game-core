export const OnboardingScreen = {
  name: 'OnboardingScreen',
  props: {
    characters: { type: Array, default: () => [] },
    locale: { type: String, default: 'en' },
    labels: { type: Object, default: () => ({}) },
    portraitPosition: { type: Function, default: () => '50% 50%' }
  },
  emits: ['continue'],
  template: `
    <section class="onboarding-screen">
      <div class="panel onboarding-card">
        <h2 class="onboarding-title">{{ labels.title }}</h2>
        <div class="onboarding-body">
          <ol class="onboarding-steps">
            <li v-for="(step, index) in labels.steps || []" :key="step.key || index" class="onboarding-step"><span class="onboarding-step-num">{{ index + 1 }}</span><div><strong>{{ step.title }}</strong><p>{{ step.description }}</p></div></li>
          </ol>
          <div class="onboarding-preview">
            <div class="onboarding-preview-roster">
              <img
                v-for="character in characters"
                :key="character.id"
                :src="character.imagePath"
                :alt="character.name?.[locale] || character.displayName || character.id"
                class="onboarding-preview-portrait"
                :style="{ objectPosition: portraitPosition(character.id) }"
              />
            </div>
            <p class="onboarding-preview-caption">{{ labels.previewCaption }}</p>
          </div>
        </div>
        <button class="primary" @click="$emit('continue')">{{ labels.continue }}</button>
      </div>
    </section>
  `
};
