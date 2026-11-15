import { connectRoads } from './road-connections';
import type { RoadConnectionsInput } from './road-connections';
import type { Tile } from '../../core/geometry/local-grid';
export interface WeightedDestination { id: string; position: Tile; weight: number }
export interface RouteCostInput extends Omit<RoadConnectionsInput, 'targets' | 'buildable'> {
  targets: readonly WeightedDestination[];
}
/** Measure independent journeys on one fixed final network, never discount earlier measured paths. */
export function measureRouteCost(input: RouteCostInput) {
  const routes: { id: string; cost: number; weight: number; contribution: number; steps: number }[] = [];
  const ids = new Set<string>();
  for (const target of input.targets) {
    if (!target.id || ids.has(target.id) || !Number.isFinite(target.weight) || target.weight < 0) {
      throw new Error('Invalid route measurement target');
    }
    ids.add(target.id);
    const result = connectRoads({ ...input, targets: [target], buildable: () => true,
      search: (start, goal) => input.search(start, goal, input.roads) });
    if (!result.ok) return result;
    const route = result.connections[0]!;
    const contribution = route.cost * target.weight;
    if (!Number.isFinite(contribution)) throw new Error('Route measurement overflow');
    routes.push({ ...route, weight: target.weight, contribution });
  }
  const total = routes.reduce((sum, route) => sum + route.contribution, 0);
  if (!Number.isFinite(total)) throw new Error('Route measurement overflow');
  return { ok: true as const, total, routes };
}
