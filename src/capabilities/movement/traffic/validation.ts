import type { Occupant, TrafficRequest } from './model';
import { tileKey, trafficTargets } from './model';
export function trafficOccupancy(occupants: readonly Occupant[]): Map<string, string> {
  const occupied = new Map<string, string>();
  const units = new Set<string>();
  for (const occupant of occupants) {
    const tile = tileKey(occupant.position);
    if (!occupant.unit || units.has(occupant.unit) || occupied.has(tile)) throw new Error('Ambiguous traffic occupancy');
    units.add(occupant.unit);
    occupied.set(tile, occupant.unit);
  }
  return occupied;
}
function validateRequest(request: TrafficRequest, units: Set<string>, occupied: ReadonlyMap<string, string>): void {
  if (!request.unit || !request.owner || !Number.isFinite(request.priority) || units.has(request.unit)) throw new Error('Invalid or duplicate traffic owner');
  if (request.group !== undefined && !request.group) throw new Error('Empty traffic group');
  if (occupied.get(tileKey(request.from)) !== request.unit) throw new Error('Traffic origin does not match observation');
  trafficTargets(request);
  units.add(request.unit);
}
export function validateRequests(requests: readonly TrafficRequest[], occupied: ReadonlyMap<string, string>, maximum: number): void {
  if (!Number.isSafeInteger(maximum) || maximum < 1 || requests.length > maximum) throw new Error('Traffic request limit exceeded');
  const units = new Set<string>();
  for (const request of requests) validateRequest(request, units, occupied);
}

