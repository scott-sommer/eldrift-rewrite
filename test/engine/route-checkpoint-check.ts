import { measureRouteBatch } from '../../src/capabilities/planning/route-cost-batch';
import type { RouteCheckpoint } from '../../src/capabilities/planning/route-checkpoint';
import { planningRoadSearch } from '../../src/adapters/screeps/planning-road-search';
export function verifyRouteCheckpoint(): void {
  const memory = Memory as Memory & { routeCheckpoint?: RouteCheckpoint; routeBatchRows?: unknown[] };
  const costs = Array<number>(2500).fill(255);
  for (let x = 10; x <= 15; x++) costs[10 * 50 + x] = 2;
  const result = measureRouteBatch({
    start: { x: 10, y: 10 }, roads: [],
    targets: [{ id: 'a', position: { x: 15, y: 10 }, weight: 1 }, { id: 'b', position: { x: 14, y: 10 }, weight: 2 }],
    traversable: tile => costs[tile.y * 50 + tile.x]! < 255,
    search: planningRoadSearch('W0N1', costs),
  }, JSON.stringify(['native-v1', costs, 2000]), memory.routeCheckpoint, 1);
  if (!result.ok) throw new Error('Native resumed route failed: ' + JSON.stringify(result));
  memory.routeCheckpoint = result.checkpoint;
  (memory.routeBatchRows ??= []).push({ tick: Game.time, done: result.done, searches: result.searches,
    completed: result.checkpoint.routes.length, ...(result.done ? { total: result.total } : {}) });
}
