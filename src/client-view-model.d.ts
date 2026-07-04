export interface LoadoutProjectionRow {
  id?: string | number;
  artifactId: string;
  x?: number | string | null;
  y?: number | string | null;
  width?: number | string | null;
  height?: number | string | null;
  active?: boolean | number;
  rotated?: boolean | number;
  freshPurchase?: boolean;
  [key: string]: unknown;
}

export interface ProjectedBuilderItem {
  id?: string | number;
  artifactId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProjectedContainerItem {
  id?: string | number;
  artifactId: string;
}

export interface ProjectedActiveBag {
  id?: string | number;
  artifactId: string;
  anchorX: number;
  anchorY: number;
}

export interface ProjectedRotatedBag {
  id?: string | number;
  artifactId: string;
  rotation: number;
}

export interface LoadoutProjection {
  builderItems: ProjectedBuilderItem[];
  containerItems: ProjectedContainerItem[];
  activeBags: ProjectedActiveBag[];
  rotatedBags: ProjectedRotatedBag[];
  freshPurchases: string[];
}

export interface GridBagRow {
  bagId?: string | number;
  row: number;
  color: string;
  artifactId: string;
  rotation: number;
  enabledCells: number[];
  bboxStart: number;
  bboxEnd: number;
}

export interface GridPropsProjection {
  items: ProjectedBuilderItem[];
  bagRows: GridBagRow[];
  totalRows: number;
}

export interface GridPropsOptions {
  columns?: number;
  minRows?: number;
}

export interface AssetPackSummaryLabels {
  invalid?: string;
  disabled?: string;
  unavailable?: string;
  future?: string;
  expired?: string;
  guaranteeTemplate?: string;
  pityTemplate?: string;
  pityReadyTemplate?: string;
  duplicateTemplate?: string;
}

export interface AssetPackPortraitProjection {
  assetId?: string | null;
  packId?: string | null;
  unlocked?: boolean;
  rollAvailable?: boolean;
  [key: string]: unknown;
}

export interface AssetPackSummaryInput {
  id?: string;
  name?: unknown;
  availability?: string;
  status?: string;
  active?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  rollPriceAmount?: number;
  totalItems?: number;
  ownedCount?: number;
  remainingCount?: number;
  rollableCount?: number;
  complete?: boolean;
  uniqueComplete?: boolean;
  copyComplete?: boolean;
  duplicateCopies?: number;
  rollSize?: number;
  nextRollItemCount?: number;
  duplicatePolicy?: { enabled?: boolean; [key: string]: unknown };
  raritySummary?: Array<{ rarity?: string | null; probability?: number; [key: string]: unknown }>;
  guarantees?: { rules?: Array<{ count?: number; minRarity?: string | null; [key: string]: unknown }> };
  pity?: { rules?: Array<{ threshold?: number; remaining?: number; active?: boolean; minRarity?: string | null; [key: string]: unknown }> };
  burn?: { rules?: Array<{ id?: string; ready?: boolean; sourceCount?: number; sourceRarity?: string | null; [key: string]: unknown }> };
  items?: Array<{ assetId?: string | null; rarity?: string | null; dropWeight?: number; [key: string]: unknown }>;
  [key: string]: unknown;
}

export interface AssetRollPackSummary {
  id?: string;
  name: unknown;
  total: number;
  owned: number;
  left: number;
  rollSize: number;
  nextRollItemCount: number;
  active: boolean;
  availabilityLabel: string;
  price: number;
  complete: boolean;
  duplicateEnabled: boolean;
  uniqueComplete: boolean;
  copyComplete: boolean;
  duplicateCopies: number;
  canRoll: boolean;
  canBurn: boolean;
  burnRuleId: string | null;
  burnCost: number;
  burnRarity: string;
  odds: string;
  guaranteeText: string;
  pityText: string;
  duplicateText: string;
}

export function projectLoadoutItems(
  loadoutItems?: readonly LoadoutProjectionRow[],
  bagArtifactIds?: Iterable<string>,
  getArtifact?: ((artifactId: string) => unknown) | Map<string, unknown> | null
): LoadoutProjection;

export function prepareGridProps(
  loadoutItems?: readonly LoadoutProjectionRow[],
  bagArtifactIds?: Iterable<string>,
  getArtifact?: ((artifactId: string) => unknown) | Map<string, unknown> | null,
  options?: GridPropsOptions
): GridPropsProjection;

export function formatAssetPackRarityOdds(
  pack: AssetPackSummaryInput | null | undefined,
  options?: { rarityLabel?: (rarity: unknown) => string }
): string;

export function formatAssetPackGuaranteeText(
  pack: AssetPackSummaryInput | null | undefined,
  options?: { rarityLabel?: (rarity: unknown) => string; template?: string }
): string;

export function formatAssetPackPityText(
  pack: AssetPackSummaryInput | null | undefined,
  options?: { rarityLabel?: (rarity: unknown) => string; template?: string; readyTemplate?: string }
): string;

export function formatAssetPackDuplicateText(
  pack: AssetPackSummaryInput | null | undefined,
  options?: { template?: string }
): string;

export function assetPackIsActive(
  pack: AssetPackSummaryInput | null | undefined,
  options?: { now?: number | string | Date }
): boolean;

export function assetPackAvailabilityLabel(
  pack: AssetPackSummaryInput | null | undefined,
  options?: { now?: number | string | Date; labels?: AssetPackSummaryLabels }
): string;

export function summarizeAssetRollPacks(input?: {
  portraits?: readonly AssetPackPortraitProjection[];
  packs?: readonly AssetPackSummaryInput[];
  ownedAssetIds?: Iterable<string>;
  now?: number | string | Date;
  packName?: (pack: AssetPackSummaryInput) => unknown;
  rarityLabel?: (rarity: unknown) => string;
  labels?: AssetPackSummaryLabels;
}): AssetRollPackSummary[];
