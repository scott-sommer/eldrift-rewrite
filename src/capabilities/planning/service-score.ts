import { adjacentTiles, tileIndex } from '../../core/geometry/local-grid';
import type { Tile } from '../../core/geometry/local-grid';

export interface ServiceLayout {
  storage: Tile;
  spawns: readonly Tile[];
  extensions: readonly Tile[];
  roads: readonly Tile[];
}
export interface ServiceScore {
  weight: number;
  distanceCost: number;
  roadCredit: number;
  score: number;
}
/** Legacy distributor heuristic; not a substitute for traversable service-path validation. */
export function scoreDistributorService(layout: ServiceLayout): ServiceScore {
  tileIndex(layout.storage);
  const roads = new Set(layout.roads.map(tileIndex));
  const result: ServiceScore = { weight: 0, distanceCost: 0, roadCredit: 0, score: -Infinity };
  for (const [targets, weight] of [[layout.spawns, 8], [layout.extensions, 1]] as const) {
    for (const target of targets) {
      const adjacentRoads = adjacentTiles(target).filter(tile => roads.has(tileIndex(tile))).length;
      const distance = Math.max(Math.abs(target.x - layout.storage.x), Math.abs(target.y - layout.storage.y));
      result.weight += weight;
      result.distanceCost += distance * weight * 10;
      result.roadCredit += Math.min(adjacentRoads, 3) * weight * 4;
    }
  }
  if (result.weight > 0) result.score = 100000 - result.distanceCost + result.roadCredit;
  return result;
}
