import { tileIndex } from '../../core/geometry/local-grid';
import type { Tile } from '../../core/geometry/local-grid';
import { nearbyUtility } from './utility-placement';
import type { StageRequest } from './capacity-scheduling';
export interface AuxiliaryInput {
  storage: Tile; reserved: readonly Tile[];
  available: (type: string, position: Tile) => boolean;
  adjacentRoads: (position: Tile) => number;
}
export interface AuxiliaryProposal extends StageRequest { tag: 'factory' | 'auxiliary' }
const recipes = [
  { type: 'factory', minimumRcl: 7, priority: -260, tag: 'factory', maxRange: 5,
    targets: [{ x: 3, y: 2 }, { x: 2, y: -2 }, { x: -2, y: 2 }, { x: -3, y: -1 }] },
  { type: 'link', minimumRcl: 8, priority: -345, tag: 'auxiliary', maxRange: 4, targets: [{ x: 3, y: -1 }] },
  { type: 'link', minimumRcl: 8, priority: -345, tag: 'auxiliary', maxRange: 4, targets: [{ x: -3, y: 1 }] },
] as const;
/** Legacy preferences are room-axis offsets, deliberately not core-transform offsets. */
export function auxiliaryInfrastructure(input: AuxiliaryInput) {
  const reserved = new Set(input.reserved.map(tileIndex));
  const entries: AuxiliaryProposal[] = [], missing: string[] = [];
  for (const [index, recipe] of recipes.entries()) {
    const position = nearbyUtility({
      center: input.storage, minRange: 2, maxRange: recipe.maxRange,
      targets: recipe.targets.map(offset => ({ x: input.storage.x + offset.x, y: input.storage.y + offset.y })),
      available: tile => !reserved.has(tileIndex(tile)) && input.available(recipe.type, tile),
      adjacentRoads: input.adjacentRoads,
    });
    if (!position) { missing.push(recipe.type + ':' + index); continue; }
    reserved.add(tileIndex(position));
    entries.push({ type: recipe.type, position, minimumRcl: recipe.minimumRcl, priority: recipe.priority, tag: recipe.tag });
  }
  return { entries, missing };
}
