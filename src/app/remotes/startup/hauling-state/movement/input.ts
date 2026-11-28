import { copyPlain } from '../../../../../core/plain-data';
import { withinRange } from '../../../../../capabilities/movement/path-model';
import { paidCourierRoutePlan,observePaidCourierRoute } from '../../../../../features/remotes/startup/routes/progress';
import { validPaidCourierRouteRecord } from '../../../../../features/remotes/startup/routes/validation';
import type { PaidCourierActiveRoute,PaidCourierRouteObservation } from '../../../../../features/remotes/startup/routes/model';
import type { TransitState } from '../../../../../capabilities/movement/transit/model';
export function seedPaidMovement(home: string, tick: number, routes: readonly PaidCourierActiveRoute[],historical: ReadonlySet<string> = new Set()) {
  if (!validPaidCourierRouteRecord({ home,revision: 0,clock: tick,routes },home)
    || routes.some(route => route.observedAt !== tick && !historical.has(route.program.name)) || new Set(routes.map(route => route.program.unit)).size !== routes.length) throw new Error('Invalid paid movement seed');
  return new Map(copyPlain([...routes]).map(route => [route.program.name,route]));
}
export function observePaidMovement(routes: ReadonlyMap<string,PaidCourierActiveRoute>, observations: readonly PaidCourierRouteObservation[], tick: number, expected: ReadonlyMap<string,TransitState>) {
  if (observations.length !== routes.size || new Set(observations.map(value => value.name)).size !== observations.length) throw new Error('Invalid paid movement roster');
  return new Map(observations.map(value => {
    const route = routes.get(value.name); if (!route || value.tick !== tick) throw new Error('Invalid paid movement observation');
    const predicted = expected.get(value.unit);
    if (predicted && (!withinRange(predicted.position,value.position,0) || predicted.fatigue !== value.fatigue)) throw new Error('Paid movement physical deviation');
    return [value.name,observePaidCourierRoute(route,value)] as const;
  }));
}
export function paidMovementTransit(route: PaidCourierActiveRoute, owner: string) {
  const original = paidCourierRoutePlan(route), cursor = route.cursor!;
  const plan = { ...original,unit: route.program.unit,order: route.program.name,owner,weight: Math.ceil(route.energy/50) };
  const state: TransitState = { unit: plan.unit,position: { ...cursor.position },index: cursor.index,fatigue: route.fatigue,readyAt: route.readyAt,
    ...(cursor.index === plan.path.length ? { arrivedAt: Math.max(route.readyAt,route.observedAt) } : {}) };
  return { plan,state };
}
