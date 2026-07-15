import {
  artifactTileFootprintDimensions,
  artifactTileFootprintShape,
  artifactTileFootprintType
} from '../../client/view-model.js';
import { getBagShape } from '../loadout/bag-shape.js';

export const DEFAULT_ARTIFACT_ROLE_CLASSES = {
  damage: {
    id: 'damage',
    label: 'Damage',
    hue: 'damage',
    color: '#d9612b',
    prompt: ''
  },
  armor: {
    id: 'armor',
    label: 'Armor',
    hue: 'armor',
    color: '#6f9b4f',
    prompt: ''
  },
  stun: {
    id: 'stun',
    label: 'Stun',
    hue: 'stun',
    color: '#d5b735',
    prompt: ''
  },
  bag: {
    id: 'bag',
    label: 'Bag',
    hue: 'container',
    color: '#b98245',
    prompt: ''
  }
};

export const DEFAULT_ARTIFACT_SHINE_TIERS = {
  plain: {
    id: 'plain',
    label: 'Plain',
    rank: 1,
    cssClass: 'artifact-shine--plain',
    prompt: ''
  },
  bright: {
    id: 'bright',
    label: 'Bright',
    rank: 2,
    cssClass: 'artifact-shine--bright',
    prompt: ''
  },
  radiant: {
    id: 'radiant',
    label: 'Radiant',
    rank: 3,
    cssClass: 'artifact-shine--radiant',
    prompt: ''
  },
  signature: {
    id: 'signature',
    label: 'Signature',
    rank: 4,
    cssClass: 'artifact-shine--signature',
    prompt: ''
  }
};

export const DEFAULT_ARTIFACT_STAT_ORDER = ['damage', 'armor', 'speed', 'stun'];

export const DEFAULT_ARTIFACT_PRIMARY_STAT_BY_ROLE = {
  damage: 'damage',
  armor: 'armor',
  stun: 'stunChance',
  bag: null
};

function optionValue(options, key, fallback) {
  return options && Object.prototype.hasOwnProperty.call(options, key) ? options[key] : fallback;
}

function mergeMap(defaults, overrides) {
  return {
    ...defaults,
    ...(overrides || {})
  };
}

function defaultShapeForArtifact(artifact) {
  return artifact?.family === 'bag' ? getBagShape(artifact) : null;
}

function defaultOwnerForArtifact(artifact) {
  return artifact?.characterItem?.characterId || artifact?.ownerId || null;
}

function normalizeOptions(options = {}) {
  return {
    roleClasses: mergeMap(DEFAULT_ARTIFACT_ROLE_CLASSES, options.roleClasses),
    shineTiers: mergeMap(DEFAULT_ARTIFACT_SHINE_TIERS, options.shineTiers),
    statOrder: optionValue(options, 'statOrder', DEFAULT_ARTIFACT_STAT_ORDER),
    primaryStatByRole: mergeMap(DEFAULT_ARTIFACT_PRIMARY_STAT_BY_ROLE, options.primaryStatByRole),
    defaultRoleId: optionValue(options, 'defaultRoleId', 'damage'),
    bagFamily: optionValue(options, 'bagFamily', 'bag'),
    bagRoleId: optionValue(options, 'bagRoleId', 'bag'),
    familyForArtifact: optionValue(options, 'familyForArtifact', (artifact) => artifact?.family || null),
    priceForArtifact: optionValue(options, 'priceForArtifact', (artifact) => Number(artifact?.price || 0)),
    isCharacterItem: optionValue(options, 'isCharacterItem', (artifact) => Boolean(artifact?.characterItem)),
    isStarterOnly: optionValue(options, 'isStarterOnly', (artifact) => Boolean(artifact?.starterOnly)),
    ownerForArtifact: optionValue(options, 'ownerForArtifact', defaultOwnerForArtifact),
    shapeForArtifact: optionValue(options, 'shapeForArtifact', defaultShapeForArtifact),
    signatureForCharacterItem: optionValue(options, 'signatureForCharacterItem', true),
    signatureForStarterNonBag: optionValue(options, 'signatureForStarterNonBag', true),
    radiantPrice: optionValue(options, 'radiantPrice', 3),
    brightPrice: optionValue(options, 'brightPrice', 2),
    brightArea: optionValue(options, 'brightArea', 2)
  };
}

export function canonicalArtifactStatKey(key) {
  return key === 'stunChance' ? 'stun' : key;
}

export function artifactFootprintShape(artifact, options = {}) {
  const config = normalizeOptions(options);
  return artifactTileFootprintShape(artifact, {
    shapeForArtifact: config.shapeForArtifact
  });
}

export function artifactFootprintDimensions(artifact, options = {}) {
  const config = normalizeOptions(options);
  return artifactTileFootprintDimensions(artifact, {
    shapeForArtifact: config.shapeForArtifact
  });
}

