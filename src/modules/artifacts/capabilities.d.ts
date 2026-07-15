export interface ArtifactFamilyCapability {
  statsInBattle: boolean;
  container: boolean;
  holdsItems: boolean;
  [key: string]: unknown;
}

export type ArtifactFamilyCapabilityMap = Record<string, ArtifactFamilyCapability>;

export interface ArtifactFamilyCapabilityOptions {
  familyCapabilities?: ArtifactFamilyCapabilityMap | null;
  familyCaps?: ArtifactFamilyCapabilityMap | null;
  fallbackFamily?: string | null;
  bagFamily?: string | null;
}

export type ArtifactFamilySource = {
  family?: string | null;
  [key: string]: unknown;
} | null | undefined;

export type PositionedItemSource = {
  x?: unknown;
  y?: unknown;
  [key: string]: unknown;
} | null | undefined;

export const DEFAULT_ARTIFACT_FAMILY_CAPABILITY: Readonly<ArtifactFamilyCapability>;
export const DEFAULT_ARTIFACT_FAMILY_CAPABILITIES: Readonly<ArtifactFamilyCapabilityMap>;
export const FAMILY_CAPS: Readonly<ArtifactFamilyCapabilityMap>;

export function familyCaps(
  family?: string | null,
  options?: ArtifactFamilyCapabilityOptions
): ArtifactFamilyCapability;

export function isBag(
  artifact?: ArtifactFamilySource,
  options?: ArtifactFamilyCapabilityOptions
): boolean;

export function isCombatArtifact(
  artifact?: ArtifactFamilySource,
  options?: ArtifactFamilyCapabilityOptions
): boolean;

export function isContainerItem(item?: PositionedItemSource): boolean;

export function contributesStats(
  artifact?: ArtifactFamilySource,
  item?: PositionedItemSource,
  options?: ArtifactFamilyCapabilityOptions
): boolean;
