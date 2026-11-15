import { adjacentTiles, insideRoom } from '../../core/geometry/local-grid';
import type { Tile } from '../../core/geometry/local-grid';
import { localRange } from './service-candidates';
export interface ContainerSearch {
  origin: Tile; target?: Tile;
  available: (position: Tile) => boolean;
  adjacentRoads: (position: Tile) => number;
  open: (position: Tile) => boolean;
}
/** Legacy container heuristic, with explicit buildability and neighbouring-access policies. */
export function adjacentContainer(search: ContainerSearch): Tile | undefined {
  const candidates = adjacentTiles(search.origin).filter(position => insideRoom(position, 1) && search.available(position))
    .sort((a, b) => a.x - b.x || a.y - b.y);
  let best: Tile | undefined, bestScore = Infinity;
  for (const position of candidates) {
    const targetCost = search.target ? localRange(position, search.target) * 4 : 0;
    const score = targetCost - search.adjacentRoads(position) * 2 - adjacentTiles(position).filter(search.open).length;
    if (score < bestScore) { best = position; bestScore = score; }
  }
  return best;
}
