export const AuthScreen = {
  name: 'AuthScreen',
  props: {
    portraits: { type: Array, default: () => [] },
    locale: { type: String, default: 'en' },
    labels: { type: Object, default: () => ({}) },
    catalogCounts: { type: Object, default: () => ({ characters: 0, artifacts: 0 }) },
    authCode: { type: Object, default: null },
    devAuthEnabled: { type: Boolean, default: false },
    portraitDataAttribute: { type: String, default: '' },
    copyText: {
      type: Function,
      default: (text) => globalThis.navigator?.clipboard?.writeText?.(text)
    }
  },
  emits: ['login-primary', 'login-browser', 'login-dev', 'cancel-auth-code', 'update:locale'],
  data() {
    return {
      botCommandCopied: false
    };
  },
  computed: {
    authFeature1() {
      const count = this.catalogCounts.characters || 0;
      return count > 0 ? this.labels.feature1.replace('{count}', count) : this.labels.feature1Fallback;
    },
    authFeature2() {
      const count = this.catalogCounts.artifacts || 0;
      return count > 0 ? this.labels.feature2.replace('{count}', count) : this.labels.feature2Fallback;
    },
    botStartCommand() {
      return this.authCode?.publicCode ? `/start auth-${this.authCode.publicCode}` : '';
    }
  },
  methods: {
    portraitAttributes(portrait) {
      return this.portraitDataAttribute
        ? { [this.portraitDataAttribute]: portrait.id }
        : {};
    },
    async copyBotStartCommand() {
      if (!this.botStartCommand) return;
      try {
        await this.copyText(this.botStartCommand);
        this.botCommandCopied = true;
        setTimeout(() => {
          this.botCommandCopied = false;
        }, 1800);
      } catch {
        this.botCommandCopied = false;
      }
    }
  },
  template: `
    <section class="auth-screen">
      <div class="auth-hero-card panel">
        <p class="eyebrow auth-eyebrow">{{ labels.productTitle }}</p>
        <div class="auth-portraits">
          <img
            v-for="portrait in portraits"
            :key="portrait.id"
            :src="portrait.src"
            :data-character-id="portrait.id"
            v-bind="portraitAttributes(portrait)"
            :style="{ objectPosition: portrait.objectPosition }"
            alt=""
            class="auth-portrait"
          />
        </div>
        <h2 class="auth-title">{{ labels.title }}</h2>
        <p class="auth-tagline">{{ labels.tagline }}</p>
        <ul class="auth-features">
          <li>{{ authFeature1 }}</li>
          <li>{{ authFeature2 }}</li>
          <li>{{ labels.feature3 }}</li>
        </ul>
        <div class="auth-actions">
          <button class="primary auth-cta" @click="$emit('login-primary')">{{ labels.primaryLogin }}</button>
          <button v-if="devAuthEnabled" class="secondary" @click="$emit('login-browser')">{{ labels.browser }}</button>
          <button v-if="devAuthEnabled" class="ghost" @click="$emit('login-dev')">{{ labels.dev }}</button>
        </div>
        <p v-if="devAuthEnabled" class="auth-browser-note">{{ labels.browserNote }}</p>
        <div class="auth-lang-row">
          <button class="lang-toggle-btn" :class="{ active: locale === 'ru' }" @click="$emit('update:locale', 'ru')">RU</button>
          <button class="lang-toggle-btn" :class="{ active: locale === 'en' }" @click="$emit('update:locale', 'en')">EN</button>
        </div>
      </div>
      <div v-if="authCode" class="auth-code-modal" role="dialog" aria-modal="true" :aria-label="labels.codeTitle">
        <div class="auth-code-backdrop" @click="$emit('cancel-auth-code')"></div>
        <div class="auth-code-sheet panel">
          <button class="auth-code-close" type="button" :aria-label="labels.codeCancel" @click="$emit('cancel-auth-code')">×</button>
          <p class="eyebrow">{{ labels.codeTitle }}</p>
          <p class="auth-code-hint">{{ labels.codeHint }}</p>
          <a class="primary auth-code-open" :href="authCode.botUrl" target="_blank" rel="noopener noreferrer">{{ labels.codeOpen }}</a>
          <div class="auth-code-command">
            <span>{{ labels.codeCommandLabel }}</span>
            <code>{{ botStartCommand }}</code>
            <button class="ghost" type="button" @click="copyBotStartCommand">{{ botCommandCopied ? labels.codeCopied : labels.codeCopy }}</button>
          </div>
          <p class="muted">{{ labels.codeWaiting }}</p>
          <button class="secondary" type="button" @click="$emit('cancel-auth-code')">{{ labels.codeCancel }}</button>
        </div>
      </div>
    </section>
  `
};
