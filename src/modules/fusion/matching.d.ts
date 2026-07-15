export type RowId = string | number;

export interface FusionRowLike {
  id?: RowId | null;
  artifactId?: string | null;
  x?: number | string | null;
  y?: number | string | null;
  width?: number | string | null;
  height?: number | string | null;
  [key: string]: unknown;
}

export interface FusionRecipeLike {
  id?: RowId | null;
  resultArtifactId?: string | null;
  ingredientArtifactIds?: string[] | null;
  [key: string]: unknown;
}

export interface FusionIngredientPlacement {
  id: RowId;
  artifactId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FusionMatch {
  recipeId: RowId | null | undefined;
  resultArtifactId: string;
  ingredientRowIds: RowId[];
  ingredientArtifactIds: string[];
  ingredients: FusionIngredientPlacement[];
}

export interface FusionMatchingOptions<
  Row extends FusionRowLike = FusionRowLike,
  Artifact = unknown,
  Recipe extends FusionRecipeLike = FusionRecipeLike
> {
  canUseIngredient?: (args: {
    row: Row;
    artifact: Artifact;
    recipe: Recipe;
  }) => boolean;
}

export function findFusionMatches<
  Row extends FusionRowLike = FusionRowLike,
  Artifact = unknown,
  Recipe extends FusionRecipeLike = FusionRecipeLike
>(
  rows: Row[] | readonly Row[] | null | undefined,
  getArtifact: (artifactId: string) => Artifact | null | undefined,
  recipes?: Recipe[] | readonly Recipe[],
  options?: FusionMatchingOptions<Row, Artifact, Recipe>
): FusionMatch[];

export function fusionIngredientRowIdSet(matches: FusionMatch[] | null | undefined): Set<RowId>;
