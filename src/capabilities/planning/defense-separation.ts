import { adjacentTiles, insideRoom, tileAt, tileIndex } from '../../core/geometry/local-grid';
import type { Tile } from '../../core/geometry/local-grid';
import type { TerrainCell } from './terrain';
export interface DefenseSeparationInput {
  terrain: readonly TerrainCell[]; entries: readonly Tile[];
  barriers: readonly Tile[]; assets: readonly { id: string; position: Tile }[];
}
/** All physically open border cells are potential attacker entries, including disconnected exits. */
export function defenseEntryTiles(terrain: readonly TerrainCell[]): Tile[] {
  validateTerrain(terrain);
  return terrain.flatMap((cell, index) => {
    const tile = tileAt(index);
    return cell !== 'wall' && !insideRoom(tile, 1) ? [tile] : [];
  });
}
/** Eight-way reachability treats intact barriers as blocked, including assets covered by ramparts. */
export function defenseSeparation(input: DefenseSeparationInput) {
  validateTerrain(input.terrain);
  const blocked = new Set(input.barriers.map(tileIndex));
  const reached = new Set<number>(), queue: number[] = [];
  seedEntries(input, blocked, reached, queue);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    for (const tile of adjacentTiles(tileAt(queue[cursor]!))) {
      const index = tileIndex(tile);
      if (input.terrain[index] === 'wall' || blocked.has(index) || reached.has(index)) continue;
      reached.add(index); queue.push(index);
    }
  }
  const ids = input.assets.map(asset => asset.id);
  if (ids.some(id => !id) || new Set(ids).size !== ids.length) throw new Error('Invalid protected asset identities');
  const exposed = input.assets.filter(asset => reached.has(tileIndex(asset.position))).map(asset => asset.id).sort();
  return { separated: exposed.length === 0, exposed, reachable: [...reached].sort((a, b) => a - b) };
}
function validateTerrain(terrain: readonly TerrainCell[]): void {
  if (terrain.length !== 2500 || !Array.from(terrain).every(cell => ['plain', 'swamp', 'wall'].includes(cell))) {
    throw new Error('Invalid defense terrain');
  }
}

function seedEntries(input: DefenseSeparationInput, blocked: Set<number>, reached: Set<number>, queue: number[]): void {
  for (const entry of input.entries) {
    const index = tileIndex(entry);
    if (input.terrain[index] === 'wall') throw new Error('Blocked attacker entry');
    if (!blocked.has(index) && !reached.has(index)) { reached.add(index); queue.push(index); }
  }
}
