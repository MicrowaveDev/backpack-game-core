export type ArtifactFusionRecipe = {
  id: string;
  resultArtifactId: string;
  ingredientArtifactIds: string[];
  allowFusionIngredients?: boolean;
  [key: string]: any;
};

export type ArtifactFusionIngredientPolicyOptions = {
  excludedFamilies?: string[] | Set<string>;
  excludeStarterOnly?: boolean;
  excludeFusionOnlyUnlessAllowed?: boolean;
  familyForArtifact?: (artifact: any) => string | null;
  isStarterOnly?: (artifact: any) => boolean;
  isFusionOnly?: (artifact: any) => boolean;
  canUseIngredient?: (context: { artifact: any; recipe: ArtifactFusionRecipe }) => boolean;
};

export type ArtifactFusionEvaluatorOptions = ArtifactFusionIngredientPolicyOptions & {
  recipes?: ArtifactFusionRecipe[];
  canUseFusionIngredient?: (context: { row?: any; artifact: any; recipe: ArtifactFusionRecipe }) => boolean;
};

export type ArtifactFusionEvaluator = {
  normalizeArtifactFusionRecipe(recipe?: Partial<ArtifactFusionRecipe>): ArtifactFusionRecipe;
  normalizeArtifactFusionRecipes(recipes?: Partial<ArtifactFusionRecipe>[]): ArtifactFusionRecipe[];
  getArtifactFusionRecipe(recipeId: string, recipes?: Partial<ArtifactFusionRecipe>[]): ArtifactFusionRecipe | null;
  artifactFusionRecipeResultIds(recipes?: Partial<ArtifactFusionRecipe>[]): string[];
  artifactFusionRecipeIngredientIds(recipes?: Partial<ArtifactFusionRecipe>[]): Set<string>;
  canUseArtifactFusionIngredient(context?: { artifact?: any; recipe?: ArtifactFusionRecipe }): boolean;
  findArtifactFusionMatches(rows: any[], getArtifact: (artifactId: string) => any, recipes?: Partial<ArtifactFusionRecipe>[]): any[];
  fusionIngredientRowIdSet(matches: any[]): Set<string>;
};

export function normalizeArtifactFusionRecipe(recipe?: Partial<ArtifactFusionRecipe>): ArtifactFusionRecipe;
export function normalizeArtifactFusionRecipes(recipes?: Partial<ArtifactFusionRecipe>[]): ArtifactFusionRecipe[];
export function getArtifactFusionRecipe(recipeId: string, recipes?: Partial<ArtifactFusionRecipe>[]): ArtifactFusionRecipe | null;
export function artifactFusionRecipeResultIds(recipes?: Partial<ArtifactFusionRecipe>[]): string[];
export function artifactFusionRecipeIngredientIds(recipes?: Partial<ArtifactFusionRecipe>[]): Set<string>;
export function canUseArtifactFusionIngredient(
  context?: { artifact?: any; recipe?: ArtifactFusionRecipe },
  options?: ArtifactFusionIngredientPolicyOptions
): boolean;
export function createArtifactFusionEvaluator(options?: ArtifactFusionEvaluatorOptions): ArtifactFusionEvaluator;
export function fusionIngredientRowIdSet(matches: any[]): Set<string>;
