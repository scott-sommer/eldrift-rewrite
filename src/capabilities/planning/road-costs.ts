import { tileIndex } from '../../core/geometry/local-grid';
import type { Tile } from '../../core/geometry/local-grid';
import type { assessRoom } from './assessment';
import type { PlacedTile } from './template';
/** Construction-route costs: clearance zones and every observed/planned blocker remain impassable. */
export function planningRoadCosts(
  assessment: ReturnType<typeof assessRoom>, placements: readonly PlacedTile[],
  observedRoads: readonly Tile[], blocksMovement: (type: string) => boolean,
): number[] {
  const costs = assessment.terrain.costs.map((cost, index) => assessment.walkable[index] ? cost : 255);
  for (const position of observedRoads) preferRoad(costs, position);
  for (const entry of placements) {
    if (entry.type === 'road') preferRoad(costs, entry.position);
  }
  for (const entry of placements) {
    if (blocksMovement(entry.type)) costs[tileIndex(entry.position)] = 255;
  }
  for (const constraint of assessment.constraints) {
    if (constraint.kind !== 'locked' || constraint.type && blocksMovement(constraint.type)) {
      costs[tileIndex(constraint.position)] = 255;
    }
  }
  return costs;
}
function preferRoad(costs: number[], position: Tile): void {
  const index = tileIndex(position);
  if (costs[index]! < 255) costs[index] = 1;
}
