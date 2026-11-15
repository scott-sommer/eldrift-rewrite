import { assessRoom } from './assessment';
import { planningRoadCosts } from './road-costs';
import { connectRoads } from './road-connections';
import { connectTrafficRoads } from './traffic-roads';
import type { TrafficRoadInput } from './traffic-roads';
import type { FinishDraftInput } from './finish-draft';
import { placementFailures } from './placement-validation';
import { tileIndex } from '../../core/geometry/local-grid';
export type ConstrainedRoadInput = Omit<FinishDraftInput, 'search'> & {
  search: (costs: readonly number[]) => TrafficRoadInput['search'];
};
export function constrainedRoads(input: ConstrainedRoadInput) {
  const assessment = assessRoom(input.observation);
  const observed = input.observation.infrastructure.filter(entry => entry.type === 'road').map(entry => entry.position);
  const costs = planningRoadCosts(assessment, input.entries, observed, input.blocksMovement);
  const roads = input.entries.filter(entry => entry.type === 'road').map(entry => entry.position);
  const result = connectTrafficRoads({
    start: input.storage, targets: input.anchors.map((position, index) => ({ id: String(index), position })),
    roads, search: input.search(costs), traversable: tile => costs[tileIndex(tile)]! < 255,
    buildable: position => placementFailures([{ type: 'road', position }], input.observation).length === 0,
  });
  if (!result.ok) return result;
  const search = input.search(costs);
  const stitched = connectRoads({
    start: input.storage, roads: result.roads,
    targets: roads.filter(tile => costs[tileIndex(tile)]! < 255).map((position, index) => ({ id: 'core-road:' + index, position })),
    search: (start, goal, preferred) => search(start, goal, preferred, []),
    traversable: tile => costs[tileIndex(tile)]! < 255,
    buildable: position => placementFailures([{ type: 'road', position }], input.observation).length === 0,
  });
  if (!stitched.ok) return stitched;
  const existing = new Set(roads.map(tileIndex));
  const additions = stitched.roads.filter(tile => !existing.has(tileIndex(tile)))
    .map(position => ({ type: 'road', position, rcl: 4, priority: -190, tag: 'logistics' }));
  return { ok: true as const, entries: [...input.entries, ...additions], lanes: result.lanes,
    usableRoads: stitched.roads.filter(tile => costs[tileIndex(tile)]! < 255) };
}
