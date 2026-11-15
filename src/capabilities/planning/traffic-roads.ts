import { connectRoads } from './road-connections';
import type { RoadConnectionsInput, RoadSearchResult } from './road-connections';
import type { Tile } from '../../core/geometry/local-grid';
import { tileIndex } from '../../core/geometry/local-grid';
import { localRange } from './service-candidates';
export interface TrafficRoadInput extends Omit<RoadConnectionsInput, 'search'> {
  search: (start: Tile, goal: Tile, roads: readonly Tile[], blocked: readonly Tile[]) => RoadSearchResult;
}
/** Primary access is mandatory; a complete second lane is retained where terrain permits. */
export function connectTrafficRoads(input: TrafficRoadInput) {
  let roads = input.roads.map(position => ({ ...position }));
  const lanes: { id: string; primaryCost: number; secondaryCost?: number; secondaryFailure?: string }[] = [];
  for (const target of input.targets) {
    let primaryPath: readonly Tile[] = [];
    const primary = connectRoads({ ...input, roads, targets: [target],
      search: (start, goal, preferred) => {
        const result = input.search(start, goal, preferred, []);
        primaryPath = result.path;
        return result;
      },
    });
    if (!primary.ok) return primary;
    const blocked = primaryPath.filter(tile => localRange(tile, input.start) > 0 && localRange(tile, target.position) > 1);
    const blockedKeys = new Set(blocked.map(tileIndex));
    const secondary = connectRoads({ ...input, roads: primary.roads, targets: [target],
      traversable: tile => !blockedKeys.has(tileIndex(tile)) && input.traversable(tile),
      search: (start, goal, preferred) => input.search(start, goal, preferred, blocked),
    });
    roads = secondary.ok ? secondary.roads : primary.roads;
    lanes.push({ id: target.id, primaryCost: primary.connections[0]!.cost,
      ...(secondary.ok ? { secondaryCost: secondary.connections[0]!.cost } : { secondaryFailure: secondary.reason }) });
  }
  return { ok: true as const, roads, lanes };
}
