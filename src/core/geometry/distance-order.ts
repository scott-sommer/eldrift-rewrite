import { insideRoom } from './local-grid';
import type { Tile } from './local-grid';
/** Chebyshev rings in row-major order; no grid allocation or sort before the first tile. */
export function* tilesByDistance(center: Tile, margin = 2): Generator<Tile> {
  if (!insideRoom(center) || !Number.isInteger(margin) || margin < 0 || margin > 24) {
    throw new Error('Invalid distance traversal');
  }
  for (let radius = 0; radius < 50; radius++) {
    const first = Math.max(margin, center.y - radius), last = Math.min(49 - margin, center.y + radius);
    for (let y = first; y <= last; y++) {
      for (const x of ringRow(center, radius, y, margin)) yield { x, y };
    }
  }
}
function* ringRow(center: Tile, radius: number, y: number, margin: number): Generator<number> {
  const left = center.x - radius, right = center.x + radius;
  if (Math.abs(y - center.y) === radius) {
    for (let x = Math.max(margin, left); x <= Math.min(49 - margin, right); x++) yield x;
    return;
  }
  if (left >= margin && left <= 49 - margin) yield left;
  if (right !== left && right >= margin && right <= 49 - margin) yield right;
}
