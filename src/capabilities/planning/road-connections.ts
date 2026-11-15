import { tileIndex } from '../../core/geometry/local-grid';
import type { Tile } from '../../core/geometry/local-grid';
import { localRange } from './service-candidates';
export interface RoadSearchResult { path: readonly Tile[]; incomplete: boolean; cost: number }
export interface RoadConnectionsInput {
  start: Tile; targets: readonly { id: string; position: Tile }[]; roads: readonly Tile[];
  search: (start: Tile, goal: Tile, preferredRoads: readonly Tile[]) => RoadSearchResult;
  traversable: (position: Tile) => boolean;
  buildable: (position: Tile) => boolean;
}
export type RoadConnectionsResult =
  | { ok: true; roads: Tile[]; connections: { id: string; cost: number; steps: number }[] }
  | { ok: false; target: string; reason: string };
/** Detached road draft: incomplete or malformed searches never publish partial connections. */
export function connectRoads(input: RoadConnectionsInput): RoadConnectionsResult {
  tileIndex(input.start);
  const roads = new Map(input.roads.map(position => [tileIndex(position), { ...position }]));
  const connections: { id: string; cost: number; steps: number }[] = [];
  for (const target of input.targets) {
    tileIndex(target.position);
    const result = input.search(input.start, target.position, [...roads.values()].map(position => ({ ...position })));
    const failure = pathFailure(input, target.position, result);
    if (failure) return { ok: false, target: target.id, reason: failure };
    for (const position of result.path) roads.set(tileIndex(position), { ...position });
    connections.push({ id: target.id, cost: result.cost, steps: result.path.length });
  }
  return { ok: true, roads: [...roads.values()], connections };
}
function pathFailure(input: RoadConnectionsInput, goal: Tile, result: RoadSearchResult): string | undefined {
  if (result.incomplete) return 'incomplete-search';
  if (!Number.isFinite(result.cost) || result.cost < 0) return 'invalid-cost';
  let previous = input.start;
  for (const position of result.path) {
    tileIndex(position);
    if (localRange(previous, position) !== 1) return 'discontinuous-path';
    if (!input.traversable(position)) return 'blocked-path';
    if (!input.buildable(position)) return 'unbuildable-road';
    previous = position;
  }
  return localRange(previous, goal) <= 1 ? undefined : 'unreached-target';
}
