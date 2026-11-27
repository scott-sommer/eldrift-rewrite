import { withinRange } from '../../../../capabilities/movement/path-model';
import { paidCourierRoutePlan } from '../../../../features/remotes/startup/routes/progress';
import { paidRouteContextMatches } from './program';
import type { MovementCommand } from '../../../../adapters/screeps/movement-service';
import type { PaidCourierActiveRoute } from '../../../../features/remotes/startup/routes/model';
import type { PaidUnitContext } from '../motion-observation/model';
export function paidRouteFollow(route: PaidCourierActiveRoute,context: PaidUnitContext,creep: Creep,command: MovementCommand) {
  if (!validIdentity(route,context,creep)) return { status: 'blocked' as const,reason: 'route-follow-identity' };
  if (!validObservation(route,creep)) return { status: 'blocked' as const,reason: 'route-follow-observation' };
  const plan = paidCourierRoutePlan(route);
  if (command.range !== 0 || !withinRange(plan.path.at(-1) ?? plan.origin,command.destination,0)) return { status: 'blocked' as const,reason: 'route-follow-service' };
  return { status: 'ready' as const,plan,index: route.cursor!.index };
}
function validIdentity(route: PaidCourierActiveRoute,context: PaidUnitContext,creep: Creep): boolean {
  return paidRouteContextMatches(route.program,context) && route.program.unit === creep.id && route.program.name === creep.name;
}
function validObservation(route: PaidCourierActiveRoute,creep: Creep): boolean {
  if (!route.cursor || route.observedAt !== Game.time) return false;
  return route.cursor.observedAt === Game.time && route.cursor.requestedAt === null && route.energy === creep.store.energy && route.fatigue === creep.fatigue
    && Game.time >= route.readyAt && Game.time < route.program.retireAt;
}
