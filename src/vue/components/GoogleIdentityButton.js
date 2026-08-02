const GIS_SCRIPT_ID = 'google-identity-services-client';
let gisScriptPromise = null;

function loadGoogleIdentityServices() {
  if (globalThis.google?.accounts?.id) return Promise.resolve(globalThis.google.accounts.id);
  if (!globalThis.document) return Promise.reject(new Error('Google Identity Services requires a browser'));
  if (gisScriptPromise) return gisScriptPromise;

  gisScriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(GIS_SCRIPT_ID);
    const script = existing || document.createElement('script');
    const loaded = () => globalThis.google?.accounts?.id
      ? resolve(globalThis.google.accounts.id)
      : reject(new Error('Google Identity Services did not initialize'));
    script.addEventListener('load', loaded, { once: true });
    script.addEventListener('error', () => reject(new Error('Google Identity Services failed to load')), { once: true });
    if (!existing) {
      script.id = GIS_SCRIPT_ID;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      document.head.appendChild(script);
    }
  }).catch((error) => {
    gisScriptPromise = null;
    throw error;
  });
  return gisScriptPromise;
}

export function createGoogleIdentityConfig({ clientId, uxMode = 'popup', loginUri = '', onCredential }) {
  const redirect = uxMode === 'redirect';
  return {
    client_id: clientId,
    ux_mode: redirect ? 'redirect' : 'popup',
    ...(redirect
      ? { login_uri: loginUri }
      : {
          callback: (response) => onCredential(response?.credential || ''),
          use_fedcm_for_button: true,
          button_auto_select: false
        })
  };
}

export const GoogleIdentityButton = {
  name: 'GoogleIdentityButton',
  props: {
    clientId: { type: String, required: true },
    locale: { type: String, default: 'en' },
    disabled: { type: Boolean, default: false },
    text: { type: String, default: 'signin_with' },
    uxMode: { type: String, default: 'popup' },
    loginUri: { type: String, default: '' }
  },
  emits: ['credential', 'error'],
  data() {
    return { loading: true };
  },
  async mounted() {
    try {
      const identity = await loadGoogleIdentityServices();
      if (!this.$refs.button || !this.clientId) return;
      if (this.uxMode === 'redirect' && !this.loginUri) {
        throw new Error('Google redirect mode requires a login URI');
      }
      identity.initialize(createGoogleIdentityConfig({
        clientId: this.clientId,
        uxMode: this.uxMode,
        loginUri: this.loginUri,
        onCredential: (credential) => {
          if (credential) this.$emit('credential', credential);
          else this.$emit('error', new Error('Google did not return a credential'));
        }
      }));
      identity.renderButton(this.$refs.button, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: this.text,
        shape: 'rectangular',
        logo_alignment: 'left',
        width: Math.max(240, Math.floor(this.$el?.clientWidth || 320)),
        locale: this.locale
      });
      this.loading = false;
    } catch (error) {
      this.loading = false;
      this.$emit('error', error);
    }
  },
  template: `
    <div class="google-identity-button" :class="{ 'is-disabled': disabled, 'is-loading': loading }">
      <div ref="button" :inert="disabled ? '' : null"></div>
    </div>
  `
};

export { loadGoogleIdentityServices };
