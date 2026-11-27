import { validWorldPosition } from '../../../../core/geometry/world-position';
import { copyPlain } from '../../../../core/plain-data';
import { integer,keys,record,requireCheckpoint } from '../checkpoints/validation';
import type { StartupCourierState } from '../delivery-model';
import type { StartupCourierRoutes } from './model';
import type { StartupCourierTrip } from './model';
export function readMotionTrips(saved: unknown,workers: readonly StartupCourierState[],routes: readonly StartupCourierRoutes[],tick: number): StartupCourierTrip[] {
  requireCheckpoint(record(saved) && keys(saved,['trips']) && Array.isArray(saved.trips));
  const trips = (saved as { trips: unknown[] }).trips;
  const expected = workers.filter(worker => active(worker,routes,tick));
  requireCheckpoint(trips.length === expected.length && trips.every(validTrip));
  requireCheckpoint(trips.every(trip => expected.some(worker => worker.request === (trip as StartupCourierTrip).request)));
  return copyPlain(trips) as StartupCourierTrip[];
}
function active(worker: StartupCourierState,routes: readonly StartupCourierRoutes[],tick: number): boolean {
  const route = routes.find(route => route.request === worker.request);
  return !!route && route.activeAt < tick && tick <= worker.expiresAt;
}
function validTrip(value: unknown): boolean {
  if (!record(value) || !keys(value,['request','phase','leg','serviceAt','transit'])) return false;
  if (typeof value.request !== 'string' || !integer(value.serviceAt)) return false;
  return validState(value.transit);
}
function validState(state: unknown): boolean {
  if (!record(state)) return false;
  const fields = ['unit','position','index','fatigue','readyAt','lastAt',...(state.arrivedAt === undefined ? [] : ['arrivedAt'])];
  if (!keys(state,fields) || typeof state.unit !== 'string' || !validWorldPosition(state.position)) return false;
  return ['index','fatigue','readyAt','lastAt'].every(key => integer(state[key])) && (state.arrivedAt === undefined || integer(state.arrivedAt));
}
