import { adjacentTiles, insideRoom, tileIndex } from '../../core/geometry/local-grid';
import type { Tile } from '../../core/geometry/local-grid';
export interface ServiceCandidate { position: Tile; range: number; adjacentRoads: number }
export function localRange(a: Tile, b: Tile): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}
/** Supply only usable roads; occupied road/lab overlaps must be removed by the caller. */
export function serviceCandidates(
  storage: Tile, roads: readonly Tile[], available: (tile: Tile) => boolean,
): ServiceCandidate[] {
  tileIndex(storage);
  const roadKeys = new Set(roads.map(tileIndex));
  const neighbours = new Map<number, Tile>();
  for (const road of roads) for (const tile of adjacentTiles(road)) neighbours.set(tileIndex(tile), tile);
  return [...neighbours.values()].filter(tile => insideRoom(tile, 2)
    && !roadKeys.has(tileIndex(tile)) && localRange(storage, tile) <= 12 && available(tile))
    .map(position => ({
      position, range: localRange(storage, position),
      adjacentRoads: adjacentTiles(position).filter(tile => roadKeys.has(tileIndex(tile))).length,
    }));
}
export function serviceCandidateScore(candidate: ServiceCandidate, type: string, storage: Tile, controller: Tile): number {
  let score = candidate.range * 10 - candidate.adjacentRoads * 6;
  if (type === 'spawn') score += Math.abs(candidate.position.x - storage.x) + Math.abs(candidate.position.y - storage.y);
  if (type === 'tower') score += localRange(candidate.position, controller) * 2;
  if (type === 'extension') score += Math.max(0, candidate.range - 4) * 3;
  return score;
}
export function utilityCandidateScore(candidate: ServiceCandidate, controller: Tile): number {
  return candidate.range * 8 + localRange(candidate.position, controller);
}
export function selectServicePositions(
  candidates: readonly ServiceCandidate[], count: number, score: (candidate: ServiceCandidate) => number,
): Tile[] {
  if (!Number.isInteger(count) || count < 0) throw new Error('Invalid service count');
  return [...candidates].sort((a, b) => score(a) - score(b)
    || (a.position.x + ':' + a.position.y).localeCompare(b.position.x + ':' + b.position.y))
    .slice(0, count).map(candidate => ({ ...candidate.position }));
}
