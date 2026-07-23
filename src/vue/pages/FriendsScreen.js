export const FriendsScreen = {
  name: 'FriendsScreen',
  props: {
    profile: {
      type: Object,
      default: () => ({})
    },
    friends: {
      type: Array,
      default: () => []
    },
    challenge: {
      type: Object,
      default: null
    },
    labels: {
      type: Object,
      default: () => ({})
    },
    buildInviteLink: {
      type: Function,
      default: () => ''
    },
    copyText: {
      type: Function,
      default: async () => false
    },
    shareInvite: {
      type: Function,
      default: async () => false
    },
    copyResetDelay: {
      type: Number,
      default: 1600
    }
  },
  emits: ['add-friend', 'challenge-friend', 'accept-challenge', 'decline-challenge'],
  data() {
    return { copyState: null };
  },
  beforeUnmount() {
    if (this._copyResetTimer) clearTimeout(this._copyResetTimer);
  },
  methods: {
    challengeStatusLabel(status) {
      return this.labels.challengeStatuses?.[status] || status;
    },
    inviteLink() {
      return this.buildInviteLink(this.profile) || '';
    },
    inviteText() {
      return String(this.labels.friendInviteText || '')
        .replace('{code}', this.profile.friendCode || '')
        .replace('{link}', this.inviteLink());
    },
    async copyFriendCode() {
      try {
        await this.copyText(this.profile.friendCode || '');
        this.copyState = 'copied';
        if (this._copyResetTimer) clearTimeout(this._copyResetTimer);
        this._copyResetTimer = setTimeout(() => {
          this.copyState = null;
        }, this.copyResetDelay);
      } catch {}
    },
    async shareFriendInvite() {
      try {
        await this.shareInvite({
          text: this.inviteText(),
          url: this.inviteLink(),
          profile: this.profile
        });
      } catch {}
    }
  },
  template: `
    <section class="grid cards">
      <article class="panel friends-panel">
        <h2>{{ labels.friends }}</h2>

        <p class="friends-code-label">{{ labels.friendCode }}</p>
        <div class="friends-code-row">
          <button
            type="button"
            class="friends-code-pill"
            :class="{ 'friends-code-pill--copied': copyState === 'copied' }"
            :aria-label="copyState === 'copied' ? labels.friendCodeCopied : labels.copyFriendCode"
            @click="copyFriendCode"
          >
            <span class="friends-code-value">{{ profile.friendCode }}</span>
            <span class="friends-code-pill-icon" aria-hidden="true">
              <svg v-if="copyState !== 'copied'" viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2" ry="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
              <svg v-else viewBox="0 0 24 24"><path d="m5 12 5 5L20 7"/></svg>
            </span>
          </button>
          <button
            type="button"
            class="friends-icon-btn"
            :aria-label="labels.shareFriendInvite"
            :title="labels.shareFriendInvite"
            @click="shareFriendInvite"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v14"/></svg>
          </button>
        </div>

        <form class="friends-add-form" @submit.prevent="$emit('add-friend', $event)">
          <input name="friendCode" class="friends-add-input" :placeholder="labels.friendCode" />
          <button class="primary friends-add-submit" type="submit">{{ labels.addFriend }}</button>
        </form>
      </article>
      <article class="panel">
        <h3>{{ labels.roster }}</h3>
        <template v-if="friends.length">
          <button v-for="friend in friends" :key="friend.id" class="friend-roster-entry" @click="$emit('challenge-friend', friend.id)">
            <strong>{{ friend.name }}</strong>
            <span>{{ labels.createChallenge }}</span>
          </button>
        </template>
        <div v-else class="home-friends-empty">
          <span aria-hidden="true">:(</span>
          <p>{{ labels.noFriendsYet }}</p>
        </div>
      </article>
      <article class="panel" v-if="challenge">
        <h3>{{ labels.challengeSection }}</h3>
        <p>{{ challengeStatusLabel(challenge.status) }}</p>
        <button class="primary" @click="$emit('accept-challenge')">{{ labels.acceptChallenge }}</button>
        <button class="secondary" @click="$emit('decline-challenge')">{{ labels.declineChallenge }}</button>
      </article>
    </section>
  `
};
