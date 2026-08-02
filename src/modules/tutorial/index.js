export const TUTORIAL_VERSION = 1;

export const TUTORIAL_STEP_IDS = Object.freeze([
  'build_backpack',
  'automatic_artifacts',
  'bags_add_space',
  'round_progress'
]);

const EVENT_STEP = Object.freeze({
  prep_ready: 'build_backpack',
  artifact_available: 'automatic_artifacts',
  bag_offer_visible: 'bags_add_space',
  round_completed: 'round_progress'
});

export const DEFAULT_TUTORIAL_COPY = Object.freeze({
  en: Object.freeze({
    gotIt: 'Got it',
    skip: 'Skip tutorial',
    close: 'Close',
    build_backpack: Object.freeze({
      title: 'Build your backpack',
      body: 'Choose items from the shop and place them in your backpack. When you are ready, start the battle.'
    }),
    automatic_artifacts: Object.freeze({
      title: 'Items work automatically',
      body: 'You do not use items during battle. Their damage, armor, speed, and other effects work automatically.'
    }),
    bags_add_space: Object.freeze({
      title: 'Bags add space',
      body: 'A bag opens more cells for your items. Buy it, then place it where it fits without covering another bag.'
    }),
    round_progress: Object.freeze({
      winTitle: 'Round won',
      lossTitle: 'Round lost',
      drawTitle: 'Round finished',
      body: 'You have {lives} {lifeWord} left. {rounds} {roundWord} remain in this run.',
      lastBody: 'You have {lives} {lifeWord} left. That was the last round of this run.'
    })
  }),
  ru: Object.freeze({
    gotIt: 'Понятно',
    skip: 'Пропустить обучение',
    close: 'Закрыть',
    build_backpack: Object.freeze({
      title: 'Собери рюкзак',
      body: 'Выбирай предметы в магазине и размещай их в рюкзаке. Когда будешь готов, начинай бой.'
    }),
    automatic_artifacts: Object.freeze({
      title: 'Предметы работают сами',
      body: 'Во время боя не нужно нажимать на предметы. Урон, броня, скорость и другие эффекты срабатывают автоматически.'
    }),
    bags_add_space: Object.freeze({
      title: 'Сумки добавляют место',
      body: 'Сумка открывает новые клетки для предметов. Купи её и размести так, чтобы она не перекрывала другую сумку.'
    }),
    round_progress: Object.freeze({
      winTitle: 'Раунд выигран',
      lossTitle: 'Раунд проигран',
      drawTitle: 'Раунд завершён',
      body: 'Осталось жизней: {lives}. До конца забега: {rounds} {roundWord}.',
      lastBody: 'Осталось жизней: {lives}. Это был последний раунд забега.'
    })
  })
});

function uniqueStepIds(value) {
  const supported = new Set(TUTORIAL_STEP_IDS);
  return [...new Set(Array.isArray(value) ? value : [])]
    .map(String)
    .filter((stepId) => supported.has(stepId));
}

function nonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
}

export function normalizeTutorialPreferences(value = {}) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    versionSeen: nonNegativeInteger(source.versionSeen),
    disabled: Boolean(source.disabled),
    replayPending: Boolean(source.replayPending),
    seenStepIds: uniqueStepIds(source.seenStepIds)
  };
}

export function scheduleTutorialReplay(value = {}) {
  return {
    ...normalizeTutorialPreferences(value),
    disabled: false,
    replayPending: true,
    seenStepIds: []
  };
}

export function consumeTutorialReplay(value = {}) {
  return {
    ...normalizeTutorialPreferences(value),
    disabled: false,
    replayPending: false,
    seenStepIds: []
  };
}

export function shouldStartTutorial(value = {}, version = TUTORIAL_VERSION) {
  const preferences = normalizeTutorialPreferences(value);
  if (preferences.replayPending) return true;
  if (preferences.disabled) return false;
  return preferences.versionSeen < nonNegativeInteger(version, TUTORIAL_VERSION);
}

