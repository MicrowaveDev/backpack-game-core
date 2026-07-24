import { defineAsyncComponent } from 'vue/dist/vue.esm-bundler.js';
import {
  formatWalletBundlePrice as formatCoreWalletBundlePrice,
  shapeAssetPackCardRows,
  shapeAssetRollResultPanel,
  summarizeAssetRollFeedback,
  summarizeWalletPurchaseSurface,
  summarizeAssetRollPacks
} from '@microwavedev/backpack-game-core/client-view-model';
import { AssetRollResultPanel, GachaPackCardList } from '../components.js';
import { SeasonRankEmblem } from '../components/SeasonRankEmblem.js';
import { AchievementBadge } from '../components/AchievementBadge.js';
import { HomeSocialSidebar } from '../components/HomeSocialSidebar.js';

function emptySeasonSummary() {
  return {
    id: 'unranked',
    seasonName: '',
    name: '',
    seasonTheme: '',
    totalPoints: 0,
    progress: 0,
    isMax: false,
    pointsToNext: 0,
    nextName: ''
  };
}

export const HomeScreen = {
  name: 'HomeScreen',
  props: [
    'state', 't', 'activeCharacter', 'builderTotals',
    'renderArtifactFigure', 'getArtifact', 'getCharacter',
    'describeRun', 'formatDelta', 'formatArtifactBonus', 'portraitPosition', 'portraitPositionFor',
    'getSeasonProgressSummary', 'getAchievementsByIds', 'getNextAchievementHint',
    'resolveWalletSurface', 'buildInviteLink', 'shareInviteValue', 'fusionRecipes'
  ],
  emits: [
    'resume-run', 'start-run', 'abandon-run',
    'load-run-summary', 'go',
    'add-friend', 'challenge-friend',
    'accept-challenge', 'decline-challenge',
    'select-character',
    'switch-portrait', 'purchase-portrait', 'switch-preset',
    'roll-asset-pack', 'burn-asset-pack', 'load-wallet-bundles', 'purchase-wallet'
  ],
  data() {
    return {
      expandedCharacterId: null,
      selectedCharacterId: null,
      socialPanel: '',
      walletShopOpen: false,
      homeAtTop: true,
      pulsingCharacterIds: {},
      pulsingCharacterDeltas: {},
      openStatsPopover: null
    };
  },
  components: {
    AssetRollResultPanel,
    GachaPackCardList,
    ArtifactGridBoard: defineAsyncComponent(() => (
      import('../components/ArtifactGridBoard.js').then((module) => module.ArtifactGridBoard)
    )),
    SeasonRankEmblem,
    AchievementBadge,
    HomeSocialSidebar
  },
  methods: {
    toggleStatsPopover(id, event) {
      if (event) event.stopPropagation();
      this.openStatsPopover = this.openStatsPopover === id ? null : id;
    },
    handleStatsPopoverOutsideClick(event) {
      const target = event.target;
      if (this.openStatsPopover) {
        if (target && typeof target.closest === 'function' && target.closest('.home-character-stats')) return;
        this.openStatsPopover = null;
      }
      if (this.walletShopOpen && target && typeof target.closest === 'function' && !target.closest('.home-wallet-footer')) {
        this.walletShopOpen = false;
      }
    },
    toggleWalletShop() {
      this.walletShopOpen = !this.walletShopOpen;
      if (this.walletShopOpen && (!this.walletBundles.length || this.state.walletBundlesSurface !== this.walletSurface)) {
        this.$emit('load-wallet-bundles', { surface: this.walletSurface });
      }
    },
    handleWalletPurchase(bundle) {
      this.$emit('purchase-wallet', {
        bundleId: bundle.id,
        provider: bundle.provider,
        surface: this.walletSurface
      });
    },
    walletProviderLabel(provider) {
      return this.t[`walletProvider_${provider}`] || provider;
    },
    formatWalletBundlePrice(bundle) {
      return formatCoreWalletBundlePrice(bundle);
    },
    paymentSupportEntries() {
      return this.walletPurchaseSurface.supportEntries;
    },
    localizedName(value) {
      if (value && typeof value === 'object') return value[this.state.lang] || value.en || Object.values(value)[0] || '';
      return value || '';
    },
    packName(pack) {
      return this.localizedName(pack?.name) || pack?.id || '';
    },
    rarityLabel(rarity) {
      return this.t[`rarity_${rarity}`] || rarity || '';
    },
    portraitPriceAmount(portrait) {
      if (portrait.purchaseAvailable) return portrait.price || portrait.cost || 0;
      if (portrait.rollAvailable) {
        const pack = this.assetPacksById[portrait.packId] || {};
        return pack.rollPriceAmount || portrait.price || portrait.cost || 0;
      }
      return portrait.price || portrait.cost || 0;
    },
    portraitActionTitle(portrait) {
      if (portrait.unlocked) return portrait.name[this.state.lang];
      const amount = this.portraitPriceAmount(portrait);
      if (portrait.purchaseAvailable) return this.t.portraitBuy.replace('{n}', amount);
      if (portrait.rollAvailable) return this.t.portraitRoll.replace('{n}', amount);
      return this.t.portraitLocked.replace('{n}', amount);
    },
    handlePortraitClick(portrait) {
      if (portrait.unlocked) {
        this.$emit('switch-portrait', { characterId: this.selectedCharacter.id, portraitId: portrait.id });
        return;
      }
      if (portrait.purchaseAvailable) {
        this.$emit('purchase-portrait', {
          characterId: this.selectedCharacter.id,
          portraitId: portrait.id,
          assetId: portrait.assetId
        });
        return;
      }
      if (portrait.rollAvailable && portrait.packId) {
        this.$emit('roll-asset-pack', { packId: portrait.packId });
      }
    },
    handlePackAction(action) {
      if (action.kind === 'burn') {
        this.$emit('burn-asset-pack', action.payload);
        return;
      }
      this.$emit('roll-asset-pack', action.payload);
    },
    focusCharacter(character) {
      this.selectedCharacterId = character.id;
      if (character.isActive) return;
      this.$emit('select-character', character.id);
    },
    playSelectedCharacter() {
      if (this.state.startingRun) return;
      if (this.selectedCharacter?.activeRun) {
        this.state.gameRun = this.selectedCharacter.activeRun;
        this.$emit('resume-run');
        return;
      }
      this.$emit('start-run', 'solo');
    },
    toggleSelectedSkinPanel() {
      if (!this.selectedCharacter) return;
      this.expandedCharacterId = this.expandedCharacterId === this.selectedCharacter.id ? null : this.selectedCharacter.id;
    },
    openSocialPanel(panel) {
      this.socialPanel = panel;
    },
    setMobileActionMode(mode) {
      this.state.mobileHomeActionsMode = mode;
    },
    onScroll() {
      this.homeAtTop = window.scrollY <= 24;
    },
    flashProgressionCurrencyGain(characterId, delta) {
      this.pulsingCharacterIds = { ...this.pulsingCharacterIds, [characterId]: true };
      this.pulsingCharacterDeltas = { ...this.pulsingCharacterDeltas, [characterId]: delta };
      const existing = this._pulseTimers.get(characterId);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        const ids = { ...this.pulsingCharacterIds };
        const deltas = { ...this.pulsingCharacterDeltas };
        delete ids[characterId];
        delete deltas[characterId];
        this.pulsingCharacterIds = ids;
        this.pulsingCharacterDeltas = deltas;
        this._pulseTimers.delete(characterId);
      }, 2400);
      this._pulseTimers.set(characterId, timer);
    },
    activityDayLabel(date) {
      const value = date ? new Date(date) : new Date();
      if (Number.isNaN(value.getTime())) return this.t.today;
      const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const diff = Math.round((startOf(new Date()) - startOf(value)) / 86400000);
      if (diff <= 0) return this.t.today;
      if (diff === 1) return this.t.yesterday;
      return value.toLocaleDateString(this.state.lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long' });
    }
  },
  created() {
    this._prevProgressionCurrency = new Map();
    this._pulseTimers = new Map();
    const progression = this.state.bootstrap?.progression || {};
    for (const [id, prog] of Object.entries(progression)) {
      this._prevProgressionCurrency.set(id, prog.progressionCurrency || 0);
    }
  },
  mounted() {
    if (typeof document !== 'undefined') {
      document.addEventListener('click', this.handleStatsPopoverOutsideClick);
    }
    this.onScroll();
    window.addEventListener('scroll', this.onScroll, { passive: true });
  },
  beforeUnmount() {
    if (typeof document !== 'undefined') {
      document.removeEventListener('click', this.handleStatsPopoverOutsideClick);
    }
    window.removeEventListener('scroll', this.onScroll);
    if (this._pulseTimers) {
      for (const timer of this._pulseTimers.values()) clearTimeout(timer);
      this._pulseTimers.clear();
    }
  },
  watch: {
    'state.bootstrap.progression': {
      deep: true,
      handler(progression) {
        if (!progression) return;
        for (const [id, prog] of Object.entries(progression)) {
          const prev = this._prevProgressionCurrency.get(id);
          const curr = prog.progressionCurrency || 0;
          if (typeof prev === 'number' && curr > prev) {
            this.flashProgressionCurrencyGain(id, curr - prev);
          }
          this._prevProgressionCurrency.set(id, curr);
        }
      }
    }
  },
  computed: {
    mobileActionMode() {
      return this.state.mobileHomeActionsMode || 'auto';
    },
    showMobileBottomActions() {
      if (this.mobileActionMode === 'always') return true;
      if (this.mobileActionMode === 'auto') return this.homeAtTop;
      return false;
    },
    playerRank() {
      const id = this.state.bootstrap?.player?.id;
      if (!id || !this.state.leaderboard?.length) return null;
      const entry = this.state.leaderboard.find(e => e.id === id);
      return entry?.rank || null;
    },
    walletBalance() {
      return this.walletPurchaseSurface.balance;
    },
    walletSurface() {
      return this.resolveWalletSurface?.() || 'web';
    },
    walletBundles() {
      return this.walletPurchaseSurface.bundles;
    },
    walletPurchaseStatusText() {
      return this.walletPurchaseSurface.statusText;
    },
    walletPurchaseSurface() {
      return summarizeWalletPurchaseSurface({
        wallet: this.state.bootstrap?.wallet,
        player: this.state.bootstrap?.player,
        bundles: this.state.walletBundles,
        bundleSurface: this.state.walletBundlesSurface,
        surface: this.walletSurface,
        status: this.state.walletPurchaseStatus,
        support: this.state.appConfig?.paymentSupport || {},
        labels: {
          support: this.t.walletSupport,
          terms: this.t.walletTerms,
          status: {
            opening: this.t.walletPayment_opening,
            opened: this.t.walletPayment_opened,
            pending: this.t.walletPayment_pending,
            confirmed: this.t.walletPayment_confirmed,
            expired: this.t.walletPayment_expired,
            failed: this.t.walletPayment_failed
          }
        }
      });
    },
    assetRollFeedback() {
      const status = this.state.assetRollStatus;
      if (!status) return null;
      const errors = {
        complete: this.t.portraitRollErrorComplete,
        burn_unavailable: this.t.portraitBurnErrorUnavailable,
        insufficient: this.t.portraitRollErrorInsufficient,
        unavailable: this.t.portraitRollErrorUnavailable,
        disabled: this.t.portraitRollErrorDisabled,
        invalid: this.t.portraitRollErrorInvalid,
        failed: this.t.portraitRollErrorFailed
      };
      if (!['rolling', 'burning', 'success', 'burned'].includes(status) && !errors[status]) return null;
      return summarizeAssetRollFeedback({
        status,
        result: this.state.assetRollResult,
        errorMessage: this.state.assetRollErrorMessage,
        localizeName: (value) => this.localizedName(value),
        rarityLabel: (rarity) => this.rarityLabel(rarity),
        labels: {
          openingTitle: this.t.portraitRollOpeningTitle,
          openingText: this.t.portraitRollOpening,
          burnOpeningTitle: this.t.portraitBurnOpeningTitle,
          burnOpeningText: this.t.portraitBurnOpening,
          multiResultTitleTemplate: this.t.portraitRollResultsTitle,
          resultTitle: this.t.portraitRollResultTitle,
          resultTemplate: this.t.portraitRollResult,
          burnResultTitle: this.t.portraitBurnResultTitle,
          burnResultTemplate: this.t.portraitBurnResult,
          problemTitle: this.t.portraitRollProblemTitle,
          errors
        }
      });
    },
    assetRollResultPanel() {
      return shapeAssetRollResultPanel(this.assetRollFeedback, {
        baseClass: 'home-pack-roll-result',
        testId: 'home-pack-roll-result'
      });
    },
    rollPackSummaries() {
      if (!this.selectedCharacter) return [];
      const ownedAssetIds = new Set();
      for (const progression of Object.values(this.state.bootstrap?.progression || {})) {
        for (const portrait of progression?.portraits || []) {
          if (portrait.owned && portrait.assetId) ownedAssetIds.add(portrait.assetId);
        }
      }
      return summarizeAssetRollPacks({
        portraits: this.selectedCharacter.portraits || [],
        packs: this.state.bootstrap?.assetPacks || [],
        ownedAssetIds,
        packName: (pack) => this.packName(pack),
        rarityLabel: (rarity) => this.rarityLabel(rarity),
        labels: {
          invalid: this.t.portraitPackInvalid,
          disabled: this.t.portraitPackUnavailable,
          unavailable: this.t.portraitPackUnavailable,
          future: this.t.portraitPackFuture,
          expired: this.t.portraitPackExpired,
          guaranteeTemplate: this.t.portraitPackGuarantee,
          pityTemplate: this.t.portraitPackPity,
          pityReadyTemplate: this.t.portraitPackPityReady,
          duplicateTemplate: this.t.portraitPackDuplicateCopies
        }
      });
    },
    rollPackCards() {
      return shapeAssetPackCardRows(this.rollPackSummaries, {
        labels: {
          copiesCompleteTemplate: this.t.portraitPackCopiesComplete,
          completeTemplate: this.t.portraitPackComplete,
          detailsDuplicateMultiTemplate: this.t.portraitPackDetailsDuplicateMulti,
          detailsDuplicateTemplate: this.t.portraitPackDetailsDuplicate,
          detailsMultiTemplate: this.t.portraitPackDetailsMulti,
          detailsTemplate: this.t.portraitPackDetails,
          oddsTemplate: this.t.portraitPackOdds,
          rollAction: this.t.portraitPackRollAction,
          burnActionTemplate: this.t.portraitPackBurnAction
        }
      });
    },
    assetPacksById() {
      return Object.fromEntries((this.state.bootstrap?.assetPacks || []).map((pack) => [pack.id, pack]));
    },
    roster() {
      const characters = this.state.bootstrap?.characters || [];
      const progression = this.state.bootstrap?.progression || {};
      const activeRunsByCharacter = new Map((this.state.bootstrap?.activeGameRuns || [])
        .map((run) => [run.characterId, run]));
      return characters.map(m => {
        const prog = progression[m.id] || {};
        return {
          ...m,
          level: prog.level || 1,
          tier: prog.tier || 'profileCurrency',
          progressionCurrency: prog.progressionCurrency || 0,
          currentLevelProgressionCurrency: prog.currentLevelProgressionCurrency || 0,
          nextLevelProgressionCurrency: prog.nextLevelProgressionCurrency ?? null,
          wins: prog.wins || 0,
          losses: prog.losses || 0,
          draws: prog.draws || 0,
          isActive: m.id === this.state.bootstrap?.activeCharacterId,
          activeRun: activeRunsByCharacter.get(m.id) || null,
          activePortrait: prog.activePortrait || 'default',
          portraitUrl: prog.activePortraitUrl || m.imagePath,
          portraits: prog.portraits || [],
          activePreset: prog.activePreset || 'default',
          presets: prog.presets || []
        };
      });
    },
    selectedCharacter() {
      return this.roster.find((m) => m.id === this.selectedCharacterId) ||
        this.roster.find((m) => m.isActive) ||
        null;
    },
    topLeaderboard() {
      return (this.state.leaderboard || []).slice(0, 5);
    },
    seasonSummary() {
      const season = this.state.bootstrap?.season || {};
      return this.getSeasonProgressSummary?.(
        season.totalPoints || 0,
        this.state.lang || 'en',
        0,
        season.peakPoints || season.totalPoints || 0
      ) || emptySeasonSummary();
    },
    seasonAchievements() {
      return (this.getAchievementsByIds?.(
        this.state.bootstrap?.season?.recentAchievements || [],
        this.state.lang || 'en'
      ) || []).slice(0, 3);
    },
    nextAchievement() {
      return this.getNextAchievementHint?.(
        this.state.bootstrap?.season?.achievements || [],
        this.state.lang || 'en'
      ) || null;
    },
    activityGroups() {
      const achievements = (this.getAchievementsByIds?.(
        this.state.bootstrap?.season?.recentAchievements || [],
        this.state.lang || 'en'
      ) || [])
        .slice(0, 4)
        .map((achievement) => ({
          id: `achievement-${achievement.id}`,
          title: achievement.name,
          meta: this.state.lang === 'ru' ? 'Достижение получено' : 'Achievement unlocked',
          type: 'achievement',
          achievement,
          at: new Date().toISOString()
        }));
      const runs = (this.state.bootstrap?.gameRunHistory || [])
        .slice(0, 4)
        .map((run) => {
          const described = this.describeRun(run);
          const completedRounds = described?.completedRounds || 0;
          const title = this.t.runActivityTitle
            .replace('{mode}', described?.modeLabel || this.t.gameRuns)
            .replace('{outcome}', described?.outcomeLabel || this.t.gameRuns)
            .replace('{rounds}', completedRounds);
          const meta = [
            described?.ourName || '',
            this.t.runStatsRecord.replace('{wins}', described?.wins || 0).replace('{losses}', described?.losses || 0).replace('{rounds}', completedRounds),
            described?.dateLabel || ''
          ].filter(Boolean).join(' · ');
          return {
            id: `run-${run.id}`,
            title,
            meta,
            type: described?.outcomeKey || 'run',
            at: run.endedAt || run.startedAt || run.createdAt || new Date().toISOString()
          };
        });
      const groups = new Map();
      [...achievements, ...runs]
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        .slice(0, 8)
        .forEach((item) => {
          const label = this.activityDayLabel(item.at);
          if (!groups.has(label)) groups.set(label, []);
          groups.get(label).push(item);
        });
      return Array.from(groups, ([label, items]) => ({ label, items }));
    }
  },
  template: `
    <section class="home" data-testid="home-screen">
      <div class="home-action-rail" :class="{ 'home-action-rail--mobile': mobileActionMode === 'side' }">
        <button class="home-action-btn home-action-btn--notifications" :aria-label="t.notifications" @click="openSocialPanel('notifications')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 17H9m10-2-1.2-1.2A2.7 2.7 0 0 1 17 11.9V9a5 5 0 0 0-10 0v2.9c0 .7-.3 1.4-.8 1.9L5 15h14Zm-5.3 3a2 2 0 0 1-3.4 0"/></svg>
        </button>
        <button class="home-action-btn home-action-btn--friends" :aria-label="t.friends" @click="openSocialPanel('friends')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 19c0-2.2-1.8-4-4-4s-4 1.8-4 4m12 0c0-1.6-1-3-2.4-3.6M4 19c0-1.6 1-3 2.4-3.6M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6-1a2.4 2.4 0 1 0 0-4.8M6 11a2.4 2.4 0 1 1 0-4.8"/></svg>
        </button>
        <button class="home-action-btn home-action-btn--recipes" :aria-label="t.recipes" @click="openSocialPanel('recipes')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5v-13Z"/><path d="M8 7h8M8 11h6"/></svg>
        </button>
        <button class="home-action-btn home-action-btn--settings" :aria-label="t.settings" @click="openSocialPanel('settings')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm7.4-2.2a7.7 7.7 0 0 0 0-2l2-1.5-2-3.5-2.4 1a7.2 7.2 0 0 0-1.7-1l-.3-2.5h-4l-.3 2.5a7.2 7.2 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7.7 7.7 0 0 0 0 2l-2 1.5 2 3.5 2.4-1c.5.4 1.1.8 1.7 1l.3 2.5h4l.3-2.5c.6-.2 1.2-.6 1.7-1l2.4 1 2-3.5-2-1.5Z"/></svg>
        </button>
      </div>

      <home-social-sidebar
        :open="!!socialPanel"
        :panel="socialPanel"
        :state="state"
        :t="t"
        :activity-groups="activityGroups"
        :mobile-action-mode="mobileActionMode"
        :get-artifact="getArtifact"
        :format-artifact-bonus="formatArtifactBonus"
        :build-invite-link="buildInviteLink"
        :share-invite-value="shareInviteValue"
        :fusion-recipes="fusionRecipes"
        @close="socialPanel = ''"
        @add-friend="$emit('add-friend', $event)"
        @challenge-friend="$emit('challenge-friend', $event)"
        @accept-challenge="$emit('accept-challenge')"
        @decline-challenge="$emit('decline-challenge')"
        @set-mobile-action-mode="setMobileActionMode($event)"
        @switch-panel="socialPanel = $event"
      />

      <div v-if="mobileActionMode === 'menu' && state.menuOpen" class="home-menu-actions">
        <button class="home-action-btn home-action-btn--notifications" :aria-label="t.notifications" @click="openSocialPanel('notifications')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 17H9m10-2-1.2-1.2A2.7 2.7 0 0 1 17 11.9V9a5 5 0 0 0-10 0v2.9c0 .7-.3 1.4-.8 1.9L5 15h14Zm-5.3 3a2 2 0 0 1-3.4 0"/></svg>
        </button>
        <button class="home-action-btn home-action-btn--friends" :aria-label="t.friends" @click="openSocialPanel('friends')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 19c0-2.2-1.8-4-4-4s-4 1.8-4 4m12 0c0-1.6-1-3-2.4-3.6M4 19c0-1.6 1-3 2.4-3.6M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6-1a2.4 2.4 0 1 0 0-4.8M6 11a2.4 2.4 0 1 1 0-4.8"/></svg>
        </button>
        <button class="home-action-btn home-action-btn--recipes" :aria-label="t.recipes" @click="openSocialPanel('recipes')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5v-13Z"/><path d="M8 7h8M8 11h6"/></svg>
        </button>
        <button class="home-action-btn home-action-btn--settings" :aria-label="t.settings" @click="openSocialPanel('settings')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm7.4-2.2a7.7 7.7 0 0 0 0-2l2-1.5-2-3.5-2.4 1a7.2 7.2 0 0 0-1.7-1l-.3-2.5h-4l-.3 2.5a7.2 7.2 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7.7 7.7 0 0 0 0 2l-2 1.5 2 3.5 2.4-1c.5.4 1.1.8 1.7 1l.3 2.5h4l.3-2.5c.6-.2 1.2-.6 1.7-1l2.4 1 2-3.5-2-1.5Z"/></svg>
        </button>
      </div>

      <article class="panel home-roster-panel">
        <div class="home-section-header">
          <h3>{{ t.characters }}</h3>
        </div>
        <div class="home-character-list">
          <div v-for="m in roster" :key="m.id" class="home-character-card">
            <div
              class="home-character-row"
              :class="{ 'home-character-row--active': m.isActive, 'home-character-row--selected': selectedCharacter?.id === m.id, 'home-character-row--pulse': pulsingCharacterIds[m.id] }"
              @click="focusCharacter(m)"
              @keydown.enter.prevent="focusCharacter(m)"
              @keydown.space.prevent="focusCharacter(m)"
              role="button"
              tabindex="0"
            >
              <img :src="m.portraitUrl" :alt="m.name[state.lang]" class="home-character-portrait" :style="{ objectPosition: portraitPosition(m.id) }"/>
              <div class="home-character-info">
                <div class="home-character-name-row">
                  <strong>{{ m.name[state.lang] }}</strong>
                  <span v-if="m.tier && ((m.wins || 0) + (m.losses || 0) + (m.draws || 0) > 0)" :class="'home-character-tier tier--' + m.tier">{{ t['tier_' + m.tier] }}</span>
                </div>
                <span class="home-character-style">{{ m.styleTag }}</span>
                <span
                  class="home-character-stats"
                  :class="{ 'home-character-stats--open': openStatsPopover === m.id }"
                  role="button"
                  tabindex="0"
                  :aria-expanded="openStatsPopover === m.id"
                  :aria-label="t.statsLegendOpen"
                  @click="toggleStatsPopover(m.id, $event)"
                  @keydown.enter.stop.prevent="toggleStatsPopover(m.id)"
                  @keydown.space.stop.prevent="toggleStatsPopover(m.id)"
                >
                  <span class="home-character-level">{{ t.level }} {{ m.level }}</span>
                  <span class="home-character-progressionCurrency">
                    <span class="home-character-progressionCurrency-icon" aria-hidden="true">🍄</span>{{ m.progressionCurrency }}<span v-if="pulsingCharacterDeltas[m.id]" class="home-character-progressionCurrency-delta">+{{ pulsingCharacterDeltas[m.id] }}</span>
                  </span>
                  <span v-if="m.wins || m.losses || m.draws" class="home-character-record">
                    <span class="home-character-record-stat home-character-record-stat--win">{{ m.wins }}</span>
                    <span class="home-character-record-stat home-character-record-stat--loss">{{ m.losses }}</span>
                    <span v-if="m.draws" class="home-character-record-stat home-character-record-stat--draw">{{ m.draws }}</span>
                  </span>
                  <div class="home-character-stats-popover" role="tooltip">
                    <p class="home-character-stats-popover-title">{{ t.statsLegendTitle }}</p>
                    <ul>
                      <li>
                        <span class="home-character-progressionCurrency-icon" aria-hidden="true">🍄</span>
                        <span>{{ t.progressionCurrency }}</span>
                      </li>
                      <li>
                        <span class="home-character-record-stat home-character-record-stat--win" aria-hidden="true"></span>
                        <span>{{ t.wins }}</span>
                      </li>
                      <li>
                        <span class="home-character-record-stat home-character-record-stat--loss" aria-hidden="true"></span>
                        <span>{{ t.losses }}</span>
                      </li>
                      <li>
                        <span class="home-character-record-stat home-character-record-stat--draw" aria-hidden="true"></span>
                        <span>{{ t.draws }}</span>
                      </li>
                    </ul>
                  </div>
                </span>
                <div v-if="m.nextLevelProgressionCurrency !== null" class="home-character-progress" :title="m.currentLevelProgressionCurrency + ' / ' + m.nextLevelProgressionCurrency">
                  <div class="home-character-progress-fill" :style="{ width: Math.min(100, Math.round(m.currentLevelProgressionCurrency / m.nextLevelProgressionCurrency * 100)) + '%' }"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="selectedCharacter" class="home-roster-action-panel">
          <div>
            <span>{{ selectedCharacter.name[state.lang] }}</span>
            <strong>{{ state.startingRun ? t.startingRun : selectedCharacter.activeRun ? t.resumeRun : selectedCharacter.isActive ? t.active : t.pick }}</strong>
          </div>
          <div class="home-roster-action-buttons">
            <button
              class="primary"
              :disabled="state.startingRun || !selectedCharacter.isActive || (!selectedCharacter.activeRun && state.bootstrap.battleLimit.used >= state.bootstrap.battleLimit.limit)"
              :title="!selectedCharacter.activeRun && state.bootstrap.battleLimit.used >= state.bootstrap.battleLimit.limit ? t.dailyLimitReached : ''"
              @click="playSelectedCharacter"
            >{{ state.startingRun ? t.startingRun : selectedCharacter.activeRun ? t.resumeRun : t.startRun }}</button>
            <button
              v-if="selectedCharacter.portraits.length > 1"
              class="secondary home-roster-change-skin"
              :class="{ active: expandedCharacterId === selectedCharacter.id }"
              @click="toggleSelectedSkinPanel"
            >{{ t.changeSkin }}</button>
          </div>
        </div>
        <div v-if="selectedCharacter && expandedCharacterId === selectedCharacter.id" class="home-character-picker">
          <div v-if="selectedCharacter.portraits.length > 1" class="home-picker-section">
            <span class="home-picker-label">{{ t.portraits }}</span>
            <div class="home-portrait-swatches">
              <button
                v-for="p in selectedCharacter.portraits" :key="p.id"
                class="home-portrait-swatch"
                :class="{ 'home-portrait-swatch--active': selectedCharacter.activePortrait === p.id, 'home-portrait-swatch--locked': !p.unlocked, 'home-portrait-swatch--buyable': !p.unlocked && p.purchaseAvailable, 'home-portrait-swatch--rollable': !p.unlocked && p.rollAvailable }"
                :data-portrait-id="p.id"
                :data-asset-id="p.assetId"
                :title="portraitActionTitle(p)"
                @click.stop="handlePortraitClick(p)"
              >
                <img
                  :src="p.path"
                  :alt="p.name[state.lang]"
                  :style="{ objectPosition: portraitPositionFor(selectedCharacter.id, p.id) }"
                />
                <span v-if="!p.unlocked" class="home-swatch-price" aria-hidden="true">
                  <span class="home-swatch-price-icon">🪙</span>
                  <span class="home-swatch-price-value">
                    <span class="home-swatch-price-have">{{ walletBalance }}</span><span class="home-swatch-price-sep">/</span>{{ portraitPriceAmount(p) }}
                  </span>
                </span>
              </button>
            </div>
            <GachaPackCardList
              :packs="rollPackCards"
              list-class="home-pack-details"
              card-class="home-pack-detail"
              actions-class="home-pack-actions"
              action-class="link home-pack-action"
              @action="handlePackAction"
            />
            <AssetRollResultPanel :panel="assetRollResultPanel" />
          </div>
        </div>
      </article>

      <nav
        v-if="mobileActionMode !== 'menu'"
        class="home-bottom-actions"
        :class="{
          'home-bottom-actions--visible': showMobileBottomActions
        }"
        :aria-hidden="!showMobileBottomActions"
      >
        <button class="home-action-btn home-action-btn--notifications" :aria-label="t.notifications" @click="openSocialPanel('notifications')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 17H9m10-2-1.2-1.2A2.7 2.7 0 0 1 17 11.9V9a5 5 0 0 0-10 0v2.9c0 .7-.3 1.4-.8 1.9L5 15h14Zm-5.3 3a2 2 0 0 1-3.4 0"/></svg>
        </button>
        <button class="home-action-btn home-action-btn--friends" :aria-label="t.friends" @click="openSocialPanel('friends')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 19c0-2.2-1.8-4-4-4s-4 1.8-4 4m12 0c0-1.6-1-3-2.4-3.6M4 19c0-1.6 1-3 2.4-3.6M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6-1a2.4 2.4 0 1 0 0-4.8M6 11a2.4 2.4 0 1 1 0-4.8"/></svg>
        </button>
        <button class="home-action-btn home-action-btn--recipes" :aria-label="t.recipes" @click="openSocialPanel('recipes')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5v-13Z"/><path d="M8 7h8M8 11h6"/></svg>
        </button>
        <button class="home-action-btn home-action-btn--settings" :aria-label="t.settings" @click="openSocialPanel('settings')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm7.4-2.2a7.7 7.7 0 0 0 0-2l2-1.5-2-3.5-2.4 1a7.2 7.2 0 0 0-1.7-1l-.3-2.5h-4l-.3 2.5a7.2 7.2 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7.7 7.7 0 0 0 0 2l-2 1.5 2 3.5 2.4-1c.5.4 1.1.8 1.7 1l.3 2.5h4l.3-2.5c.6-.2 1.2-.6 1.7-1l2.4 1 2-3.5-2-1.5Z"/></svg>
        </button>
      </nav>

      <article class="panel home-season-panel" :class="'home-season-panel--' + seasonSummary.id">
        <div class="home-season-main">
          <season-rank-emblem class="home-season-emblem" :rank-id="seasonSummary.id" :size="84" />
          <div class="home-season-copy">
            <p class="home-season-kicker">{{ seasonSummary.seasonName }}</p>
            <h3>{{ seasonSummary.name }}</h3>
            <p>{{ seasonSummary.seasonTheme }}</p>
          </div>
          <div class="home-season-points">
            <strong>{{ seasonSummary.totalPoints }} {{ t.seasonPoints }}</strong>
            <span>{{ seasonSummary.isMax ? t.seasonMaxLevel : seasonSummary.pointsToNext + ' ' + t.seasonPointsToNext + ' ' + seasonSummary.nextName }}</span>
          </div>
        </div>
        <div class="home-season-progress" aria-hidden="true">
          <span :style="{ width: seasonSummary.progress + '%' }"></span>
        </div>
        <div v-if="seasonAchievements.length" class="home-season-achievements">
          <article
            v-for="(achievement, index) in seasonAchievements"
            :key="achievement.id"
            class="home-season-achievement"
            :class="['home-season-achievement--' + achievement.type, 'home-season-achievement--accent-' + achievement.accent]"
            :style="{ animationDelay: (index * 70) + 'ms' }"
          >
            <achievement-badge :achievement="achievement" size="small" />
            <div>
              <strong>{{ achievement.name }}</strong>
              <p>{{ achievement.lore }}</p>
            </div>
          </article>
        </div>
        <div v-else-if="nextAchievement" class="home-season-next-badge">
          <achievement-badge :achievement="nextAchievement" size="small" />
          <div>
            <strong>{{ t.nextAchievement }}</strong>
            <p>{{ nextAchievement.name }}</p>
          </div>
        </div>
      </article>

      <div class="home-columns home-main-columns">
        <article class="panel home-section">
          <div class="home-section-header">
            <h3>{{ t.gameRuns }}</h3>
            <button v-if="!state.gameRun && activeCharacter" class="primary home-start-btn" data-testid="home-start-run" :disabled="state.startingRun || state.bootstrap.battleLimit.used >= state.bootstrap.battleLimit.limit" :title="state.bootstrap.battleLimit.used >= state.bootstrap.battleLimit.limit ? t.dailyLimitReached : ''" @click="$emit('start-run', 'solo')">{{ state.startingRun ? t.startingRun : t.startRun }}</button>
            <button v-if="state.bootstrap.gameRunHistory?.length" class="link" @click="$emit('go', 'history')">{{ t.viewAll }}</button>
          </div>

          <p v-if="!state.gameRun && state.bootstrap.battleLimit.used >= state.bootstrap.battleLimit.limit" class="home-limit-hint">{{ t.dailyLimitReached }}</p>

          <!-- Active run as first item -->
          <div v-if="state.gameRun && !state.startingRun && activeCharacter" class="home-run-item home-run-item--active" @click="$emit('resume-run')">
            <img :src="activeCharacter.imagePath" :alt="activeCharacter.name[state.lang]" class="home-run-item-portrait" :style="{ objectPosition: portraitPosition(activeCharacter.id) }"/>
            <div class="home-run-item-info">
              <strong>{{ t.round }} {{ state.gameRun.currentRound }}</strong>
              <span class="home-run-item-stats">{{ t.wins }} {{ state.gameRun.player?.wins || 0 }} · {{ t.lives }} {{ state.gameRun.player?.livesRemaining || 0 }}</span>
            </div>
            <button class="primary home-run-item-action" data-testid="home-resume-run" @click.stop="$emit('resume-run')">{{ t.continueRound }}</button>
          </div>

          <!-- Recent runs (1 row per game run, not per battle — per Req 1-A) -->
          <div v-if="state.bootstrap.gameRunHistory?.length" class="home-run-list">
            <div
              v-for="run in state.bootstrap.gameRunHistory.slice(0, 5)"
              :key="run.id"
              class="home-run-item"
              :class="'home-run-item--' + (describeRun(run)?.outcomeKey || 'abandoned')"
              @click="$emit('load-run-summary', run.id)"
            >
              <img v-if="describeRun(run)?.ourImage" :src="describeRun(run).ourImage" :alt="describeRun(run)?.ourName" class="home-run-item-portrait" :style="{ objectPosition: portraitPosition(describeRun(run)?.characterId) }" />
              <div class="home-run-item-info">
                <strong>{{ describeRun(run)?.outcomeLabel }}</strong>
                <span class="home-run-item-stats">
                  <span class="home-run-item-stats-name">{{ describeRun(run)?.ourName }}</span>
                  <span v-if="(describeRun(run)?.wins || 0) + (describeRun(run)?.losses || 0) > 0" class="home-run-item-record">
                    <span class="home-character-record-stat home-character-record-stat--win">{{ describeRun(run)?.wins || 0 }}</span>
                    <span class="home-character-record-stat home-character-record-stat--loss">{{ describeRun(run)?.losses || 0 }}</span>
                  </span>
                </span>
              </div>
              <span class="home-run-item-date">{{ describeRun(run)?.dateLabel }}</span>
            </div>
          </div>

          <!-- Empty state -->
          <p v-if="!state.gameRun && !state.startingRun && !state.bootstrap.gameRunHistory?.length" class="home-empty-hint home-empty-hint--center">{{ t.noGameRunsYetCta }}</p>

          <!-- Footer stats -->
          <div class="home-run-footer">
            <span class="home-wallet-footer" @click.stop>
              <span>{{ t.profileCurrency }} <strong>{{ walletBalance }}</strong></span>
              <button class="link home-wallet-buy" :aria-expanded="walletShopOpen" @click.stop="toggleWalletShop">{{ t.walletBuy }}</button>
              <div v-if="walletShopOpen" class="home-wallet-shop" role="dialog" :aria-label="t.walletShopTitle">
                <div class="home-wallet-shop-header">
                  <strong>{{ t.walletShopTitle }}</strong>
                  <button class="ghost home-wallet-shop-close" :aria-label="t.close" @click="walletShopOpen = false">×</button>
                </div>
                <p v-if="state.walletBundlesLoading" class="home-wallet-shop-note">{{ t.loading }}</p>
                <div v-else-if="walletBundles.length" class="home-wallet-bundles">
                  <button
                    v-for="bundle in walletBundles"
                    :key="bundle.provider + ':' + bundle.id"
                    class="home-wallet-bundle"
                    @click="handleWalletPurchase(bundle)"
                  >
                    <strong>+{{ bundle.walletAmount }}</strong>
                    <span>{{ walletProviderLabel(bundle.provider) }} · {{ formatWalletBundlePrice(bundle) }}</span>
                  </button>
                </div>
                <p v-else class="home-wallet-shop-note">{{ t.walletBundlesUnavailable }}</p>
                <p class="home-wallet-shop-note">{{ t.walletPaymentNote }}</p>
                <p v-if="walletPurchaseStatusText" class="home-wallet-shop-status">{{ walletPurchaseStatusText }}</p>
                <div v-if="paymentSupportEntries().length" class="home-wallet-links">
                  <a v-for="link in paymentSupportEntries()" :key="link.label" :href="link.url" target="_blank" rel="noopener noreferrer">{{ link.label }}</a>
                </div>
              </div>
            </span>
            <span>{{ t.battleLimit }} <strong>{{ state.bootstrap.battleLimit.used }} / {{ state.bootstrap.battleLimit.limit }}</strong></span>
          </div>
        </article>

        <article class="panel home-section leaderboard-panel" v-if="topLeaderboard.length">
          <div class="home-section-header">
            <h3>{{ t.leaderboard }}</h3>
            <button class="link" @click="$emit('go', 'leaderboard')">{{ t.viewAll }}</button>
          </div>
          <div class="home-leaderboard">
            <div
              v-for="entry in topLeaderboard" :key="entry.id"
              class="home-leaderboard-row"
              :class="{ 'home-leaderboard-row--self': entry.id === state.bootstrap.player.id }"
            >
              <span class="home-leaderboard-rank">#{{ entry.rank }}</span>
              <strong class="home-leaderboard-name">{{ entry.name }}</strong>
              <span class="home-leaderboard-rating">{{ entry.rating }}</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  `
};
