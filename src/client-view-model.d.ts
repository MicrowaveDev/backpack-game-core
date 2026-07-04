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