export function createTutorialSession({
  preferences = {},
  version = TUTORIAL_VERSION
} = {}) {
  const normalized = normalizeTutorialPreferences(preferences);
  const replay = normalized.replayPending;
  const active = shouldStartTutorial(normalized, version);
  const nextPreferences = replay ? consumeTutorialReplay(normalized) : normalized;
  return {
    version: nonNegativeInteger(version, TUTORIAL_VERSION),
    active,
    replay,
    skipped: false,
    completed: !active,
    activeStepId: null,
    activePayload: null,
    queuedSteps: [],
    preferences: nextPreferences
  };
}

function stepAlreadyTracked(session, stepId) {
  return session.preferences.seenStepIds.includes(stepId)
    || session.activeStepId === stepId
    || session.queuedSteps.some((entry) => entry.stepId === stepId);
}

function withNextStep(session, queue = session.queuedSteps) {
  if (session.activeStepId || queue.length === 0) return { ...session, queuedSteps: queue };
  const [next, ...rest] = queue;
  return {
    ...session,
    activeStepId: next.stepId,
    activePayload: next.payload,
    queuedSteps: rest
  };
}

export function reduceTutorialEvent(session, event = {}) {
  if (!session?.active || session.skipped || session.completed) return session;
  const stepId = EVENT_STEP[event.type];
  if (!stepId || stepAlreadyTracked(session, stepId)) return session;
  if (stepId === 'round_progress' && event.runEnded) return session;
  const queue = [...session.queuedSteps, { stepId, payload: { ...event } }];
  return withNextStep(session, queue);
}

export function dismissTutorialStep(session, stepId = session?.activeStepId) {
  if (!session?.active || !stepId || stepId !== session.activeStepId) return session;
  const seenStepIds = uniqueStepIds([...session.preferences.seenStepIds, stepId]);
  const allSeen = TUTORIAL_STEP_IDS.every((id) => seenStepIds.includes(id));
  const next = {
    ...session,
    active: !allSeen,
    completed: allSeen,
    activeStepId: null,
    activePayload: null,
    preferences: {
      ...session.preferences,
      versionSeen: allSeen ? session.version : session.preferences.versionSeen,
      seenStepIds
    }
  };
  return allSeen ? next : withNextStep(next);
}

export function skipTutorial(session) {
  if (!session) return session;
  return {
    ...session,
    active: false,
    skipped: true,
    completed: true,
    activeStepId: null,
    activePayload: null,
    queuedSteps: [],
    preferences: {
      ...normalizeTutorialPreferences(session.preferences),
      versionSeen: session.version || TUTORIAL_VERSION,
      disabled: true,
      replayPending: false
    }
  };
}

export function completeTutorial(session) {
  if (!session) return session;
  return {
    ...session,
    active: false,
    completed: true,
    activeStepId: null,
    activePayload: null,
    queuedSteps: [],
    preferences: {
      ...normalizeTutorialPreferences(session.preferences),
      versionSeen: session.version || TUTORIAL_VERSION,
      disabled: false,
      replayPending: false,
      seenStepIds: [...TUTORIAL_STEP_IDS]
    }
  };
}

function englishWord(count, singular, plural) {
  return Number(count) === 1 ? singular : plural;
}

function russianRoundWord(count) {
  const number = Math.abs(Number(count)) % 100;
  const last = number % 10;
  if (number > 10 && number < 20) return 'раундов';
  if (last === 1) return 'раунд';
  if (last >= 2 && last <= 4) return 'раунда';
  return 'раундов';
}

function interpolate(template, values) {
  return String(template || '').replace(/\{(\w+)\}/g, (_match, key) => String(values[key] ?? ''));
}

