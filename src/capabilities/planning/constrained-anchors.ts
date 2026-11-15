import { tileIndex } from '../../core/geometry/local-grid';
import type { Tile } from '../../core/geometry/local-grid';
export interface AnchorOptions { controller: Tile; preferred: readonly Tile[]; limit?: number }
function centerRange(tile: Tile): number {
  return Math.max(Math.abs(tile.x - 25), Math.abs(tile.y - 25));
}
function controllerDistance(tile: Tile, controller: Tile): number {
  return Math.abs(tile.x - controller.x) + Math.abs(tile.y - controller.y);
}
/** Legacy constrained search order, with an explicit configurable search bound. */
export function constrainedAnchors(options: AnchorOptions): Tile[] {
  tileIndex(options.controller);
  const limit = options.limit ?? 36;
  if (!Number.isInteger(limit) || limit < 1 || limit > 2500) throw new Error('Invalid anchor limit');
  const preferred = new Set(options.preferred.map(tileIndex));
  const candidates = anchorPool(options.preferred);
  return [...candidates.values()].sort((a, b) =>
    Number(preferred.has(tileIndex(b))) - Number(preferred.has(tileIndex(a)))
    || centerRange(a) - centerRange(b)
    || controllerDistance(a, options.controller) - controllerDistance(b, options.controller))
    .slice(0, limit);
}

function anchorPool(points: readonly Tile[]): Map<number, Tile> {
  const candidates = new Map<number, Tile>();
  for (const point of points) candidates.set(tileIndex(point), { ...point });
  for (let x = 9; x <= 40; x += 2) {
    for (let y = 9; y <= 40; y += 2) {
      const tile = { x, y };
      if (!candidates.has(tileIndex(tile))) candidates.set(tileIndex(tile), tile);
    }
  }
  return candidates;
}
