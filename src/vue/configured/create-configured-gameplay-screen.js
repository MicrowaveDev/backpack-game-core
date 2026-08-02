import {
  ArtifactGridBoard,
  ArtifactStatSummary,
  BackpackZone,
  InventoryZone,
  PrepActions,
  PrepScreen,
  RunCompleteScreen,
  RunHud,
  RunSummaryScreen,
  ShopZone
} from '@microwavedev/backpack-game-core/vue/components';
import { ReplayDetailScreen } from '@microwavedev/backpack-game-core/vue/pages';
import { replayTimelineViewState } from '@microwavedev/backpack-game-core/client-view-model';
import {
  createPrepTutorialEvents,
  createRoundTutorialEvent
} from '@microwavedev/backpack-game-core/modules/tutorial';

function unplaced(row) {
  return Number(row?.x) < 0 || Number(row?.y) < 0;
}

function rowId(payload) {
  return payload?.id || payload?.rowId || payload?.item?.id || payload?.item?.rowId || '';
}

function requiredFunction(options, key) {
  if (typeof options[key] !== 'function') {
    throw new TypeError(`createConfiguredGameplayScreen requires options.${key}`);
  }
  return options[key];
}

export function createConfiguredGameplayScreen(options = {}) {
  const gridColumns = Number(options.gridColumns);
  const gridRows = Number(options.gridRows);
  const getArtifactById = requiredFunction(options, 'getArtifactById');
  const findBagPlacement = requiredFunction(options, 'findBagPlacement');
  const findPlacement = requiredFunction(options, 'findPlacement');
  const loadoutGridProps = requiredFunction(options, 'loadoutGridProps');
  const artifactFigureComponent = options.artifactFigureComponent;
  const replayDuelComponent = options.replayDuelComponent;
  const getLocale = options.getLocale || ((controller) => controller.state.locale);
  const getText = options.getText || ((controller) => controller.text);
  const getClientServices = options.getClientServices || ((controller) => controller.clientServices);
  const getTutorialController = options.getTutorialController || ((controller) => controller.tutorial || null);
  const tutorialMaxRounds = Math.max(0, Number(options.tutorialMaxRounds) || 0);
  const shapeRunCompleteSummary = typeof options.shapeRunCompleteSummary === 'function'
    ? options.shapeRunCompleteSummary
    : null;
  const replaySpeedOptions = Array.isArray(options.replaySpeedOptions) && options.replaySpeedOptions.length
    ? options.replaySpeedOptions
    : [{ speed: 2, count: 1 }, { speed: 4, count: 2 }, { speed: 8, count: 3 }];
  const allowedReplaySpeeds = replaySpeedOptions.map((item) => Number(item.speed)).filter(Number.isFinite);
  const defaultReplaySpeed = allowedReplaySpeeds.includes(Number(options.defaultReplaySpeed))
    ? Number(options.defaultReplaySpeed)
    : allowedReplaySpeeds[0];
  const replayEventDelayMs = Number(options.replayEventDelayMs) > 0
    ? Number(options.replayEventDelayMs)
    : null;
  const replayMinDelayMs = Math.max(25, Number(options.replayMinDelayMs) || 25);
  const runCompletePrimaryAction = options.runCompletePrimaryAction === 'home'
    ? 'home'
    : 'start-run';

  if (!Number.isInteger(gridColumns) || gridColumns < 1) {
    throw new TypeError('createConfiguredGameplayScreen requires a positive integer options.gridColumns');
  }
  if (!Number.isInteger(gridRows) || gridRows < 1) {
    throw new TypeError('createConfiguredGameplayScreen requires a positive integer options.gridRows');
  }
  if (!artifactFigureComponent) {
    throw new TypeError('createConfiguredGameplayScreen requires options.artifactFigureComponent');
  }
  if (!replayDuelComponent) {
    throw new TypeError('createConfiguredGameplayScreen requires options.replayDuelComponent');
  }

  return {
    name: options.name || 'ConfiguredGameplayScreen',
    components: {
      ArtifactFigure: artifactFigureComponent,
      ArtifactGridBoard,
      ArtifactStatSummary,
      BackpackZone,
      InventoryZone,
      PrepActions,
      PrepScreen,
      ReplayDetailScreen,
      ReplayDuel: replayDuelComponent,
      RunCompleteScreen,
      RunHud,
      RunSummaryScreen,
      ShopZone
    },
    props: {
      controller: { type: Object, required: true },
      navigate: { type: Function, required: true }
    },
    data() {
      const locale = getLocale(this.controller);
      const preferredReplaySpeed = Number(this.controller.profileSettings?.replaySpeed);
      return {
        activeRun: this.controller.state.selectedHistoryRun
          || this.controller.state.bootstrap?.activeRun
          || null,
        battle: this.controller.state.bootstrap?.activeRun?.lastBattle || null,
        loading: false,
        notice: '',
        draggingRowId: '',
        showReplay: false,
        replayTimer: null,
        replayState: {
          lang: locale,
          currentBattle: this.controller.state.bootstrap?.activeRun?.lastBattle || null,
          gameRun: this.controller.state.bootstrap?.activeRun || null,
          gameRunResult: null,
          replayIndex: 0,
          replaySpeed: allowedReplaySpeeds.includes(preferredReplaySpeed)
            ? preferredReplaySpeed
            : defaultReplaySpeed
        }
      };
    },
  computed: {
    text() {
      return getText(this.controller);
    },
    locale() {
      return getLocale(this.controller);
    },
    clientServices() {
      return getClientServices(this.controller);
    },
    bootstrap() {
      return this.controller.state.bootstrap || {};
    },
    run() {
      return this.activeRun || this.bootstrap.activeRun || null;
    },
    runIsActive() {
      return this.run?.status === 'active';
    },
    characters() {
      return this.controller.characters;
    },
    selectedCharacterId() {
      return this.bootstrap.profile?.activeCharacterId
        || this.bootstrap.player?.activeCharacterId
        || '';
    },
    grid() {
      return loadoutGridProps(this.run?.loadoutItems || []);
    },
    placedItems() {
      return this.grid.items || [];
    },
    containerItems() {
      return (this.run?.loadoutItems || [])
        .filter(unplaced)
        .map((row) => ({ ...this.getArtifact(row.artifactId), ...row, rowId: row.id }));
    },
    activeContainers() {
      return (this.run?.loadoutItems || [])
        .filter((row) => !unplaced(row) && this.getArtifact(row.artifactId)?.family === 'bag')
        .filter((row) => row.artifactId !== 'starter_bag')
        .map((row) => {
          const artifact = this.getArtifact(row.artifactId);
          return {
            id: row.id,
            artifactId: row.artifactId,
            name: this.artifactName(artifact),
            color: artifact?.color || '#888',
            draggable: true,
            rotatable: artifact?.width !== artifact?.height
          };
        });
    },
    shopRows() {
      return (this.run?.shopItems || []).map((row) => ({
        ...row,
        name: this.artifactName(row.artifact),
        description: this.artifactDescription(row.artifact),
        statRows: (row.statRows || []).map((stat) => ({
          ...stat,
          label: this.statLabels[stat.key] || stat.label || stat.key
        }))
      }));
    },
    runSummary() {
      if (!this.run || this.run.status === 'active') return null;
      const character = this.characters.find((entry) => entry.id === this.run.characterId);
      const outcome = this.run.endReason === 'max_rounds'
        ? 'win'
        : this.run.endReason === 'max_losses'
          ? 'loss'
          : 'abandoned';
      return {
        title: this.text.runSummaryTitle,
        outcome: {
          key: outcome,
          label: outcome === 'win'
            ? this.text.runOutcomeWin
            : outcome === 'loss'
              ? this.text.runOutcomeLoss
              : this.text.runOutcomeAbandoned
        },
        character: character ? {
          id: character.id,
          name: this.artifactName(character),
          imageSrc: character.imagePath || character.image,
          imageAlt: this.artifactName(character)
        } : null,
        stats: [
          { key: 'wins', label: this.text.wins, value: this.run.player?.wins || 0 },
          { key: 'losses', label: this.text.losses, value: this.run.player?.losses || 0 },
          { key: 'rounds', label: this.text.rounds, value: this.run.player?.completedRounds || 0 }
        ],
        roundsTitle: this.text.battles,
        rounds: (this.run.battles || []).map((battle) => ({
          key: battle.id,
          battleId: battle.id,
          tone: battle.outcome || 'unknown',
          numberLabel: `${this.text.round} ${battle.roundNumber}`,
          outcomeLabel: battle.outcome === 'win'
            ? this.text.outcomeWin
            : battle.outcome === 'loss'
              ? this.text.outcomeLoss
              : this.text.outcomeDraw
        })),
        homeLabel: this.text.close
      };
    },
    runCompleteSummary() {
      if (!this.runSummary || !shapeRunCompleteSummary) return null;
      const character = this.characters.find((entry) => entry.id === this.run.characterId) || null;
      return shapeRunCompleteSummary({
        run: this.run,
        character,
        bootstrap: this.bootstrap,
        text: this.text,
        locale: this.locale,
        fallbackSummary: this.runSummary
      });
    },
    replayTimeline() {
      return replayTimelineViewState({
        battle: this.replayState.currentBattle,
        replayIndex: this.replayState.replayIndex,
        formatEvent: this.formatReplayEvent
      });
    },
    backpackLabels() {
      return {
        title: this.text.backpack,
        bagSlots: this.text.bagSlots,
        empty: this.text.backpackEmpty
      };
    },
    shopLabels() {
      return {
        title: this.text.shop,
        refresh: this.text.refreshShop,
        refreshPricePrefix: '◉',
        pricePrefix: '◉ ',
        characterItem: this.text.characterItem,
        bagSlots: this.text.bagSlots
      };
    },
    actionLabels() {
      return {
        ready: this.text.battle,
        readying: this.text.loading,
        abandon: this.text.abandonRun
      };
    },
    statLabels() {
      return {
        damage: this.text.statDamage,
        armor: this.text.statArmor,
        speed: this.text.statSpeed,
        stunChance: this.text.statStun
      };
    },
    walletBalance() {
      return this.bootstrap.wallet?.balances?.soft_coin || 0;
    },
    replayDuelComponent() {
      return replayDuelComponent;
    }
  },
  mounted() {
    this.emitPrepTutorial();
  },
  watch: {
    shopRows: {
      handler() {
        this.emitPrepTutorial();
      },
      deep: true
    }
  },
  beforeUnmount() {
    this.clearReplayTimer();
  },
  methods: {
    emitPrepTutorial() {
      const tutorial = getTutorialController(this.controller);
      if (!tutorial || !this.runIsActive || this.showReplay) return;
      const events = createPrepTutorialEvents({
        shopItems: this.run?.shopItems || [],
        inventoryItems: this.run?.loadoutItems || [],
        getArtifact: (entry) => entry?.artifact || this.getArtifact(entry?.artifactId || entry?.id),
        imageForArtifact: (artifact) => this.artifactImage(artifact)
      });
      for (const event of events) tutorial.emit(event);
    },
    getArtifact(id) {
      return getArtifactById(id, this.controller)
        || this.controller.artifacts.find((entry) => entry.id === id);
    },
    artifactName(artifact) {
      const name = artifact?.displayName || artifact?.name;
      if (typeof name === 'object') {
        return name[this.locale] || name.en || name.ru || artifact?.id || '';
      }
      return name || artifact?.id || '';
    },
    artifactDescription(artifact) {
      const value = artifact?.description;
      if (typeof value === 'object') {
        return value[this.locale] || value.en || value.ru || '';
      }
      return value || '';
    },
    artifactImage(artifact) {
      return artifact?.image || artifact?.imagePath || '';
    },
    formatStats(item) {
      const bonus = item?.bonus || {};
      return Object.entries(bonus)
        .filter(([, value]) => Number(value) !== 0)
        .map(([key, value]) => ({
          key,
          label: this.statLabels[key] || key,
          value: Number(value) > 0 ? `+${value}` : String(value),
          positive: Number(value) > 0
        }));
    },
    formatDelta(value) {
      const amount = Number(value) || 0;
      return amount > 0 ? `+${amount}` : String(amount);
    },
    formatReplayEvent(event) {
      const narration = event?.narration || '';
      return {
        logText: narration,
        statusText: narration,
        speechSide: event?.actorSide || '',
        speechText: event?.actorSide ? narration : ''
      };
    },
    buildReplayFighter(characterId, options = {}) {
      const character = this.characters.find((entry) => entry.id === characterId) || null;
      return {
        ...options,
        character,
        characterId,
        imagePath: options.imagePath || character?.imagePath || character?.image || ''
      };
    },
    loadoutStatsText(loadout) {
      const items = loadout?.items || loadout || [];
      const totals = { damage: 0, armor: 0, speed: 0, stunChance: 0 };
      for (const item of items) {
        const bonus = this.getArtifact(item.artifactId)?.bonus || {};
        for (const key of Object.keys(totals)) totals[key] += Number(bonus[key]) || 0;
      }
      return Object.entries(totals)
        .filter(([, value]) => value)
        .map(([key, value]) => `${this.statLabels[key] || key} ${this.formatDelta(value)}`)
        .join(' / ');
    },
    clearReplayTimer() {
      if (this.replayTimer) globalThis.clearTimeout(this.replayTimer);
      this.replayTimer = null;
    },
    scheduleReplayAdvance() {
      this.clearReplayTimer();
      const events = this.replayState.currentBattle?.events || [];
      if (!this.showReplay || this.replayState.replayIndex >= events.length - 1) return;
      const selectedSpeed = Math.max(0.25, Number(this.replayState.replaySpeed) || defaultReplaySpeed);
      const speedBoost = Math.max(1, Number(this.replayTimeline.longBattleSpeedBoost) || 1);
      const targetDuration = events.length > 40 ? 2400 : 3200;
      const delay = replayEventDelayMs
        ? Math.max(replayMinDelayMs, Math.round(replayEventDelayMs / selectedSpeed / speedBoost))
        : Math.max(
            replayMinDelayMs,
            Math.round(targetDuration / Math.max(1, events.length) / selectedSpeed)
          );
      this.replayTimer = globalThis.setTimeout(() => {
        this.replayState.replayIndex += 1;
        this.scheduleReplayAdvance();
      }, delay);
    },
    beginReplay(battle, result = null) {
      this.battle = battle;
      this.replayState.lang = this.locale;
      this.replayState.currentBattle = battle;
      this.replayState.gameRun = result?.run || this.run;
      this.replayState.gameRunResult = result
        ? { ...result.run, lastRound: battle.roundResult, player: result.run?.player }
        : null;
      this.replayState.replayIndex = 0;
      this.showReplay = true;
      this.scheduleReplayAdvance();
    },
    setReplaySpeed(speed) {
      const nextSpeed = Number(speed);
      if (!allowedReplaySpeeds.includes(nextSpeed)) return;
      this.replayState.replaySpeed = nextSpeed;
      this.scheduleReplayAdvance();
    },
    finishReplay() {
      this.clearReplayTimer();
      this.showReplay = false;
      const tutorial = getTutorialController(this.controller);
      if (tutorial && this.battle) {
        tutorial.emit(createRoundTutorialEvent({
          outcome: this.battle.outcome || this.battle.roundResult?.outcome,
          player: this.run?.player || {},
          maxRounds: tutorialMaxRounds || this.run?.maxRounds || 0,
          runEnded: this.run?.status !== 'active',
          endReason: this.run?.endReason || ''
        }));
      }
      this.emitPrepTutorial();
    },
    previewOrientation(item) {
      return {
        width: Number(item?.width) || 1,
        height: Number(item?.height) || 1
      };
    },
    async refreshBootstrap() {
      await this.controller.refreshBootstrap();
      this.activeRun = this.controller.state.bootstrap?.activeRun || this.activeRun;
    },
    async mutate(action, operation) {
      this.loading = true;
      this.notice = '';
      this.controller.state.error = '';
      try {
        const result = await operation();
        const nextRun = result?.run || (result?.id && result?.shopItems ? result : null);
        if (nextRun) this.activeRun = nextRun;
        if (result?.battle) this.battle = result.battle;
        if (result?.walletTransaction && !result?.battle) {
          this.notice = `${this.text.earned}: ${result.walletTransaction.delta}`;
        }
        await this.refreshBootstrap();
        return result;
      } catch (error) {
        this.controller.state.error = `${action}: ${error.message}`;
        return null;
      } finally {
        this.loading = false;
      }
    },
    startRun() {
      return this.mutate(this.text.startRun, async () => {
        const run = await this.clientServices.services.run.start(this.selectedCharacterId);
        this.activeRun = run;
        this.battle = null;
        return run;
      });
    },
    handleRunCompletePrimary() {
      return runCompletePrimaryAction === 'home'
        ? this.closeSummary()
        : this.startRun();
    },
    async selectCharacter(characterId) {
      await this.controller.selectCharacter(characterId);
      this.activeRun = this.controller.state.bootstrap?.activeRun || null;
    },
    buy(row) {
      if (!this.runIsActive || !row?.canAfford) return;
      return this.mutate(this.text.buy, () => (
        this.clientServices.services.run.buy(this.run.id, row.artifactId)
      ));
    },
    sell(payload) {
      const id = rowId(payload);
      if (!id || !this.runIsActive) return;
      return this.mutate(this.text.sell, () => (
        this.clientServices.services.run.sell(this.run.id, id)
      ));
    },
    refreshShop() {
      if (!this.runIsActive) return;
      return this.mutate(this.text.refreshShop, () => (
        this.clientServices.services.run.refreshShop(this.run.id)
      ));
    },
    resolveBattle() {
      if (!this.runIsActive) return;
      return this.mutate(this.text.battle, () => (
        this.clientServices.services.run.battle(this.run.id)
      )).then((result) => {
        if (result?.battle) this.beginReplay(result.battle, result);
        return result;
      });
    },
    abandonRun() {
      if (!this.runIsActive) return;
      return this.mutate(this.text.abandonRun, () => (
        this.clientServices.services.run.abandon(this.run.id)
      ));
    },
    async saveRows(rows) {
      return this.mutate(this.text.saveLoadout, () => (
        this.clientServices.services.run.saveLoadout(
          this.run.id,
          rows,
          this.run.revision
        )
      ));
    },
    autoPlace(payload) {
      const id = rowId(payload);
      const source = this.run?.loadoutItems?.find((row) => row.id === id);
      const artifact = this.getArtifact(source?.artifactId);
      if (!source || !artifact) return;
      const placement = artifact.family === 'bag'
        ? findBagPlacement(this.run.loadoutItems, artifact, source.rotated || 0)
        : findPlacement(this.run.loadoutItems, artifact);
      if (!placement) return;
      const rows = this.run.loadoutItems.map((row) => (
        row.id === id ? { ...row, ...placement } : row
      ));
      return this.saveRows(rows);
    },
    unplace(payload) {
      const id = rowId(payload);
      if (!id) return;
      const rows = this.run.loadoutItems.map((row) => (
        row.id === id ? { ...row, x: -1, y: -1, active: false } : row
      ));
      return this.saveRows(rows);
    },
    rotate(payload) {
      const id = rowId(payload);
      if (!id) return;
      const rows = this.run.loadoutItems.map((row) => (
        row.id === id
          ? { ...row, width: row.height, height: row.width, rotated: ((row.rotated || 0) + 1) % 4 }
          : row
      ));
      return this.saveRows(rows);
    },
    dragStart(payload) {
      const id = rowId(payload);
      this.draggingRowId = id;
      payload?.event?.dataTransfer?.setData?.('text/plain', id);
    },
    cellDrop(payload) {
      const id = payload?.event?.dataTransfer?.getData?.('text/plain') || this.draggingRowId;
      if (!id) return;
      const rows = this.run.loadoutItems.map((row) => (
        row.id === id ? { ...row, x: payload.x, y: payload.y } : row
      ));
      this.draggingRowId = '';
      return this.saveRows(rows);
    },
    openRound(battleId) {
      const battle = this.run?.battles?.find((entry) => entry.id === battleId) || this.battle;
      if (battle) this.beginReplay(battle);
    },
    async closeSummary() {
      this.controller.state.selectedHistoryRun = null;
      this.activeRun = null;
      await this.refreshBootstrap();
      this.navigate('home');
    }
  },
  template: `
    <section class="stack">
      <div v-if="notice" class="notice" data-testid="status-notice">{{ notice }}</div>

      <RunCompleteScreen
        v-if="runCompleteSummary && !showReplay"
        :summary="runCompleteSummary"
        @primary="handleRunCompletePrimary"
        @secondary="closeSummary"
      />

      <RunSummaryScreen
        v-else-if="runSummary && !showReplay"
        :summary="runSummary"
        @home="closeSummary"
        @open-round="openRound"
      />

      <ReplayDetailScreen
        v-else-if="showReplay && battle"
        :state="replayState"
        :t="text"
        :format-delta="formatDelta"
        :active-event="replayTimeline.activeEvent"
        :active-speech="replayTimeline.activeSpeech"
        :battle-status-text="replayTimeline.battleStatusText"
        :replay-finished="replayTimeline.replayFinished"
        :active-replay-state="replayTimeline.activeReplayState"
        :visible-replay-events="replayTimeline.visibleReplayEvents"
        :long-battle-speed-boost="replayTimeline.longBattleSpeedBoost"
        :replay-speed-options="replaySpeedOptions"
        :build-replay-fighter="buildReplayFighter"
        :get-character="(id) => characters.find((entry) => entry.id === id)"
        :loadout-stats-text="loadoutStatsText"
        :get-artifact="getArtifact"
        :replay-duel-component="replayDuelComponent"
        profile-reward-key="profileCurrency"
        progression-reward-key="progressionCurrency"
        progression-reward-icon="◆"
        @go-results="finishReplay"
        @set-speed="setReplaySpeed"
      />

      <PrepScreen
        v-else-if="runIsActive"
        :ready="true"
        :round-label="text.round"
        :round-number="run.currentRound"
      >
        <template #hud>
          <RunHud
            :player="run.player"
            :labels="{ wins: text.wins, lives: text.lives }"
            :run-currency="{ amount: run.player?.coins || 0, icon: '◉' }"
          />
        </template>

        <template #loadout>
          <BackpackZone
            :items="containerItems"
            :labels="backpackLabels"
            :lang="locale"
            :name-for-item="artifactName"
            :format-item-stats="formatStats"
            :preview-orientation-for-item="previewOrientation"
            @select-item="autoPlace"
          >
            <template #visual="{ item, orientation, previewItem }">
              <ArtifactGridBoard
                class="container-item-visual"
                variant="catalog"
                :columns="orientation.width"
                :rows="orientation.height"
                :items="previewItem"
                :get-artifact="getArtifact"
                :artifact-figure-component="ArtifactFigure"
                :artifact-image-for="artifactImage"
              />
            </template>
          </BackpackZone>

          <InventoryZone
            :items="placedItems"
            :active-containers="activeContainers"
            :totals="run.loadoutTotals"
            :total-rows="grid.totalRows"
            :bag-rows="grid.bagRows"
            :labels="{ rotateAction: '↻', removeAction: '×', statSummaryAriaLabel: text.stats }"
            @remove-item="unplace"
            @rotate-item="rotate"
            @cell-drop="cellDrop"
            @item-drag-start="dragStart"
            @item-drag-end="draggingRowId = ''"
            @deactivate-container="unplace"
            @rotate-container="rotate"
            @container-chip-drag-start="dragStart"
          >
            <template #grid="slot">
              <ArtifactGridBoard
                data-testid="backpack-grid"
                variant="inventory"
                :class="slot.gridClass"
                :inventory-columns="gridColumns"
                :inventory-rows="gridRows"
                :total-rows="slot.totalRows"
                :items="slot.items"
                :bag-rows="slot.bagRows"
                :get-artifact="getArtifact"
                :artifact-figure-component="ArtifactFigure"
                :artifact-image-for="artifactImage"
                :clickable-pieces="true"
                :rotatable-pieces="true"
                :droppable="true"
                :draggable-pieces="true"
                @piece-click="slot.onRemoveItem"
                @piece-rotate="slot.onRotateItem"
                @cell-drop="slot.onCellDrop"
                @piece-drag-start="slot.onItemDragStart"
                @piece-drag-end="slot.onItemDragEnd"
              />
            </template>
            <template #footer="{ totals, ariaLabel }">
              <ArtifactStatSummary :totals="totals" :labels="statLabels" :aria-label="ariaLabel" />
            </template>
          </InventoryZone>
        </template>

        <template #shop>
          <ShopZone
            :rows="shopRows"
            :labels="shopLabels"
            :refresh-cost="1"
            :refresh-disabled="(run.player?.coins || 0) < 1"
            :show-sell-zone="false"
            @buy="buy"
            @refresh="refreshShop"
          >
            <template #visual="{ row }">
              <ArtifactGridBoard
                class="shop-item-visual"
                variant="catalog"
                :columns="row.previewOrientation.width"
                :rows="row.previewOrientation.height"
                :items="row.previewItem"
                :get-artifact="getArtifact"
                :artifact-figure-component="ArtifactFigure"
                :artifact-image-for="artifactImage"
              />
            </template>
          </ShopZone>
        </template>

        <template #actions>
          <PrepActions
            :action-in-flight="loading"
            :labels="actionLabels"
            @ready="resolveBattle"
            @abandon="abandonRun"
          />
        </template>
      </PrepScreen>

      <section v-else-if="!runSummary" class="panel game-empty-state">
        <button class="primary" data-testid="start-run" type="button" @click="startRun">
          {{ text.startRun }}
        </button>
      </section>
    </section>
  `,
    setup() {
      return {
        ArtifactFigure: artifactFigureComponent,
        gridColumns,
        gridRows,
        replaySpeedOptions
      };
    }
  };
}
