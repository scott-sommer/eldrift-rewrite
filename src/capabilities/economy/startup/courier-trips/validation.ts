import { withinRange } from '../../../movement/path-model';
import type { StartupCourierState } from '../delivery-model';
import type { StartupCourierRoutes, StartupCourierTrip } from './model';
export function validateCourierTrips(routes: readonly StartupCourierRoutes[],previous: readonly StartupCourierTrip[],workers: readonly StartupCourierState[],tick: number): void {
  if (routes.length > 16 || new Set(routes.map(route => route.request)).size !== routes.length) throw new Error('Invalid courier route roster');
  if (new Set(previous.map(trip => trip.request)).size !== previous.length) throw new Error('Duplicate courier trip');
  for (const worker of workers) {
    const route = routes.find(route => route.request === worker.request);
    if (!route) throw new Error('Missing courier route');
    validateCourierRoute(route);
    if (tick >= route.activeAt && tick < worker.expiresAt && !previous.some(trip => trip.request === worker.request)) validateOpening(worker,route,tick);
  }
  for (const trip of previous) validateTrip(trip,workers,tick);
}
export function validateCourierRoute(route: StartupCourierRoutes): void {
  if (!Number.isSafeInteger(route.activeAt) || route.activeAt < 0) throw new Error('Invalid courier route clock');
  for (const plan of [route.approach,route.empty,route.loaded]) {
    if (plan.unit !== route.request || plan.path.length === 0) throw new Error('Invalid courier route identity');
  }
  const collection = route.loaded.origin,deposit = route.empty.origin;
  if (!withinRange(route.approach.path.at(-1)!,collection,0) || !withinRange(route.empty.path.at(-1)!,collection,0) || !withinRange(route.loaded.path.at(-1)!,deposit,0)) throw new Error('Courier route endpoints mismatch');
}
function validateTrip(trip: StartupCourierTrip,workers: readonly StartupCourierState[],tick: number): void {
  const worker = workers.find(worker => worker.request === trip.request);
  if (!worker || worker.phase !== trip.phase || trip.transit.unit !== trip.request) throw new Error('Courier trip ownership mismatch');
  if (!['approach','empty','loaded'].includes(trip.leg) || !Number.isSafeInteger(trip.serviceAt) || trip.serviceAt < 0) throw new Error('Invalid courier trip state');
  if ((trip.leg === 'loaded') !== (trip.phase === 'deliver')) throw new Error('Courier trip phase mismatch');
  if (trip.transit.lastAt !== tick-1) throw new Error('Nonconsecutive courier trip frame');
}

function validateOpening(worker: StartupCourierState,route: StartupCourierRoutes,tick: number): void {
  if (tick !== route.activeAt || worker.phase !== 'collect' || worker.cargo !== 0) throw new Error('Missing courier opening history');
}