function mergedLocaleCopy(locale, copy = {}) {
  const resolvedLocale = locale === 'ru' ? 'ru' : 'en';
  const defaults = DEFAULT_TUTORIAL_COPY[resolvedLocale];
  const overrides = copy?.[resolvedLocale] || copy || {};
  return {
    ...defaults,
    ...overrides,
    build_backpack: { ...defaults.build_backpack, ...overrides.build_backpack },
    automatic_artifacts: { ...defaults.automatic_artifacts, ...overrides.automatic_artifacts },
    bags_add_space: { ...defaults.bags_add_space, ...overrides.bags_add_space },
    round_progress: { ...defaults.round_progress, ...overrides.round_progress }
  };
}

export function tutorialStepView({ stepId, payload = {}, locale = 'en', copy = {} } = {}) {
  if (!TUTORIAL_STEP_IDS.includes(stepId)) return null;
  const labels = mergedLocaleCopy(locale, copy);
  const step = labels[stepId];
  let title = step.title || '';
  let body = step.body || '';
  if (stepId === 'round_progress') {
    title = payload.outcome === 'win'
      ? step.winTitle
      : payload.outcome === 'loss'
        ? step.lossTitle
        : step.drawTitle;
    const lives = nonNegativeInteger(payload.livesRemaining);
    const rounds = nonNegativeInteger(
      payload.roundsRemaining,
      Math.max(0, nonNegativeInteger(payload.maxRounds) - nonNegativeInteger(payload.completedRounds))
    );
    const values = {
      lives,
      rounds,
      lifeWord: locale === 'ru' ? '' : englishWord(lives, 'life', 'lives'),
      roundWord: locale === 'ru' ? russianRoundWord(rounds) : englishWord(rounds, 'round', 'rounds')
    };
    body = interpolate(rounds === 0 ? step.lastBody : step.body, values);
  }
  return {
    id: stepId,
    title,
    body,
    primaryLabel: labels.gotIt,
    skipLabel: labels.skip,
    closeLabel: labels.close,
    imageSrc: payload.imageSrc || '',
    imageAlt: payload.imageAlt || title
  };
}

export function createPrepTutorialEvents({
  shopItems = [],
  inventoryItems = [],
  getArtifact = (entry) => entry?.artifact || entry,
  isBag = (artifact) => artifact?.family === 'bag',
  imageForArtifact = (artifact) => artifact?.image || artifact?.imagePath || ''
} = {}) {
  const shopArtifacts = (Array.isArray(shopItems) ? shopItems : [])
    .map(getArtifact)
    .filter(Boolean);
  const inventoryArtifacts = (Array.isArray(inventoryItems) ? inventoryItems : [])
    .map(getArtifact)
    .filter(Boolean);
  const combatArtifact = [...shopArtifacts, ...inventoryArtifacts].find((artifact) => !isBag(artifact));
  const offeredBag = shopArtifacts.find(isBag);
  const events = [{ type: 'prep_ready' }];
  if (combatArtifact) {
    events.push({
      type: 'artifact_available',
      imageSrc: imageForArtifact(combatArtifact),
      imageAlt: combatArtifact.displayName || combatArtifact.name || ''
    });
  }
  if (offeredBag) {
    events.push({
      type: 'bag_offer_visible',
      imageSrc: imageForArtifact(offeredBag),
      imageAlt: offeredBag.displayName || offeredBag.name || ''
    });
  }
  return events;
}

export function createRoundTutorialEvent({
  outcome = '',
  player = {},
  maxRounds = 0,
  runEnded = false,
  endReason = ''
} = {}) {
  const completedRounds = nonNegativeInteger(player.completedRounds ?? player.completed_rounds);
  const normalizedMaxRounds = nonNegativeInteger(maxRounds);
  return {
    type: 'round_completed',
    outcome,
    livesRemaining: nonNegativeInteger(player.livesRemaining ?? player.lives_remaining),
    completedRounds,
    maxRounds: normalizedMaxRounds,
    roundsRemaining: Math.max(0, normalizedMaxRounds - completedRounds),
    runEnded: Boolean(runEnded),
    endReason
  };
}
