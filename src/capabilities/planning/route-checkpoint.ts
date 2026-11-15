import { framedIdentity } from '../../core/framed-identity';
import type { MeasuredRoute, RouteCostInput } from './route-cost';
export interface RouteCheckpoint { version: 1; signature: string; routes: MeasuredRoute[] }
export function routeCheckpoint(input: RouteCostInput, networkRevision: string, previous?: RouteCheckpoint): RouteCheckpoint {
  if (!networkRevision) throw new Error('Missing route network revision');
  const ids = input.targets.map(target => target.id);
  if (ids.some(id => !id) || new Set(ids).size !== ids.length) throw new Error('Invalid route target identities');
  const signature = framedIdentity(['route-checkpoint-v2', networkRevision, JSON.stringify([input.start, input.roads, input.targets])]);
  if (!previous) return { version: 1, signature, routes: [] };
  if (previous.version !== 1 || previous.signature !== signature) throw new Error('Stale route checkpoint');
  if (!Array.isArray(previous.routes) || previous.routes.length > input.targets.length) throw new Error('Invalid route checkpoint');
  previous.routes.forEach((route, index) => validateRoute(route, input.targets[index]!));
  return { version: 1, signature, routes: previous.routes.map(route => ({ ...route })) };
}
function validateRoute(route: MeasuredRoute, target: RouteCostInput['targets'][number]): void {
  if (route.id !== target.id || route.weight !== target.weight) throw new Error('Invalid route checkpoint target');
  if (![route.cost, route.weight, route.contribution].every(value => Number.isFinite(value) && value >= 0)) {
    throw new Error('Invalid route checkpoint cost');
  }
  if (route.contribution !== route.cost * route.weight || !Number.isSafeInteger(route.steps) || route.steps < 0) {
    throw new Error('Invalid route checkpoint measurement');
  }
}
