export type ArtifactVisualRole = {
  id: string;
  label?: string;
  hue?: string;
  color?: string;
  prompt?: string;
};

export type ArtifactVisualShineTier = {
  id: string;
  label?: string;
  rank?: number;
  cssClass?: string;
  prompt?: string;
};

export type ArtifactVisualClassificationOptions = {
  roleClasses?: Record<string, ArtifactVisualRole>;
  shineTiers?: Record<string, ArtifactVisualShineTier>;
  statOrder?: string[];
  primaryStatByRole?: Record<string, string | null>;
  defaultRoleId?: string;
  bagFamily?: string;
  bagRoleId?: string;
  familyForArtifact?: (artifact: any) => string | null;
  priceForArtifact?: (artifact: any) => number;
  isCharacterItem?: (artifact: any) => boolean;
  isStarterOnly?: (artifact: any) => boolean;
  ownerForArtifact?: (artifact: any) => string | null;
  shapeForArtifact?: (artifact: any) => number[][] | null;
  signatureForCharacterItem?: boolean;
  signatureForStarterNonBag?: boolean;
  radiantPrice?: number;
  brightPrice?: number;
  brightArea?: number;
};

export type ArtifactVisualClassification = {
  role: ArtifactVisualRole;
  shine: ArtifactVisualShineTier;
  primaryStatKey: string | null;
  secondaryStats: string[];
  tradeoffs: string[];
  owner: string | null;
  footprintType: string;
  cssClasses: string[];
  prompt: string;
};

export type ArtifactVisualClassifier = {
  roleClasses: Record<string, ArtifactVisualRole>;
  shineTiers: Record<string, ArtifactVisualShineTier>;
  statOrder: string[];
  primaryStatByRole: Record<string, string | null>;
  canonicalArtifactStatKey(key: string): string;
  artifactRoleClass(artifact: any): ArtifactVisualRole;
  artifactShineTier(artifact: any): ArtifactVisualShineTier;
  artifactPrimaryStatKey(artifact: any): string | null;
  artifactSecondaryStats(artifact: any): string[];
  artifactTradeoffs(artifact: any): string[];
  artifactOwner(artifact: any): string | null;
  artifactFootprintShape(artifact: any): number[][];
  artifactFootprintDimensions(artifact: any): { cols: number; rows: number };
  artifactFootprintType(artifact: any): string;
  artifactVisualClassification(artifact: any): ArtifactVisualClassification;
};

export const DEFAULT_ARTIFACT_ROLE_CLASSES: Record<string, ArtifactVisualRole>;
export const DEFAULT_ARTIFACT_SHINE_TIERS: Record<string, ArtifactVisualShineTier>;
export const DEFAULT_ARTIFACT_STAT_ORDER: string[];
export const DEFAULT_ARTIFACT_PRIMARY_STAT_BY_ROLE: Record<string, string | null>;

export function canonicalArtifactStatKey(key: string): string;
export function artifactRoleClass(artifact: any, options?: ArtifactVisualClassificationOptions): ArtifactVisualRole;
export function artifactShineTier(artifact: any, options?: ArtifactVisualClassificationOptions): ArtifactVisualShineTier;
export function artifactPrimaryStatKey(artifact: any, options?: ArtifactVisualClassificationOptions): string | null;
export function artifactSecondaryStats(artifact: any, options?: ArtifactVisualClassificationOptions): string[];
export function artifactTradeoffs(artifact: any, options?: ArtifactVisualClassificationOptions): string[];
export function artifactOwner(artifact: any, options?: ArtifactVisualClassificationOptions): string | null;
export function artifactFootprintShape(artifact: any, options?: ArtifactVisualClassificationOptions): number[][];
export function artifactFootprintDimensions(artifact: any, options?: ArtifactVisualClassificationOptions): { cols: number; rows: number };
export function artifactFootprintType(artifact: any, options?: ArtifactVisualClassificationOptions): string;
export function artifactVisualClassification(artifact: any, options?: ArtifactVisualClassificationOptions): ArtifactVisualClassification;
export function createArtifactVisualClassifier(options?: ArtifactVisualClassificationOptions): ArtifactVisualClassifier;
