export const AuthScreen = {
  name: 'AuthScreen',
  props: {
    portraits: { type: Array, default: () => [] },
    locale: { type: String, default: 'en' },
    labels: { type: Object, default: () => ({}) },
    catalogCounts: { type: Object, default: () => ({ characters: 0, artifacts: 0 }) },
    authCode: { type: Object, default: null },
    oidcEnabled: { type: Boolean, default: false },
    devAuthEnabled: { type: Boolean, default: false },
    portraitDataAttribute: { type: String, default: '' },
    openExternalLink: {
      type: Function,
      default: (url) => globalThis.open?.(url, '_blank', 'noopener,noreferrer')
    },
    copyText: {
      type: Function,
      default: (text) => globalThis.navigator?.clipboard?.writeText?.(text)
    }
  },
  emits: ['login-primary', 'login-browser', 'login-bot-code', 'login-dev', 'cancel-auth-code', 'update:locale'],
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
      return this.authCode?.publicCode ? `start auth-${this.authCode.publicCode}` : '';
    },
    botLinkLabel() {
      const botUrl = String(this.authCode?.botUrl || '').trim();
      const urlUsername = botUrl.match(/^https?:\/\/(?:www\.)?t\.me\/([^/?#]+)/i)?.[1] || '';
      const username = String(this.authCode?.botUsername || urlUsername).trim().replace(/^@/, '');
      return username ? `@${username}` : this.labels.codeBotLink;
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
    },
    openBotLink(event) {
      if (!this.authCode?.botUrl) return;
      event?.preventDefault?.();
      this.openExternalLink(this.authCode.botUrl);
    },
    openOidcLink(event) {
      if (!this.authCode?.authorizationUrl) return;
      event?.preventDefault?.();
      this.openExternalLink(this.authCode.authorizationUrl);
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
          <slot name="identity-provider"></slot>
          <button class="primary auth-cta" @click="$emit('login-primary')">{{ labels.primaryLogin }}</button>
          <button v-if="oidcEnabled" class="secondary" @click="$emit('login-bot-code')">{{ labels.botCodeFallback }}</button>
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
          <p class="eyebrow">{{ authCode.mode === 'oidc' ? labels.oidcTitle : labels.codeTitle }}</p>
          <p class="auth-code-hint">{{ authCode.mode === 'oidc' ? labels.oidcHint : labels.codeHint }}</p>
          <a v-if="authCode.mode === 'oidc'" class="primary auth-code-open" :href="authCode.authorizationUrl" target="_blank" rel="noopener noreferrer" @click="openOidcLink">{{ labels.oidcOpen }}</a>
          <a v-if="authCode.mode !== 'oidc'" class="primary auth-code-open" :href="authCode.botUrl" target="_blank" rel="noopener noreferrer" @click="openBotLink">{{ labels.codeOpen }}</a>
          <div v-if="authCode.mode !== 'oidc'" class="auth-code-command">
            <span class="auth-code-command-label">
              {{ labels.codeCommandLabel }}
              <a :href="authCode.botUrl" target="_blank" rel="noopener noreferrer" @click="openBotLink">{{ botLinkLabel }}</a>
            </span>
            <button
              class="auth-code-command-copy"
              type="button"
              :aria-label="botCommandCopied ? labels.codeCopied : labels.codeCopy"
              :title="botCommandCopied ? labels.codeCopied : labels.codeCopy"
              @click="copyBotStartCommand"
            >
              <code>{{ botStartCommand }}</code>
              <svg v-if="!botCommandCopied" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" ry="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
              <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg>
            </button>
          </div>
          <p class="muted">{{ authCode.mode === 'oidc' ? labels.oidcWaiting : labels.codeWaiting }}</p>
          <button class="secondary" type="button" @click="$emit('cancel-auth-code')">{{ labels.codeCancel }}</button>
        </div>
      </div>
    </section>
  `
};
