export interface RoutePolicy {
  version: string;
  blockedRooms: readonly string[];
  costs: Readonly<Record<string, number>>;
  maximumRooms: number;
  allowedRooms?: readonly string[];
}
export type RoomRoute = { status: 'complete'; rooms: string[]; policyVersion: string }
  | { status: 'unavailable'; reason: 'destination-excluded' | 'no-route' | 'room-limit' };
export type RouteFinder = (origin: string, destination: string, cost: (room: string) => number) => readonly string[] | null;
function validate(policy: Readonly<RoutePolicy>): void {
  if (!policy.version || !Number.isSafeInteger(policy.maximumRooms) || policy.maximumRooms < 1 || policy.maximumRooms > 64) throw new Error('Invalid route policy');
  validateCorridor(policy.allowedRooms);
  if (policy.blockedRooms.some(room => !room)) throw new Error('Invalid excluded room');
  if (Object.entries(policy.costs).some(([room, cost]) => !room || !Number.isFinite(cost) || cost < 1)) throw new Error('Invalid room route cost');
}
/** RouteFinder returns rooms after origin, including destination; null means no route. */
export function createRoomRouter(find: RouteFinder) {
  return (origin: string, destination: string, policy: Readonly<RoutePolicy>): RoomRoute => {
    validate(policy);
    if (!origin || !destination) throw new Error('Missing route endpoint');
    const blocked = new Set(policy.blockedRooms);
    const allowed = policy.allowedRooms === undefined ? undefined : new Set(policy.allowedRooms);
    const excluded = (room: string) => blocked.has(room) || allowed !== undefined && !allowed.has(room);
    if (excluded(destination)) return { status: 'unavailable', reason: 'destination-excluded' };
    if (origin === destination) return { status: 'complete', rooms: [origin], policyVersion: policy.version };
    const cost = (room: string) => excluded(room) ? Infinity : Object.hasOwn(policy.costs, room) ? policy.costs[room]! : 1;
    const route = find(origin, destination, cost);
    if (!route) return { status: 'unavailable', reason: 'no-route' };
    if (route.at(-1) !== destination || route.some(excluded)) throw new Error('Route finder violated room policy');
    const rooms = [origin, ...route];
    if (rooms.length > policy.maximumRooms) return { status: 'unavailable', reason: 'room-limit' };
    return { status: 'complete', rooms, policyVersion: policy.version };
  };
}

function validateCorridor(rooms: readonly string[] | undefined): void {
  if (rooms === undefined) return;
  if (rooms.length > 64 || rooms.some(room => typeof room !== 'string' || !room) || new Set(rooms).size !== rooms.length) {
    throw new Error('Invalid allowed room corridor');
  }
}
