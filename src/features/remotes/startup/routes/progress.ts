import { copyPlain } from '../../../../core/plain-data';
import { withinRange } from '../../../../capabilities/movement/path-model';
import { observeTransitCursor,requestTransitCursor } from '../../../../capabilities/movement/transit/observed';
import type { PaidCourierActiveRoute,PaidCourierRouteProgram,PaidCourierRouteObservation } from './model';
export function paidCourierRoutePlan(route: PaidCourierActiveRoute) { return route.leg === 'opening' ? route.program.opening.plan : route.program[route.leg]; }
export function activatePaidCourierRoute(program: PaidCourierRouteProgram): PaidCourierActiveRoute {
  const seed = program.opening;
  return copyPlain({ program,observedAt: program.activatedAt,leg: 'opening',phase: seed.phase,readyAt: seed.readyAt,energy: seed.energy,fatigue: seed.fatigue,
    cursor: seed.spawning ? null : { index: 0,observedAt: program.activatedAt,position: seed.plan.origin,requestedAt: null } });
}
export function observePaidCourierRoute(input: PaidCourierActiveRoute,observation: PaidCourierRouteObservation): PaidCourierActiveRoute {
  const route = copyPlain(input),plan = paidCourierRoutePlan(route);
  validateObservation(route,observation); route.observedAt = observation.tick;
  if (observation.phase === 'spawning') {
    if (route.cursor || observation.tick >= route.program.activeAt) throw new Error('Route spawn phase');
    return route;
  }
  if (observation.tick < route.program.activeAt) throw new Error('Route active clock');
  const previous = route.cursor ?? { index: 0,observedAt: observation.tick,position: plan.origin,requestedAt: null };
  route.cursor = observeTransitCursor(plan,previous,observation.tick,observation.position);
  observeCargo(route,observation);
  route.readyAt = Math.max(route.readyAt,observation.readyAt); route.energy = observation.energy; route.fatigue = observation.fatigue;
  return route;
}
export function requestPaidCourierRoute(route: PaidCourierActiveRoute,tick: number): PaidCourierActiveRoute {
  if (!route.cursor || tick < route.readyAt || tick >= route.program.retireAt) throw new Error('Route request unavailable');
  return { ...copyPlain(route),cursor: requestTransitCursor(paidCourierRoutePlan(route),route.cursor,tick) };
}
function transition(route: PaidCourierActiveRoute,observation: PaidCourierRouteObservation): void {
  const plan = paidCourierRoutePlan(route),leg = observation.phase === 'deliver' ? 'loaded' : 'empty',next = route.program[leg];
  if (route.cursor!.index !== plan.path.length || !withinRange(observation.position,next.origin,0)) throw new Error('Route service transition');
  route.phase = observation.phase as 'collect' | 'deliver'; route.leg = leg; route.readyAt = observation.readyAt;
  route.cursor = { index: 0,observedAt: observation.tick,position: { ...observation.position },requestedAt: null };
}
function validateObservation(route: PaidCourierActiveRoute,value: PaidCourierRouteObservation): void {
  if (!validObservationIdentity(route,value)) throw new Error('Route observation identity');
  if (![value.tick,value.readyAt,value.energy,value.fatigue].every(Number.isSafeInteger) || value.readyAt < value.tick || value.energy < 0 || value.fatigue < 0) throw new Error('Route observation clock/cargo');
  if ((value.phase === 'deliver') !== (value.energy > 0)) throw new Error('Route observation phase/cargo');
}

function observeCargo(route: PaidCourierActiveRoute,observation: PaidCourierRouteObservation): void {
  if (observation.phase !== route.phase) { transition(route,observation); return; }
  if (observation.energy !== route.energy && (observation.energy > route.energy || route.cursor!.index !== paidCourierRoutePlan(route).path.length)) throw new Error('Route cargo deviation');
}

function validObservationIdentity(route: PaidCourierActiveRoute,value: PaidCourierRouteObservation): boolean {
  return value.name === route.program.name && value.unit === route.program.unit && value.tick >= route.program.activatedAt && value.tick >= route.observedAt && value.tick < route.program.retireAt;
}
