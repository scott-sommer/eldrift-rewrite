import { measureRouteCost } from './route-cost';
import type { RouteCostInput } from './route-cost';
import { routeCheckpoint } from './route-checkpoint';
import type { RouteCheckpoint } from './route-checkpoint';
/** Caller revision identifies final costs, walkability, search settings and algorithm version. */
export function measureRouteBatch(
  input: RouteCostInput, networkRevision: string, previous: RouteCheckpoint | undefined,
  maximumSearches: number, canContinue: () => boolean = () => true,
) {
  if (!Number.isSafeInteger(maximumSearches) || maximumSearches < 0) throw new Error('Invalid route batch budget');
  const checkpoint = routeCheckpoint(input, networkRevision, previous);
  let searches = 0;
  while (checkpoint.routes.length < input.targets.length && searches < maximumSearches && canContinue()) {
    const target = input.targets[checkpoint.routes.length]!;
    const result = measureRouteCost({ ...input, targets: [target] });
    searches++;
    if (!result.ok) return { ...result, checkpoint, searches };
    checkpoint.routes.push(result.routes[0]!);
  }
  const total = checkpoint.routes.reduce((sum, route) => sum + route.contribution, 0);
  if (!Number.isFinite(total)) throw new Error('Route measurement overflow');
  const done = checkpoint.routes.length === input.targets.length;
  return { ok: true as const, checkpoint, searches, done, ...(done ? { total } : {}) };
}
