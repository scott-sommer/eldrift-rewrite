import { advanceStartupCourierTrips } from './frame';
import type { StartupCourierRoutes,StartupCourierTrip } from './model';
import type { StartupCourierState } from '../delivery-model';
import type { Occupant } from '../../../movement/traffic/model';
import type { TransitFramePorts } from '../../../movement/transit/frame';
export interface StartupCourierGroup {
  source: string;
  routes: readonly StartupCourierRoutes[];
  previous: readonly StartupCourierTrip[];
  workers: readonly StartupCourierState[];
  service: (worker: StartupCourierState,ready: (worker: StartupCourierState,tick: number) => boolean) => void;
}
/** One shared movement frame; source owners retain stock and receipts, and share their actual sink owner. */
export function advanceStartupCourierGroups(groups: readonly StartupCourierGroup[],tick: number,occupants: readonly Occupant[],ports: TransitFramePorts) {
  validateGroups(groups);
  const orders = new Map(groups.flatMap(group => group.routes.map(route => [route.request,route.approach.order ?? route.request] as const)));
  const workers = groups.flatMap(group => group.workers).sort((a,b) => compareName(orders.get(a.request)!,orders.get(b.request)!) || compareName(a.request,b.request));
  const owners = new Map(groups.flatMap(group => group.workers.map(worker => [worker.request,group] as const)));
  const trips = advanceStartupCourierTrips(groups.flatMap(group => group.routes),groups.flatMap(group => group.previous),workers,tick,occupants,ports,ready => {
    for (const worker of workers) owners.get(worker.request)!.service(worker,ready);
  });
  return groups.map(group => ({ source: group.source,trips: trips.filter(trip => owners.get(trip.request) === group) }));
}
function validateGroups(groups: readonly StartupCourierGroup[]): void {
  if (groups.length > 8 || groups.some(group => !group.source) || new Set(groups.map(group => group.source)).size !== groups.length) throw new Error('Invalid courier source groups');
  const workers = groups.flatMap(group => group.workers);
  if (workers.length > 16 || new Set(workers.map(worker => worker.request)).size !== workers.length) throw new Error('Duplicate or excessive grouped courier workers');
  for (const group of groups) {
    const names = new Set(group.workers.map(worker => worker.request));
    if (group.routes.some(route => !names.has(route.request)) || group.previous.some(trip => !names.has(trip.request))) throw new Error('Courier source ownership mismatch');
    if (group.workers.some(worker => !group.routes.some(route => route.request === worker.request))) throw new Error('Missing courier route');
  }
}

function compareName(a: string,b: string): number { return a < b ? -1 : a > b ? 1 : 0; }
