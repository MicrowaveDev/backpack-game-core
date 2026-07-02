export type BagShape = number[][];

export interface BagShapeLike {
  width?: number;
  height?: number;
  shape?: BagShape | null;
  [key: string]: unknown;
}

export interface EffectiveDimensions {
  cols: number;
  rows: number;
}

export function defaultRectangleShape(width: number, height: number): BagShape;
export function getBagShape(bagArtifact: BagShapeLike | null | undefined): BagShape;
export function rotateShape(shape: BagShape): BagShape;
export function normalizeRotation(rotation: unknown): number;
export function getEffectiveShape(
  bagArtifact: BagShapeLike | null | undefined,
  rotation: unknown
): BagShape;
export function getEffectiveDimensions(
  bagArtifact: BagShapeLike | null | undefined,
  rotated: unknown
): EffectiveDimensions;
export function isCellInShape(shape: BagShape, x: number, y: number): boolean;
export function shapeArea(shape: BagShape): number;