export function artifactFootprintType(artifact, options = {}) {
  const config = normalizeOptions(options);
  const family = config.familyForArtifact(artifact);
  if (family === config.bagFamily && !Array.isArray(artifact?.shape)) {
    const { cols, rows } = artifactFootprintDimensions(artifact, config);
    if (cols === 1 && rows === 1) return 'single';
    if (cols > rows) return 'wide';
    if (rows > cols) return 'tall';
    return 'block';
  }
  return artifactTileFootprintType(artifact, {
    shapeForArtifact: config.shapeForArtifact
  });
}

export function artifactRoleClass(artifact, options = {}) {
  const config = normalizeOptions(options);
  const family = config.familyForArtifact(artifact);
  if (!artifact) return config.roleClasses[config.defaultRoleId];
  if (family === config.bagFamily) return config.roleClasses[config.bagRoleId];
  return config.roleClasses[family] || config.roleClasses[config.defaultRoleId];
}

export function artifactShineTier(artifact, options = {}) {
  const config = normalizeOptions(options);
  if (!artifact) return config.shineTiers.plain;
  const family = config.familyForArtifact(artifact);
  if (config.signatureForCharacterItem && config.isCharacterItem(artifact)) return config.shineTiers.signature;
  if (config.signatureForStarterNonBag && config.isStarterOnly(artifact) && family !== config.bagFamily) {
    return config.shineTiers.signature;
  }
  const price = Number(config.priceForArtifact(artifact) || 0);
  if (family === config.bagFamily && price >= config.radiantPrice) return config.shineTiers.radiant;
  if (price >= config.radiantPrice) return config.shineTiers.radiant;
  const footprint = artifactFootprintDimensions(artifact, config);
  if (price >= config.brightPrice || footprint.cols * footprint.rows >= config.brightArea) {
    return config.shineTiers.bright;
  }
  return config.shineTiers.plain;
}

export function artifactPrimaryStatKey(artifact, options = {}) {
  const config = normalizeOptions(options);
  const role = artifactRoleClass(artifact, config);
  return config.primaryStatByRole[role.id] ?? null;
}

export function artifactSecondaryStats(artifact, options = {}) {
  const config = normalizeOptions(options);
  const bonus = artifact?.bonus || {};
  const primary = artifactPrimaryStatKey(artifact, config);
  return (config.statOrder || []).filter((stat) => {
    const rawKey = stat === 'stun' ? 'stunChance' : stat;
    return rawKey !== primary && Number(bonus[rawKey] || 0) > 0;
  });
}

export function artifactTradeoffs(artifact, options = {}) {
  const config = normalizeOptions(options);
  const bonus = artifact?.bonus || {};
  return (config.statOrder || []).filter((stat) => {
    const rawKey = stat === 'stun' ? 'stunChance' : stat;
    return Number(bonus[rawKey] || 0) < 0;
  });
}

export function artifactOwner(artifact, options = {}) {
  const config = normalizeOptions(options);
  return config.ownerForArtifact(artifact);
}

export function artifactVisualClassification(artifact, options = {}) {
  const config = normalizeOptions(options);
  const role = artifactRoleClass(artifact, config);
  const shine = artifactShineTier(artifact, config);
  const prompt = [role?.prompt, shine?.prompt].filter(Boolean).join('. ');
  return {
    role,
    shine,
    primaryStatKey: artifactPrimaryStatKey(artifact, config),
    secondaryStats: artifactSecondaryStats(artifact, config),
    tradeoffs: artifactTradeoffs(artifact, config),
    owner: artifactOwner(artifact, config),
    footprintType: artifactFootprintType(artifact, config),
    cssClasses: [
      role?.id ? `artifact-role--${role.id}` : null,
      shine?.cssClass || null
    ].filter(Boolean),
    prompt: prompt ? `${prompt}.` : ''
  };
}

export function createArtifactVisualClassifier(options = {}) {
  const config = normalizeOptions(options);
  return {
    roleClasses: config.roleClasses,
    shineTiers: config.shineTiers,
    statOrder: config.statOrder,
    primaryStatByRole: config.primaryStatByRole,
    canonicalArtifactStatKey,
    artifactRoleClass: (artifact) => artifactRoleClass(artifact, config),
    artifactShineTier: (artifact) => artifactShineTier(artifact, config),
    artifactPrimaryStatKey: (artifact) => artifactPrimaryStatKey(artifact, config),
    artifactSecondaryStats: (artifact) => artifactSecondaryStats(artifact, config),
    artifactTradeoffs: (artifact) => artifactTradeoffs(artifact, config),
    artifactOwner: (artifact) => artifactOwner(artifact, config),
    artifactFootprintShape: (artifact) => artifactFootprintShape(artifact, config),
    artifactFootprintDimensions: (artifact) => artifactFootprintDimensions(artifact, config),
    artifactFootprintType: (artifact) => artifactFootprintType(artifact, config),
    artifactVisualClassification: (artifact) => artifactVisualClassification(artifact, config)
  };
}
