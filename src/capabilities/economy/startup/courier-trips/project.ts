import { projectCourierRoute } from './project-route';
import { copyPlain } from '../../../../core/plain-data';
import { advanceStartupCourierTrips,startupCourierTripPlan } from './frame';
import { validateCourierTrips } from './validation';
import { validateTransitFrame } from '../../../movement/transit/validation';
import { tileKey } from '../../../movement/traffic/model';
import { prepareStartupProjectMotion } from './project-input';
import { readMotionTrips } from './project-checkpoint';
import type { StartupDeliveryInput,StartupCourierState } from '../delivery-model';
import type { StartupScheduledBirth } from '../spawn-model';
import type { StartupCourierRoutes,StartupCourierTrip } from './model';
import type { StartupProjectMotionCheckpoint } from './project-model';
export function createStartupProjectMotion(input: StartupDeliveryInput,saved?: unknown,workers: readonly StartupCourierState[] = [],births: readonly StartupScheduledBirth[] = [],tick = 0) {
  const motion = prepareStartupProjectMotion(input),terrain = new Map(motion.terrain.map(fact => [tileKey(fact.position),fact.rate]));
  const ports = { legal: (request: { to: Parameters<typeof tileKey>[0]; via?: Parameters<typeof tileKey>[0] }) => terrain.has(tileKey(request.to)) && terrain.has(tileKey(request.via ?? request.to)),
    terrain(position: Parameters<typeof tileKey>[0]) { const rate = terrain.get(tileKey(position)); if (rate === undefined) throw new Error('Missing physical courier terrain'); return rate; } };
  function routesOf(births: readonly StartupScheduledBirth[]): StartupCourierRoutes[] {
    return motion.routes.flatMap(route => projectCourierRoute(input,route,motion.openings,births));
  }
  let trips: StartupCourierTrip[] = [];
  if (saved !== undefined) {
    trips = readMotionTrips(saved,workers,routesOf(births),tick);
    const routes = routesOf(births);
    validateCourierTrips(routes,trips,workers,tick);
    const plans = trips.map(trip => startupCourierTripPlan(routes.find(route => route.request === trip.request)!,trip));
    validateTransitFrame(plans,trips.map(trip => trip.transit),tick);
  }
  return {
    advance(workers: readonly StartupCourierState[],births: readonly StartupScheduledBirth[],tick: number,service: (ready: (worker: StartupCourierState,tick: number) => boolean) => void): void {
      const occupants = motion.blockers.filter(blocker => blocker.startAt <= tick && tick < blocker.endAt).map(blocker => ({ unit: blocker.unit,position: blocker.position }));
      trips = advanceStartupCourierTrips(routesOf(births),trips,workers,tick,occupants,ports,service);
    },
    checkpoint(): StartupProjectMotionCheckpoint { return copyPlain({ trips }); },
  };
}
