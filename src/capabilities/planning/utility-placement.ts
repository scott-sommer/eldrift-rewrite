import { adjacentTiles, insideRoom, tileIndex } from '../../core/geometry/local-grid';
import type { Tile } from '../../core/geometry/local-grid';
import { localRange } from './service-candidates';
export interface UtilitySearch {
  center: Tile; minRange: number; maxRange: number; targets: readonly Tile[];
  available: (position: Tile) => boolean; adjacentRoads: (position: Tile) => number;
}
/** Legacy x-major enumeration and first equal-score winner, independent of game globals. */
export function nearbyUtility(search: UtilitySearch): Tile | undefined {
  validateSearch(search);
  let best: Tile | undefined, bestScore = Infinity;
  for (let x = Math.max(1, search.center.x - search.maxRange); x <= Math.min(48, search.center.x + search.maxRange); x++) {
    for (let y = Math.max(1, search.center.y - search.maxRange); y <= Math.min(48, search.center.y + search.maxRange); y++) {
      const position = { x, y }, range = localRange(search.center, position);
      if (range < search.minRange || !search.available(position)) continue;
      const score = range * 10 + search.targets.reduce((sum, target) => sum + localRange(position, target), 0)
        - search.adjacentRoads(position) * 2;
      if (score < bestScore) { best = position; bestScore = score; }
    }
  }
  return best;
}
export interface SourceLinkSearch {
  source: Tile; container?: Tile; storage: Tile;
  available: (position: Tile) => boolean; adjacentRoads: (position: Tile) => number;
}
export function sourceLinkPosition(search: SourceLinkSearch): Tile | undefined {
  const center = search.container ?? search.source;
  const candidates = adjacentTiles(center).filter(position => insideRoom(position, 1)
    && localRange(position, search.source) <= 2 && search.available(position));
  candidates.sort((a, b) => a.x - b.x || a.y - b.y);
  let best: Tile | undefined, bestScore = Infinity;
  for (const position of candidates) {
    const score = localRange(center, position) * 30 + localRange(position, search.storage) * 4
      - search.adjacentRoads(position) * 2;
    if (score < bestScore) { best = position; bestScore = score; }
  }
  return best;
}

function validateSearch(search: UtilitySearch): void {
  tileIndex(search.center);
  if (!Number.isInteger(search.minRange) || !Number.isInteger(search.maxRange)
    || search.minRange < 0 || search.maxRange < search.minRange || search.maxRange > 49) throw new Error('Invalid utility range');
}
