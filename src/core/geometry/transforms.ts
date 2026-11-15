import { insideRoom, validOffset } from './local-grid';
import type { Tile } from './local-grid';
/** Stable legacy room.layout.shared transform indices; offsets use screen coordinates. */
export type TransformIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
const matrices = [
  [1, 0, 0, 1], [0, -1, 1, 0], [-1, 0, 0, -1], [0, 1, -1, 0],
  [-1, 0, 0, 1], [1, 0, 0, -1], [0, 1, 1, 0], [0, -1, -1, 0],
] as const;
export function transformOffset(point: Tile, index: TransformIndex): Tile {
  if (!validOffset(point) || !Number.isInteger(index) || index < 0 || index > 7) throw new Error('Invalid transform');
  const [a, b, c, d] = matrices[index];
  return { x: (a * point.x + b * point.y) || 0, y: (c * point.x + d * point.y) || 0 };
}
export function placeOffset(anchor: Tile, offset: Tile, transform: TransformIndex, margin = 0): Tile | undefined {
  if (!insideRoom(anchor)) throw new Error('Invalid anchor');
  const point = transformOffset(offset, transform);
  const result = { x: anchor.x + point.x, y: anchor.y + point.y };
  return insideRoom(result, margin) ? result : undefined;
}

/** Recover a candidate anchor from an existing structure and its transformed template offset. */
export function anchorForPlacement(position: Tile, offset: Tile, transform: TransformIndex): Tile | undefined {
  if (!insideRoom(position)) throw new Error('Invalid placement');
  const point = transformOffset(offset, transform);
  const anchor = { x: position.x - point.x, y: position.y - point.y };
  return insideRoom(anchor) ? anchor : undefined;
}
