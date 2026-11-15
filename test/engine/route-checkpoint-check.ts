import { connectRoadBatch } from '../../src/capabilities/planning/road-connection-batch';
import type { RoadCheckpoint } from '../../src/capabilities/planning/road-checkpoint';
import { standardCandidateBatch } from '../../src/capabilities/planning/standard-candidate-batch';
import type { CandidateCheckpoint } from '../../src/capabilities/planning/candidate-batch';
import { measureRouteBatch } from '../../src/capabilities/planning/route-cost-batch';
import type { RouteCheckpoint } from '../../src/capabilities/planning/route-checkpoint';
import { planningRoadSearch } from '../../src/adapters/screeps/planning-road-search';
export function verifyRouteCheckpoint(): void {
  const memory = Memory as Memory & { routeCheckpoint?: RouteCheckpoint; routeBatchRows?: unknown[]; candidateCheckpoint?: CandidateCheckpoint; candidateOrdinals?: number[]; roadCheckpoint?: RoadCheckpoint; roadBatchRows?: unknown[] };
  const candidates = standardCandidateBatch({ structures: [] }, memory.candidateCheckpoint, 2);
  memory.candidateCheckpoint = candidates.checkpoint;
  (memory.candidateOrdinals ??= []).push(candidates.checkpoint.next);
  const costs = Array<number>(2500).fill(255);
  for (let x = 10; x <= 15; x++) costs[10 * 50 + x] = 2;
  const roads = connectRoadBatch({
    start: { x: 10, y: 10 }, roads: [],
    targets: [{ id: 'a', position: { x: 15, y: 10 } }, { id: 'b', position: { x: 14, y: 10 } }],
    traversable: tile => costs[tile.y * 50 + tile.x]! < 255, buildable: () => true,
    search: planningRoadSearch('W0N1', costs),
  }, JSON.stringify(['native-road-v1', costs, 2000]), memory.roadCheckpoint, 1);
  if (!roads.ok) throw new Error('Native resumed roads failed: ' + JSON.stringify(roads));
  memory.roadCheckpoint = roads.checkpoint;
  (memory.roadBatchRows ??= []).push({ done: roads.done, searches: roads.searches, completed: roads.checkpoint.connections.length,
    roads: roads.checkpoint.roads.length });
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
