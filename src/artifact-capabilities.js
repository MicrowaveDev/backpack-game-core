export const DEFAULT_ARTIFACT_FAMILY_CAPABILITY = Object.freeze({
  statsInBattle: true,
  container: true,
  holdsItems: false
});

export const DEFAULT_ARTIFACT_FAMILY_CAPABILITIES = Object.freeze({
  damage: Object.freeze({ statsInBattle: true, container: true, holdsItems: false }),
  armor: Object.freeze({ statsInBattle: true, container: true, holdsItems: false }),
  stun: Object.freeze({ statsInBattle: true, container: true, holdsItems: false }),
  bag: Object.freeze({ statsInBattle: false, container: true, holdsItems: true })
});

export const FAMILY_CAPS = DEFAULT_ARTIFACT_FAMILY_CAPABILITIES;

function capabilityRegistry(options = {}) {
  return options.familyCapabilities || options.familyCaps || DEFAULT_ARTIFACT_FAMILY_CAPABILITIES;
}

export function familyCaps(family, options = {}) {
  const registry = capabilityRegistry(options);
  const fallbackFamily = options.fallbackFamily || 'damage';
  return registry?.[family]
    || registry?.[fallbackFamily]
    || DEFAULT_ARTIFACT_FAMILY_CAPABILITIES[fallbackFamily]
    || DEFAULT_ARTIFACT_FAMILY_CAPABILITY;
}

export function isBag(artifact, options = {}) {
  if (!artifact) return false;
  const family = artifact.family;
  const bagFamily = options.bagFamily || 'bag';
  if (family === bagFamily) return true;
  if (!options.familyCapabilities && !options.familyCaps) return false;
  return familyCaps(family, options).holdsItems === true;
}

export function isCombatArtifact(artifact, options = {}) {
  if (!artifact) return false;
  return familyCaps(artifact.family, options).statsInBattle === true;
}

/**
 * True if an item row is "in the container" (bought but not placed on grid
 * and not inside a bag). Container items don't contribute stats and skip
 * bounds/overlap checks.
 */
export function isContainerItem(item) {
  if (!item) return false;
  return Number(item.x) < 0 || Number(item.y) < 0;
}

/**
 * True if an item row should contribute stats to combat.
 * - Bags never contribute (no bonus).
 * - Container items never contribute (not placed).
 * - Grid-placed combat artifacts contribute.
 * - Bagged items contribute by placement coordinates.
 */
export function contributesStats(artifact, item, options = {}) {
  if (!item || !isCombatArtifact(artifact, options)) return false;
  return !isContainerItem(item);
}
