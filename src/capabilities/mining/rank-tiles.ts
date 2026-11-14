import type { Position } from '../movement/step';
import { stationTile } from './station';
export interface StationInfrastructure { container?: Position; link?: Position }
function range(a: Position, b: Position | undefined): number {
  if (!b || a.room !== b.room) return Infinity;
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}
/** Prefer standing on the container, then link access, then adjacent container access. */
export function rankMiningTiles(tiles: readonly Position[], infrastructure: StationInfrastructure): Position[] {
  const score = (tile: Position) => (range(tile, infrastructure.container) === 0 ? 4 : 0)
    + (range(tile, infrastructure.link) <= 1 ? 2 : 0) + (range(tile, infrastructure.container) <= 1 ? 1 : 0);
  return [...tiles].sort((a, b) => score(b) - score(a) || stationTile(a).localeCompare(stationTile(b)));
}
