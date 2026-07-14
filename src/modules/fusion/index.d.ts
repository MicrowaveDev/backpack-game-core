export * from '../../fusion-matching.js';
export * from '../../artifact-fusion-recipes.js';
export interface FusionValidationIssue { code: string; message: string; recipe?: any; artifact?: any }
export function validateFusionCatalog(options: { recipes?: any[]; artifacts?: any[]; isIngredientEligible?: (artifact: any, recipe: any) => boolean }): FusionValidationIssue[];
