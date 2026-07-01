// Bag shape mask helpers for backpack/grid games.
//
// A bag's `shape` is a 2D array of 0/1 values, indexed `shape[y][x]`,
// defining which cells inside the bag's `width x height` bounding box are real
// slots. A 1 means the cell is part of the bag and can hold an item; a 0 means
// the cell is outside the usable shape.
//
// Bags without a `shape` field are treated as full rectangles. The canonical
// rectangle orientation is landscape for legacy callers that display narrow
// rectangular bags horizontally by default.

export function defaultRectangleShape(width, height) {
  const shape = [];
  for (let y = 0; y < height; y += 1) {
    shape.push(new Array(width).fill(1));
  }
  return shape;
}

export function getBagShape(bagArtifact) {
  if (!bagArtifact) return [];
  if (bagArtifact.shape) return bagArtifact.shape;
  const cols = Math.max(bagArtifact.width, bagArtifact.height);
  const rows = Math.min(bagArtifact.width, bagArtifact.height);
  return defaultRectangleShape(cols, rows);
}

export function rotateShape(shape) {
  const rows = shape.length;
  const cols = rows > 0 ? shape[0].length : 0;
  const rotated = [];
  for (let y = 0; y < cols; y += 1) {
    const row = new Array(rows).fill(0);
    for (let x = 0; x < rows; x += 1) {
      row[x] = shape[rows - 1 - x][y];
    }
    rotated.push(row);
  }
  return rotated;
}

export function normalizeRotation(rotation) {
  if (rotation === true) return 1;
  if (rotation === false || rotation == null) return 0;
  const value = Number(rotation);
  if (!Number.isFinite(value)) return 0;
  return ((Math.trunc(value) % 4) + 4) % 4;
}

export function getEffectiveShape(bagArtifact, rotation) {
  let shape = getBagShape(bagArtifact);
  const turns = normalizeRotation(rotation);
  for (let i = 0; i < turns; i += 1) {
    shape = rotateShape(shape);
  }
  return shape;
}

export function getEffectiveDimensions(bagArtifact, rotated) {
  const shape = getEffectiveShape(bagArtifact, rotated);
  return {
    cols: shape.length > 0 ? shape[0].length : 0,
    rows: shape.length
  };
}

export function isCellInShape(shape, x, y) {
  if (y < 0 || y >= shape.length) return false;
  const row = shape[y];
  if (x < 0 || x >= row.length) return false;
  return !!row[x];
}

export function shapeArea(shape) {
  let area = 0;
  for (const row of shape) {
    for (const cell of row) {
      if (cell) area += 1;
    }
  }
  return area;
}

