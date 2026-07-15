import { isCellInShape } from './bag-shape.js';

export function cellKey(x, y) {
  return `${x}:${y}`;
}

export function pieceCells(item, shape = null) {
  const cells = [];
  const x0 = Number(item.x);
  const y0 = Number(item.y);
  const width = Number(item.width);
  const height = Number(item.height);
  for (let dx = 0; dx < width; dx += 1) {
    for (let dy = 0; dy < height; dy += 1) {
      if (shape && !isCellInShape(shape, dx, dy)) continue;
      cells.push(cellKey(x0 + dx, y0 + dy));
    }
  }
  return cells;
}

export function cellSet(cells) {
  return new Set(cells);
}

export function setsIntersect(a, b) {
  for (const key of a) {
    if (b.has(key)) return true;
  }
  return false;
}

