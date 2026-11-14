import type { PathRequest, PathProfile } from './path-model';
import type { Position } from './step';
function integer(value: number, minimum: number, maximum = Number.MAX_SAFE_INTEGER): boolean {
  return Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}
function position(value: Position): boolean {
  return value.room.length > 0 && integer(value.x, 0, 49) && integer(value.y, 0, 49);
}
function validateEndpoints(request: Readonly<PathRequest>): void {
  if (!position(request.origin) || !position(request.destination) || !integer(request.range, 0, 49)) throw new Error('Invalid path endpoints');
  if (!request.profile.id || !request.topologyVersion || !request.policyVersion) throw new Error('Missing path identity/version');
}
function validateProfile(profile: Readonly<PathProfile>): void {
  if (!integer(profile.plainCost, 1, 254) || !integer(profile.swampCost, 1, 254)) throw new Error('Invalid terrain costs');
  if (!integer(profile.maxOps, 1) || !integer(profile.maxRooms, 1, 64)) throw new Error('Invalid search limits');
}
export function pathKey(request: Readonly<PathRequest>): string {
  validateEndpoints(request);
  validateProfile(request.profile);
  const p = request.profile;
  const rooms = request.allowedRooms === undefined ? null : [...new Set(request.allowedRooms)].sort();
  if (rooms?.some(room => !room)) throw new Error('Invalid room policy');
  return JSON.stringify([
    request.origin.room, request.origin.x, request.origin.y,
    request.destination.room, request.destination.x, request.destination.y, request.range,
    p.id, p.plainCost, p.swampCost, p.maxOps, p.maxRooms,
    request.topologyVersion, request.policyVersion, rooms,
  ]);
}
