import { tileIndex } from '../../core/geometry/local-grid';
import type { Tile } from '../../core/geometry/local-grid';
import { connectRoads } from './road-connections';
import { localRange } from './service-candidates';
import { trafficCheckpoint } from './traffic-checkpoint';
import type { TrafficCheckpoint } from './traffic-checkpoint';
import type { TrafficRoadInput } from './traffic-roads';
/** Each primary or alternate search consumes one slot; pending networks are never final plans. */
export function connectTrafficBatch(
  input: TrafficRoadInput, revision: string, previous: TrafficCheckpoint | undefined,
  maximumSearches: number, canContinue: () => boolean = () => true,
) {
  if (!Number.isSafeInteger(maximumSearches) || maximumSearches < 0) throw new Error('Invalid traffic batch budget');
  const checkpoint = trafficCheckpoint(input, revision, previous);
  let searches = 0;
  while (checkpoint.lanes.length < input.targets.length && searches < maximumSearches && canContinue()) {
    const failure = checkpoint.blocked === undefined ? primaryStep(input, checkpoint) : secondaryStep(input, checkpoint);
    searches++;
    if (failure) return { ...failure, checkpoint, searches };
  }
  return { ok: true as const, checkpoint, searches, done: checkpoint.lanes.length === input.targets.length };
}
function primaryStep(input: TrafficRoadInput, checkpoint: TrafficCheckpoint) {
  const target = input.targets[checkpoint.lanes.length]!;
  let path: readonly Tile[] = [];
  const result = connectRoads({ ...input, roads: checkpoint.network.roads, targets: [target],
    search: (start, goal, roads) => {
      const found = input.search(start, goal, roads, []);
      path = found.path;
      return found;
    } });
  if (!result.ok) return result;
  checkpoint.network.roads = result.roads;
  checkpoint.network.connections.push(result.connections[0]!);
  checkpoint.blocked = path.filter(tile => localRange(tile, input.start) > 0 && localRange(tile, target.position) > 1)
    .map(tile => ({ ...tile }));
  return undefined;
}
function secondaryStep(input: TrafficRoadInput, checkpoint: TrafficCheckpoint) {
  const target = input.targets[checkpoint.lanes.length]!;
  const blocked = checkpoint.blocked!;
  const keys = new Set(blocked.map(tileIndex));
  const result = connectRoads({ ...input, roads: checkpoint.network.roads, targets: [target],
    traversable: tile => !keys.has(tileIndex(tile)) && input.traversable(tile),
    search: (start, goal, roads) => input.search(start, goal, roads, blocked) });
  if (result.ok) checkpoint.network.roads = result.roads;
  checkpoint.lanes.push({ id: target.id, primaryCost: checkpoint.network.connections.at(-1)!.cost,
    ...(result.ok ? { secondaryCost: result.connections[0]!.cost } : { secondaryFailure: result.reason }) });
  delete checkpoint.blocked;
  return undefined;
}
