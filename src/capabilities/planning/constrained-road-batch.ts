import { draftRevision } from './draft-revision';
import { tileIndex } from '../../core/geometry/local-grid';
import { prepareDraftRoads } from './finish-draft';
import { completeConstrainedRoads } from './constrained-roads';
import type { ConstrainedRoadInput } from './constrained-roads';
import { connectTrafficBatch } from './traffic-road-batch';
import type { TrafficCheckpoint } from './traffic-checkpoint';
import { connectRoadBatch } from './road-connection-batch';
import type { RoadCheckpoint } from './road-checkpoint';
export interface ConstrainedRoadCheckpoint { version: 1; traffic: TrafficCheckpoint; stitching?: RoadCheckpoint }
export function constrainedRoadBatch(
  input: ConstrainedRoadInput, searchRevision: string, previous: ConstrainedRoadCheckpoint | undefined,
  maximumSearches: number, canContinue: () => boolean = () => true,
) {
  if (previous && previous.version !== 1) throw new Error('Invalid constrained road checkpoint');
  const prepared = prepareDraftRoads({ ...input, search: costs => {
    const search = input.search(costs);
    return (start, goal, roads) => search(start, goal, roads, []);
  } });
  const revision = draftRevision(input, searchRevision, prepared.costs);
  const traffic = connectTrafficBatch({ ...prepared.roads, search: input.search(prepared.costs) },
    revision, previous?.traffic, maximumSearches, canContinue);
  if (!traffic.ok) return traffic;
  const checkpoint: ConstrainedRoadCheckpoint = { version: 1, traffic: traffic.checkpoint };
  if (!traffic.done) {
    if (previous?.stitching) throw new Error('Premature core stitching checkpoint');
    return { ok: true as const, done: false as const, checkpoint, searches: traffic.searches };
  }
  const stitched = connectRoadBatch({ ...prepared.roads, roads: traffic.checkpoint.network.roads,
    targets: prepared.roads.roads.filter(tile => prepared.costs[tileIndex(tile)]! < 255)
      .map((position, index) => ({ id: 'core-road:' + index, position })) },
  revision, previous?.stitching, maximumSearches - traffic.searches, canContinue);
  if (!stitched.ok) return stitched;
  checkpoint.stitching = stitched.checkpoint;
  const searches = traffic.searches + stitched.searches;
  if (!stitched.done) return { ok: true as const, done: false as const, checkpoint, searches };
  const complete = completeConstrainedRoads(input, prepared.costs, stitched.checkpoint.roads, traffic.checkpoint.lanes);
  return { ...complete, done: true as const, checkpoint, searches };
}
