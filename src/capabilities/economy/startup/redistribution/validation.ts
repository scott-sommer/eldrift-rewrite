import type { StartupRedistributionInput, StartupRedistributionTrip } from './model';
export function natural(value: unknown): value is number { return Number.isSafeInteger(value) && Number(value) >= 0; }
function text(value: unknown): value is string { return typeof value === 'string' && value.length > 0 && value.length <= 240; }
export function redistributionIdentity(input: StartupRedistributionInput): string {
  return JSON.stringify([input.horizon,input.trips.map(trip => [trip.id,trip.request,trip.pickupAt,trip.loadedTicks,trip.returnTicks,trip.energy,...(trip.destination === undefined ? [] : [trip.destination])])]);
}
export function validateRedistribution(input: StartupRedistributionInput): void {
  if (!natural(input.horizon) || input.horizon > 10000 || input.trips.length > 64) throw new Error('Invalid redistribution limits');
  if (new Set(input.trips.map(trip => trip.id)).size !== input.trips.length || new Set(input.trips.map(trip => trip.request)).size > 16) throw new Error('Invalid redistribution identities');
  input.trips.forEach(trip => validateTrip(trip,input.horizon));
}
function validateTrip(trip: StartupRedistributionTrip, horizon: number): void {
  if (!text(trip.id) || !text(trip.request) || ![trip.pickupAt,trip.loadedTicks,trip.returnTicks,trip.energy].every(natural)) throw new Error('Invalid redistribution trip');
  if (trip.destination !== undefined && !text(trip.destination)) throw new Error('Invalid redistribution destination');
  if (!validService(trip,horizon)) throw new Error('Invalid redistribution service');
}
function validService(trip: StartupRedistributionTrip, horizon: number): boolean {
  return trip.pickupAt <= horizon && trip.loadedTicks <= 1500 && trip.returnTicks <= 1500 && trip.energy >= 1 && trip.energy <= 2500;
}
