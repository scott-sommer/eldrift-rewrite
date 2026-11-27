import { advanceTransitFrame } from '../../../movement/transit/frame';
import type { TransitFramePorts } from '../../../movement/transit/frame';
import { initialTransitState } from '../../../movement/transit/plan';
import { withinRange } from '../../../movement/path-model';
import type { Occupant } from '../../../movement/traffic/model';
import type { TransitPlan } from '../../../movement/transit/model';
import type { StartupCourierState } from '../delivery-model';
import type { StartupCourierRoutes, StartupCourierTrip } from './model';
import { validateCourierTrips } from './validation';
/** Motion gates existing collection/settlement; the caller retains the single accounting owner. */
export function advanceStartupCourierTrips(routes: readonly StartupCourierRoutes[],previous: readonly StartupCourierTrip[],workers: readonly StartupCourierState[],tick: number,occupants: readonly Occupant[],ports: TransitFramePorts,service: (ready: (worker: StartupCourierState,tick: number) => boolean) => void): StartupCourierTrip[] {
  validateCourierTrips(routes,previous,workers,tick);
  const active = workers.filter(worker => tick >= routeOf(routes,worker.request).activeAt && tick < worker.expiresAt);
  const trips = active.map(worker => previous.find(trip => trip.request === worker.request) ?? opening(routeOf(routes,worker.request)));
  const plans = trips.map((trip,index) => planOf(routeOf(routes,trip.request),trip,active[index]!));
  const moved = advanceTransitFrame(plans,trips.map(trip => trip.transit),tick,occupants,ports);
  const next = trips.map((trip,index) => ({ ...trip,transit: moved.states[index]! }));
  const cargo = active.map(worker => worker.cargo);
  service((worker,frame) => {
    if (frame !== tick) throw new Error('Courier service clock mismatch');
    const trip = next.find(item => item.request === worker.request);
    return !!trip && frame >= trip.serviceAt && trip.transit.arrivedAt !== undefined && frame >= trip.transit.arrivedAt;
  });
  return next.map((trip,index) => transition(routeOf(routes,trip.request),trip,active[index]!,tick,cargo[index]!));
}
function routeOf(routes: readonly StartupCourierRoutes[],request: string): StartupCourierRoutes { return routes.find(route => route.request === request)!; }
function opening(route: StartupCourierRoutes): StartupCourierTrip {
  if (route.opening) {
    const value = route.opening;
    return { request: route.request,phase: value.phase,leg: 'opening',serviceAt: value.readyAt,transit: initialTransitState(value.plan,value.readyAt,value.fatigue) };
  }
  return { request: route.request,phase: 'collect',leg: 'approach',serviceAt: route.activeAt,transit: initialTransitState(route.approach,route.activeAt) };
}
function planOf(route: StartupCourierRoutes,trip: StartupCourierTrip,worker: StartupCourierState): TransitPlan {
  return { ...startupCourierTripPlan(route,trip),weight: worker.phase === 'deliver' ? Math.ceil(worker.cargo/50) : 0 };
}
function transition(route: StartupCourierRoutes,trip: StartupCourierTrip,worker: StartupCourierState,tick: number,beforeCargo: number): StartupCourierTrip {
  if (trip.phase === worker.phase) return afterService(trip,worker,tick,beforeCargo);
  const leg = worker.phase === 'deliver' ? 'loaded' : 'empty',plan = route[leg];
  if (!withinRange(trip.transit.position,plan.origin,0)) throw new Error('Courier trip transition origin mismatch');
  const delay = worker.phase === 'deliver' ? worker.collectionTicks : worker.deliveryTicks+(worker.turnaroundTicks ?? 0);
  const readyAt = tick+delay;
  return { request: trip.request,phase: worker.phase,leg,serviceAt: readyAt,
    transit: { ...initialTransitState(plan,readyAt,trip.transit.fatigue),lastAt: tick } };
}

export function startupCourierTripPlan(route: StartupCourierRoutes,trip: StartupCourierTrip): TransitPlan {
  const plan = trip.leg === 'opening' ? route.opening?.plan : route[trip.leg];
  if (!plan) throw new Error('Missing courier opening route');
  return plan;
}

function afterService(trip: StartupCourierTrip,worker: StartupCourierState,tick: number,beforeCargo: number): StartupCourierTrip {
  const transferred = worker.phase === 'deliver' && worker.cargo < beforeCargo;
  return { ...trip,serviceAt: transferred ? Math.max(trip.serviceAt,tick+worker.deliveryTicks) : trip.serviceAt };
}
