import { tileAt, tileIndex } from '../../core/geometry/local-grid';
import type { Tile } from '../../core/geometry/local-grid';
import type { RoadSearchResult } from '../../capabilities/planning/road-connections';
/** Static draft costs include terrain/objects/planned obstacles; preferred roads cannot clear 255. */
export function planningRoadSearch(room: string, costs: readonly number[], maxOps = 2000) {
  if (costs.length !== 2500 || !Array.from(costs).every(cost => Number.isInteger(cost) && cost >= 1 && cost <= 255)) {
    throw new Error('Invalid planning road costs');
  }
  if (!Number.isInteger(maxOps) || maxOps < 1) throw new Error('Invalid planning search budget');
  const base = new PathFinder.CostMatrix();
  costs.forEach((cost, index) => { const tile = tileAt(index); base.set(tile.x, tile.y, cost); });
  return (start: Tile, goal: Tile, preferredRoads: readonly Tile[], blocked: readonly Tile[] = []): RoadSearchResult => {
    tileIndex(start); tileIndex(goal);
    const matrix = base.clone();
    for (const road of preferredRoads) {
      tileIndex(road);
      if (matrix.get(road.x, road.y) < 255) matrix.set(road.x, road.y, 1);
    }
    for (const tile of blocked) { tileIndex(tile); matrix.set(tile.x, tile.y, 255); }
    const result = PathFinder.search(new RoomPosition(start.x, start.y, room),
      { pos: new RoomPosition(goal.x, goal.y, room), range: 1 }, {
        maxRooms: 1, maxOps, plainCost: 2, swampCost: 2,
        roomCallback: name => name === room ? matrix : false,
      });
    return { path: result.path.map(position => ({ x: position.x, y: position.y })),
      incomplete: result.incomplete, cost: result.cost };
  };
}
