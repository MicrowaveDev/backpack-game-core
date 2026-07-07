import {
  findFusionMatches,
  fusionIngredientRowIdSet
} from './fusion-matching.js';

function normalizeId(value) {
  return value == null ? '' : String(value);
}

function normalizeIngredientIds(value) {
  return Array.isArray(value)
    ? value.map(normalizeId).filter(Boolean)
    : [];
}

function makeSet(value) {
  if (value instanceof Set) return value;
  return new Set(Array.isArray(value) ? value : []);
}

export function normalizeArtifactFusionRecipe(recipe = {}) {
  const ingredientArtifactIds = normalizeIngredientIds(recipe.ingredientArtifactIds);
  const resultArtifactId = normalizeId(recipe.resultArtifactId);
  const id = normalizeId(recipe.id || resultArtifactId || ingredientArtifactIds.join('_'));
  return {
    ...recipe,
    id,
    resultArtifactId,
    ingredientArtifactIds,
    allowFusionIngredients: Boolean(recipe.allowFusionIngredients)
  };
}

export function normalizeArtifactFusionRecipes(recipes = []) {
  return (Array.isArray(recipes) ? recipes : [])
    .map(normalizeArtifactFusionRecipe)
    .filter((recipe) => recipe.id && recipe.resultArtifactId && recipe.ingredientArtifactIds.length > 0);
}

export function getArtifactFusionRecipe(recipeId, recipes = []) {
  const id = normalizeId(recipeId);
  return normalizeArtifactFusionRecipes(recipes).find((recipe) => recipe.id === id) || null;
}

export function artifactFusionRecipeResultIds(recipes = []) {
  return normalizeArtifactFusionRecipes(recipes).map((recipe) => recipe.resultArtifactId);
}

export function artifactFusionRecipeIngredientIds(recipes = []) {
  const ids = new Set();
  for (const recipe of normalizeArtifactFusionRecipes(recipes)) {
    for (const artifactId of recipe.ingredientArtifactIds) ids.add(artifactId);
  }
  return ids;
}

export function canUseArtifactFusionIngredient({ artifact, recipe } = {}, options = {}) {
  if (!artifact) return false;
  const familyForArtifact = options.familyForArtifact || ((item) => item?.family || null);
  const isStarterOnly = options.isStarterOnly || ((item) => Boolean(item?.starterOnly));
  const isFusionOnly = options.isFusionOnly || ((item) => Boolean(item?.fusionOnly));
  const excludedFamilies = makeSet(options.excludedFamilies || []);
  if (excludedFamilies.has(familyForArtifact(artifact))) return false;
  if (options.excludeStarterOnly !== false && isStarterOnly(artifact)) return false;
  if (options.excludeFusionOnlyUnlessAllowed !== false && isFusionOnly(artifact) && !recipe?.allowFusionIngredients) {
    return false;
  }
  if (typeof options.canUseIngredient === 'function') {
    return Boolean(options.canUseIngredient({ artifact, recipe }));
  }
  return true;
}

export function createArtifactFusionEvaluator(options = {}) {
  const defaultRecipes = normalizeArtifactFusionRecipes(options.recipes || []);
  const ingredientPolicy = {
    excludedFamilies: options.excludedFamilies || [],
    excludeStarterOnly: options.excludeStarterOnly,
    excludeFusionOnlyUnlessAllowed: options.excludeFusionOnlyUnlessAllowed,
    familyForArtifact: options.familyForArtifact,
    isStarterOnly: options.isStarterOnly,
    isFusionOnly: options.isFusionOnly,
    canUseIngredient: options.canUseIngredient
  };
  const evaluateIngredient = options.canUseFusionIngredient || ((context) =>
    canUseArtifactFusionIngredient(context, ingredientPolicy)
  );

  function recipesFor(candidateRecipes = defaultRecipes) {
    return normalizeArtifactFusionRecipes(candidateRecipes);
  }

  return {
    normalizeArtifactFusionRecipe,
    normalizeArtifactFusionRecipes,
    getArtifactFusionRecipe: (recipeId, candidateRecipes = defaultRecipes) =>
      getArtifactFusionRecipe(recipeId, candidateRecipes),
    artifactFusionRecipeResultIds: (candidateRecipes = defaultRecipes) =>
      artifactFusionRecipeResultIds(candidateRecipes),
    artifactFusionRecipeIngredientIds: (candidateRecipes = defaultRecipes) =>
      artifactFusionRecipeIngredientIds(candidateRecipes),
    canUseArtifactFusionIngredient: (context) => evaluateIngredient(context),
    findArtifactFusionMatches: (rows, getArtifact, candidateRecipes = defaultRecipes) =>
      findFusionMatches(rows, getArtifact, recipesFor(candidateRecipes), {
        canUseIngredient: evaluateIngredient
      }),
    fusionIngredientRowIdSet
  };
}

export { fusionIngredientRowIdSet };
