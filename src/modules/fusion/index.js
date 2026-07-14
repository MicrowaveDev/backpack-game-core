export * from '../../fusion-matching.js';
export * from '../../artifact-fusion-recipes.js';

export function validateFusionCatalog({ recipes = [], artifacts = [], isIngredientEligible } = {}) {
  const issues = [];
  const artifactById = new Map(artifacts.map((artifact) => [artifact.id, artifact]));
  const recipeIds = new Set();
  const resultIds = new Set();
  const ingredientSets = new Set();
  for (const recipe of recipes) {
    if (recipeIds.has(recipe.id)) issues.push({ code: 'duplicate-recipe', message: `duplicate recipe id ${recipe.id}`, recipe });
    recipeIds.add(recipe.id);
    if (resultIds.has(recipe.resultArtifactId)) issues.push({ code: 'duplicate-result', message: `duplicate fusion result ${recipe.resultArtifactId}`, recipe });
    resultIds.add(recipe.resultArtifactId);
    const result = artifactById.get(recipe.resultArtifactId);
    if (!result) issues.push({ code: 'missing-result', message: `missing result artifact ${recipe.resultArtifactId}`, recipe });
    else if (!result.fusionOnly) issues.push({ code: 'result-not-fusion-only', message: `result artifact ${recipe.resultArtifactId} must be fusionOnly`, recipe });
    if (!Array.isArray(recipe.ingredientArtifactIds) || recipe.ingredientArtifactIds.length < 2) {
      issues.push({ code: 'ingredient-count', message: `recipe ${recipe.id} must have at least two ingredients`, recipe });
      continue;
    }
    const signature = [...recipe.ingredientArtifactIds].sort().join('+');
    if (ingredientSets.has(signature)) issues.push({ code: 'duplicate-ingredients', message: `duplicate ingredient set ${signature}`, recipe });
    ingredientSets.add(signature);
    for (const ingredientId of recipe.ingredientArtifactIds) {
      const ingredient = artifactById.get(ingredientId);
      if (!ingredient) issues.push({ code: 'missing-ingredient', message: `recipe ${recipe.id} references missing ingredient ${ingredientId}`, recipe });
      else if (isIngredientEligible && !isIngredientEligible(ingredient, recipe)) {
        issues.push({ code: 'ineligible-ingredient', message: `recipe ${recipe.id} uses ineligible ingredient ${ingredientId}`, recipe });
      }
    }
  }
  for (const artifact of artifacts) {
    if (artifact.fusionOnly && !resultIds.has(artifact.id)) {
      issues.push({ code: 'unreferenced-result', message: `fusionOnly artifact without recipe: ${artifact.id}`, artifact });
    }
  }
  return issues;
}
