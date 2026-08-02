export const TUTORIAL_VERSION = 2;

export const TUTORIAL_STEP_IDS = Object.freeze([
  'build_backpack',
  'place_artifact',
  'automatic_artifacts',
  'bags_add_space',
  'round_progress'
]);

const EVENT_STEP = Object.freeze({
  prep_ready: 'build_backpack',
  artifact_bought: 'place_artifact',
  artifact_placed: 'automatic_artifacts',
  bag_offer_visible: 'bags_add_space',
  round_completed: 'round_progress'
});

const EVENT_PREREQUISITE_STEP = Object.freeze({
  artifact_bought: 'build_backpack',
  artifact_placed: 'place_artifact'
});

export const DEFAULT_TUTORIAL_COPY = Object.freeze({
  en: Object.freeze({
    gotIt: 'Got it',
    skip: 'Skip tutorial',
    close: 'Close',
    build_backpack: Object.freeze({
      title: 'Buy your first item',
      body: 'Tap an affordable item in the shop to buy it. Your purchase will first go to the Backpack above the battle grid.'
    }),
    place_artifact: Object.freeze({
      title: 'Place your item',
      body: 'Your purchase is waiting in the Backpack. Tap it to place it in the character item grid for this round.'
    }),
    automatic_artifacts: Object.freeze({
      title: 'Items fight automatically',
      body: 'Ready. During battle, placed items use their damage, armor, speed, and other effects automatically.'
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
      title: 'Купи первый предмет',
      body: 'Нажми на доступный предмет в магазине, чтобы купить его. Сначала покупка попадёт в «Рюкзак» над боевой сеткой.'
    }),
    place_artifact: Object.freeze({
      title: 'Размести предмет',
      body: 'Покупка ждёт в «Рюкзаке». Нажми на неё, чтобы разместить предмет в сетке персонажа на этот раунд.'
    }),
    automatic_artifacts: Object.freeze({
      title: 'Предметы сражаются сами',
      body: 'Готово. В бою размещённые предметы автоматически применяют урон, броню, скорость и другие эффекты.'
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
  if (!stepId) return session;
  if (stepId === 'round_progress' && event.runEnded) return session;
  const prerequisiteStepId = EVENT_PREREQUISITE_STEP[event.type];
  let next = session;
  if (prerequisiteStepId) {
    const prerequisiteWasActive = next.activeStepId === prerequisiteStepId;
    const seenStepIds = uniqueStepIds([
      ...next.preferences.seenStepIds,
      prerequisiteStepId
    ]);
    next = {
      ...next,
      activeStepId: prerequisiteWasActive ? null : next.activeStepId,
      activePayload: prerequisiteWasActive ? null : next.activePayload,
      queuedSteps: next.queuedSteps.filter((entry) => entry.stepId !== prerequisiteStepId),
      preferences: {
        ...next.preferences,
        seenStepIds
      }
    };
  }
  if (stepAlreadyTracked(next, stepId)) return withNextStep(next);
  const entry = { stepId, payload: { ...event } };
  const queue = prerequisiteStepId
    ? [entry, ...next.queuedSteps]
    : [...next.queuedSteps, entry];
  return withNextStep(next, queue);
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
    place_artifact: { ...defaults.place_artifact, ...overrides.place_artifact },
    automatic_artifacts: { ...defaults.automatic_artifacts, ...overrides.automatic_artifacts },
    bags_add_space: { ...defaults.bags_add_space, ...overrides.bags_add_space },
    round_progress: { ...defaults.round_progress, ...overrides.round_progress }
  };
}

const TUTORIAL_STEP_ANCHORS = Object.freeze({
  build_backpack: {
    selector: '[data-tutorial-anchor="shop-affordable-artifact"]',
    fallbackSelector: '[data-tutorial-anchor="shop"]',
    placement: 'top'
  },
  place_artifact: {
    selector: '[data-tutorial-anchor="backpack-item"]',
    fallbackSelector: '[data-tutorial-anchor="backpack"]',
    placement: 'bottom'
  },
  automatic_artifacts: {
    selector: '[data-tutorial-anchor="battle-grid"]',
    placement: 'top'
  },
  bags_add_space: {
    selector: '[data-tutorial-anchor="shop-bag"]',
    fallbackSelector: '[data-tutorial-anchor="shop"]',
    placement: 'bottom'
  },
  round_progress: {
    selector: '[data-tutorial-anchor="run-progress"]',
    placement: 'bottom'
  }
});

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
  const anchor = TUTORIAL_STEP_ANCHORS[stepId];
  return {
    id: stepId,
    title,
    body,
    primaryLabel: labels.gotIt,
    skipLabel: labels.skip,
    closeLabel: labels.close,
    imageSrc: payload.imageSrc || '',
    imageAlt: payload.imageAlt || title,
    actionRequired: stepId === 'build_backpack' || stepId === 'place_artifact',
    anchorSelector: anchor.selector,
    anchorFallbackSelector: anchor.fallbackSelector || '',
    anchorPlacement: anchor.placement
  };
}

function artifactEvent(type, artifact, imageForArtifact) {
  return {
    type,
    artifactId: artifact?.id || artifact?.artifactId || '',
    imageSrc: artifact ? imageForArtifact(artifact) : '',
    imageAlt: artifact?.displayName || artifact?.name || ''
  };
}

export function createPrepTutorialEvents({
  inventoryItems = [],
  placedItems = [],
  getArtifact = (entry) => entry?.artifact || entry,
  isBag = (entry) => entry?.family === 'bag',
  imageForArtifact = (entry) => entry?.image || entry?.imagePath || ''
} = {}) {
  const events = [{ type: 'prep_ready' }];
  const waitingArtifact = (Array.isArray(inventoryItems) ? inventoryItems : [])
    .map(getArtifact)
    .filter(Boolean)
    .find((artifact) => !isBag(artifact));

  if (waitingArtifact) {
    events.push(artifactEvent('artifact_bought', waitingArtifact, imageForArtifact));
    return events;
  }

  const placedArtifact = (Array.isArray(placedItems) ? placedItems : [])
    .map(getArtifact)
    .filter(Boolean)
    .find((artifact) => !isBag(artifact));
  if (placedArtifact) {
    events.push(
      artifactEvent('artifact_bought', placedArtifact, imageForArtifact),
      artifactEvent('artifact_placed', placedArtifact, imageForArtifact)
    );
  }
  return events;
}

export function createArtifactBoughtTutorialEvent({
  artifact = null,
  imageForArtifact = (entry) => entry?.image || entry?.imagePath || ''
} = {}) {
  return artifactEvent('artifact_bought', artifact, imageForArtifact);
}

export function createArtifactPlacedTutorialEvents({
  artifact = null,
  shopItems = [],
  getArtifact = (entry) => entry?.artifact || entry,
  isBag = (entry) => entry?.family === 'bag',
  imageForArtifact = (entry) => entry?.image || entry?.imagePath || ''
} = {}) {
  const events = [artifactEvent('artifact_placed', artifact, imageForArtifact)];
  const offeredBag = (Array.isArray(shopItems) ? shopItems : [])
    .map(getArtifact)
    .filter(Boolean)
    .find(isBag);
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
