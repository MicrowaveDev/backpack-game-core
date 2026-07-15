import { generateBackpackLoadout } from '../../modules/loadout/backpack-loadout.js';
import { getEffectiveShape } from '../../modules/loadout/bag-shape.js';
import { randomInt } from '../../shared/rng.js';

function requiredProvider(name, value) {
  if (typeof value !== 'function') {
    throw new Error(`Backpack ghost loadout service requires provider ${name}`);
  }
  return value;
}

function asArray(value) {
  return typeof value === 'function' ? value() : (Array.isArray(value) ? value : []);
}

function defaultWeightForCharacterItem(character, artifact) {
  if (character?.affinity?.strong?.includes(artifact.family)) {
    return 5;
  }
  if (character?.affinity?.medium?.includes(artifact.family)) {
    return 3;
  }
  if (character?.affinity?.weak?.includes(artifact.family)) {
    return 1;
  }
  return 2;
}

export function createGhostLoadoutService({
  artifacts,
  characters,
  getArtifactById,
  getArtifactPrice,
  getCharacterById,
  getStarterPreset = () => [],
  getStarterPresetCost = () => 0,
  gridColumns,
  gridRows,
  defaultBudget,
  starterBagId = 'starter_bag',
  starterBagPlacement,
  attempts = 64,
  createRng,
  isBag,
  getBagShape = (artifact, rotation) => getEffectiveShape(artifact, rotation),
  validateLoadout,
  weightForItem = defaultWeightForCharacterItem,
  imagePathForCharacter = () => null,
  defaultPortraitId = 'default',
  defaultActivePortrait = defaultPortraitId,
  failureMessage = 'Could not generate ghost loadout'
} = {}) {
  const resolveArtifact = requiredProvider('getArtifactById', getArtifactById);
  const resolveArtifactPrice = requiredProvider('getArtifactPrice', getArtifactPrice);
  const resolveRng = requiredProvider('createRng', createRng);
  const resolveIsBag = requiredProvider('isBag', isBag);
  const resolveValidation = requiredProvider('validateLoadout', validateLoadout);
  const resolveCharacter = getCharacterById || ((characterId) =>
    asArray(characters).find((character) => character.id === characterId));

  function createBotLoadout(character, rng, budget = defaultBudget) {
    const preset = getStarterPreset(character.id);
    const presetCost = getStarterPresetCost(character.id);
    const starterBag = resolveArtifact(starterBagId);
    return generateBackpackLoadout({
      rng,
      budget,
      attempts,
      grid: { columns: gridColumns, rows: gridRows },
      items: asArray(artifacts).filter((artifact) => !artifact.starterOnly),
      starterBag: {
        item: starterBag,
        placement: {
          artifactId: starterBagId,
          x: 0,
          y: 0,
          width: starterBag?.width ?? 3,
          height: starterBag?.height ?? 3,
          active: true,
          ...(starterBagPlacement || {})
        }
      },
      starterPreset: preset,
      presetCost,
      getItemPrice: resolveArtifactPrice,
      isBag: resolveIsBag,
      getBagShape,
      weightForItem: (artifact) => weightForItem(character, artifact),
      validateLoadout: (placements, ceiling) => resolveValidation(placements, ceiling),
      failureMessage
    });
  }

  function createBotGhostSnapshot(seedInput, characterId = null, budget = defaultBudget) {
    const rng = resolveRng(`${seedInput}:bot`);
    const characterList = asArray(characters);
    const character = characterId
      ? resolveCharacter(characterId)
      : characterList[randomInt(rng, characterList.length)];
    if (!character) {
      throw new Error(`Backpack ghost loadout service could not resolve character ${characterId || ''}`.trim());
    }
    return {
      playerId: null,
      characterId: character.id,
      portraitId: defaultPortraitId,
      imagePath: imagePathForCharacter(character.id, { character }),
      activePortrait: defaultActivePortrait,
      loadout: createBotLoadout(character, rng, budget)
    };
  }

  return {
    createBotLoadout,
    createBotGhostSnapshot
  };
}
