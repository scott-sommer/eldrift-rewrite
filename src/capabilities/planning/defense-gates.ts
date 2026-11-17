import type { Tile } from '../../core/geometry/local-grid';
import { tileIndex } from '../../core/geometry/local-grid';
import type { PlacedTile } from './template';
/** Planned road/barrier crossings are mandatory friendly gates, alongside explicit operator requirements. */
export function defenseGates(placements: readonly PlacedTile[], barriers: readonly PlacedTile[], required: readonly Tile[]): Tile[] {
  const barrierTiles = new Set(barriers.map(entry => tileIndex(entry.position)));
  const crossings = placements.filter(entry => entry.type === 'road' && barrierTiles.has(tileIndex(entry.position)))
    .map(entry => entry.position);
  return [...new Map([...required, ...crossings].map(tile => [tileIndex(tile), { ...tile }])).values()]
    .sort((a, b) => tileIndex(a) - tileIndex(b));
}
