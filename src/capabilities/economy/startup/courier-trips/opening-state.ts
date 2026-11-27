import type { StartupCourierRoutes,StartupCourierTrip } from './model';
import type { StartupCourierState } from '../delivery-model';
export function validateOpeningProgress(route: StartupCourierRoutes,trip: StartupCourierTrip,worker: StartupCourierState,tick: number): void {
  if (trip.leg !== 'opening') return;
  const seed = route.opening;
  if (!seed) throw new Error('Missing courier opening state');
  validateSeed(seed,trip,worker);
  const firstMove = Math.max(seed.readyAt,route.activeAt+Math.ceil(seed.fatigue/seed.plan.recovery));
  if (trip.transit.index > Math.max(0,tick-firstMove)) throw new Error('Invalid courier opening progress');
  validateArrival(seed,trip,firstMove);
}
function validateSeed(seed: NonNullable<StartupCourierRoutes['opening']>,trip: StartupCourierTrip,worker: StartupCourierState): void {
  if (seed.phase !== trip.phase || seed.readyAt !== trip.transit.readyAt || trip.serviceAt < seed.readyAt || worker.cargo > seed.cargo) throw new Error('Invalid courier opening state');
}
function validateArrival(seed: NonNullable<StartupCourierRoutes['opening']>,trip: StartupCourierTrip,firstMove: number): void {
  if (trip.transit.arrivedAt !== undefined && seed.plan.path.length > 0 && trip.transit.arrivedAt < firstMove+seed.plan.path.length) throw new Error('Invalid courier opening arrival');
}
