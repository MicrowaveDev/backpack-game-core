function numberOr(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function defaultCombatantLabel(combatant) {
  if (typeof combatant?.name === 'string') return combatant.name;
  if (combatant?.name?.en) return combatant.name.en;
  return combatant?.id || combatant?.mushroomId || combatant?.side || 'Combatant';
}

function defaultSummarizeCombatant(combatant) {
  return {
    side: combatant.side,
    playerId: combatant.playerId,
    name: combatant.name,
    currentHealth: combatant.currentHealth,
    maxHealth: combatant.maxHealth,
    attack: combatant.attack,
    speed: combatant.speed,
    defense: combatant.defense,
    stunChance: combatant.stunChance,
    stunned: Boolean(combatant.state?.stunned),
    loadout: combatant.loadout
  };
}

function combatState(left, right, summarizeCombatant) {
  return {
    left: summarizeCombatant(left),
    right: summarizeCombatant(right)
  };
}

function sideOrderFromTieResult(result, left, right) {
  if (!result) return null;
  if (Array.isArray(result)) return result;
  if (result === 'left') return [left, right];
  if (result === 'right') return [right, left];
  if (result === left) return [left, right];
  if (result === right) return [right, left];
  if (result.first === 'left' || result.first === left) return [left, right];
  if (result.first === 'right' || result.first === right) return [right, left];
  return null;
}

function computeStepOrder(left, right, rng, options) {
  const getActionSpeed = options.getActionSpeed || ((combatant) => combatant.speed);
  const getBaseSpeed = options.getBaseSpeed || ((combatant) => combatant.baseSpeed ?? combatant.speed);
  const leftSpeed = numberOr(getActionSpeed(left));
  const rightSpeed = numberOr(getActionSpeed(right));

  if (leftSpeed === rightSpeed) {
    const leftBaseSpeed = numberOr(getBaseSpeed(left));
    const rightBaseSpeed = numberOr(getBaseSpeed(right));
    if (leftBaseSpeed !== rightBaseSpeed) {
      return leftBaseSpeed > rightBaseSpeed ? [left, right] : [right, left];
    }

    const tieOrder = sideOrderFromTieResult(
      options.breakEqualBaseSpeedTie?.({ left, right, rng, leftSpeed, rightSpeed }),
      left,
      right
    );
    if (tieOrder) return tieOrder;

    return rng() >= 0.5 ? [left, right] : [right, left];
  }

  return leftSpeed > rightSpeed ? [left, right] : [right, left];
}

function orderedState(attacker, defender, summarizeCombatant) {
  const left = attacker.side === 'left' ? attacker : defender;
  const right = attacker.side === 'right' ? attacker : defender;
  return combatState(left, right, summarizeCombatant);
}

function buildActionEvent({
  attacker,
  defender,
  action,
  damage,
  stun,
  step,
  state,
  options
}) {
  const label = options.getCombatantLabel || defaultCombatantLabel;
  const narration = options.getActionNarration?.({
    attacker,
    defender,
    action,
    damage,
    stun,
    step
  }) || `${label(attacker)} uses ${action.actionName} for ${damage.resolvedDamage} damage${stun.stunned ? ' and stuns the target' : ''}.`;

  const event = {
    type: 'action',
    step,
    actorSide: attacker.side,
    targetSide: defender.side,
    actionName: action.actionName,
    damage: damage.resolvedDamage,
    blockedDamage: damage.blockedDamage,
    stunned: stun.stunned
  };

  const artifactAttribution = options.getArtifactAttribution?.({
    attacker,
    defender,
    action,
    damage,
    stun,
    step
  });
  if (artifactAttribution !== undefined) {
    event.artifactAttribution = artifactAttribution;
  }

  const effectTags = options.getEffectTags?.({
    attacker,
    defender,
    action,
    damage,
    stun,
    step
  });
  if (effectTags !== undefined) {
    event.effectTags = effectTags;
  }

  event.narration = narration;
  event.state = state;
  return event;
}

function resolveAction(attacker, defender, step, rng, events, options) {
  const summarizeCombatant = options.summarizeCombatant || defaultSummarizeCombatant;
  const label = options.getCombatantLabel || defaultCombatantLabel;
  attacker.state ||= {};
  defender.state ||= {};

  if (attacker.currentHealth <= 0 || defender.currentHealth <= 0) {
    return;
  }

  if (attacker.state.stunned) {
    attacker.state.stunned = false;
    options.afterSkip?.({ actor: attacker, opponent: defender, step, rng });
    events.push({
      type: 'skip',
      step,
      actorSide: attacker.side,
      targetSide: defender.side,
      narration: options.getSkipNarration?.({ actor: attacker, opponent: defender, step })
        || `${label(attacker)} is stunned and loses the turn.`,
      state: orderedState(attacker, defender, summarizeCombatant)
    });
    return;
  }

  const action = {
    actionName: 'Attack',
    attackDamage: numberOr(attacker.attack),
    armorIgnore: 0,
    stunChance: numberOr(attacker.stunChance)
  };
  options.prepareAction?.({ attacker, defender, action, step, rng });

  const incomingDamage = numberOr(action.attackDamage);
  const defenseValue = Math.max(
    0,
    numberOr(defender.defense) + numberOr(defender.state.pendingArmorBonus) - numberOr(action.armorIgnore)
  );
  const damage = {
    incomingDamage,
    defenseValue,
    resolvedDamage: Math.max(1, incomingDamage - defenseValue),
    blockedDamage: 0
  };
  options.afterDamageCalculated?.({ attacker, defender, action, damage, step, rng });
  damage.resolvedDamage = Math.max(1, numberOr(damage.resolvedDamage, 1));
  damage.blockedDamage = Math.max(0, incomingDamage - damage.resolvedDamage);

  defender.currentHealth = Math.max(0, numberOr(defender.currentHealth) - damage.resolvedDamage);
  options.afterDamageApplied?.({ attacker, defender, action, damage, step, rng });

  const chance = Math.min(
    numberOr(options.maxStunChance, 100),
    Math.max(0, numberOr(action.stunChance))
  );
  const roll = rng() * 100;
  const stun = {
    roll,
    chance,
    stunned: roll < chance,
    applied: roll < chance && defender.currentHealth > 0
  };
  if (stun.applied) {
    defender.state.stunned = true;
  }
  options.afterStunResolved?.({ attacker, defender, action, damage, stun, step, rng });
  options.afterActionResolved?.({ attacker, defender, action, damage, stun, step, rng });

  events.push(buildActionEvent({
    attacker,
    defender,
    action,
    damage,
    stun,
    step,
    state: orderedState(attacker, defender, summarizeCombatant),
    options
  }));
}

export function simulateBattle({
  left,
  right,
  rng,
  stepCap = 150,
  maxStunChance = 100,
  ...options
}) {
  if (typeof rng !== 'function') {
    throw new Error('simulateBattle requires an rng function');
  }
  if (!left || !right) {
    throw new Error('simulateBattle requires left and right combatants');
  }

  left.side ||= 'left';
  right.side ||= 'right';
  left.state ||= {};
  right.state ||= {};
  left.currentHealth = numberOr(left.currentHealth, numberOr(left.maxHealth));
  right.currentHealth = numberOr(right.currentHealth, numberOr(right.maxHealth));

  const resolvedOptions = {
    ...options,
    maxStunChance,
    summarizeCombatant: options.summarizeCombatant || defaultSummarizeCombatant,
    getCombatantLabel: options.getCombatantLabel || defaultCombatantLabel
  };
  const events = [
    {
      type: 'battle_start',
      step: 0,
      narration: resolvedOptions.getStartNarration?.({ left, right })
        || `${resolvedOptions.getCombatantLabel(left)} faces ${resolvedOptions.getCombatantLabel(right)}.`,
      state: combatState(left, right, resolvedOptions.summarizeCombatant)
    }
  ];
  let winnerSide = null;
  let finalStep = stepCap;
  let endReason = 'step_cap';

  for (let step = 1; step <= stepCap; step += 1) {
    events.push({
      type: 'step_start',
      step,
      narration: resolvedOptions.getStepNarration?.({ step, left, right }) || `Step ${step} begins.`,
      state: combatState(left, right, resolvedOptions.summarizeCombatant)
    });

    const [first, second] = computeStepOrder(left, right, rng, resolvedOptions);
    resolveAction(first, second, step, rng, events, resolvedOptions);
    if (second.currentHealth <= 0) {
      winnerSide = first.side;
      finalStep = step;
      endReason = 'death';
      break;
    }
    resolveAction(second, first, step, rng, events, resolvedOptions);
    if (first.currentHealth <= 0) {
      winnerSide = second.side;
      finalStep = step;
      endReason = 'death';
      break;
    }
  }

  let outcome = 'draw';
  if (!winnerSide) {
    const leftPct = left.currentHealth / left.maxHealth;
    const rightPct = right.currentHealth / right.maxHealth;
    if (leftPct > rightPct) {
      winnerSide = 'left';
    } else if (rightPct > leftPct) {
      winnerSide = 'right';
    } else {
      const leftDamageDealt = right.maxHealth - right.currentHealth;
      const rightDamageDealt = left.maxHealth - left.currentHealth;
      if (leftDamageDealt > rightDamageDealt) {
        winnerSide = 'left';
      } else if (rightDamageDealt > leftDamageDealt) {
        winnerSide = 'right';
      }
    }
  }

  if (winnerSide) {
    outcome = winnerSide === 'left' ? 'win' : 'loss';
  }

  const winner = winnerSide === 'left' ? left : right;
  const narration = resolvedOptions.getEndNarration?.({
    left,
    right,
    winnerSide,
    winner,
    outcome,
    endReason,
    finalStep
  }) || (
    winnerSide
      ? endReason === 'step_cap'
        ? `Step limit reached - ${resolvedOptions.getCombatantLabel(winner)} wins on health.`
        : `${resolvedOptions.getCombatantLabel(winner)} wins.`
      : 'The battle ends in a draw.'
  );

  events.push({
    type: 'battle_end',
    step: finalStep,
    winnerSide,
    outcome,
    endReason,
    narration,
    state: combatState(left, right, resolvedOptions.summarizeCombatant)
  });

  return {
    winnerSide,
    outcome,
    endReason,
    finalStep,
    leftState: resolvedOptions.summarizeCombatant(left),
    rightState: resolvedOptions.summarizeCombatant(right),
    events
  };
}
