import type { BagShape } from './bag-shape.js';

export interface GridItemLike {
  x: number | string;
  y: number | string;
  width: number | string;
  height: number | string;
  [key: string]: unknown;
}

export function cellKey(x: number, y: number): string;
export function pieceCells(item: GridItemLike, shape?: BagShape | null): string[];
export function cellSet(cells: Iterable<string>): Set<string>;
export function setsIntersect(a: Iterable<string>, b: Set<string>): boolean;
