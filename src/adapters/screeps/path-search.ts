import { repairBorderPath } from './path-border';
import { nativePathGoals } from './path-goals';
import type { PathProfile, PathSearch } from '../../capabilities/movement/path-model';
import { movementArrived } from '../../capabilities/movement/step';
import { pathKey } from '../../capabilities/movement/path-key';
type Matrices = (room: string, profile: Readonly<PathProfile>) => CostMatrix | false | undefined;
export function createNativePathSearch(matrix: Matrices): PathSearch {
  return request => {
    pathKey(request);
    const allowed = request.allowedRooms === undefined ? undefined : new Set(request.allowedRooms);
    if (allowed && (!allowed.has(request.origin.room) || !allowed.has(request.destination.room))) return { status: 'no-route', reason: 'room-policy' };
    const { origin, destination, range, profile } = request;
    const search = (start: typeof origin, maximumOps: number) => PathFinder.search(new RoomPosition(start.x, start.y, start.room), nativePathGoals(destination, range), {
      plainCost: profile.plainCost, swampCost: profile.swampCost,
      maxOps: maximumOps, maxRooms: roomBudget(profile.maxRooms, allowed),
      roomCallback: room => allowed && !allowed.has(room) ? false : matrix(room, profile) ?? true,
    });
    const initial = search(origin,profile.maxOps), result = repairBorderPath(request,matrix,initial,search);
    const path = result.path.map(position => ({ room: position.roomName, x: position.x, y: position.y }));
    const end = path.at(-1) ?? origin;
    const complete = !result.incomplete && movementArrived({ position: end, destination, range });
    return { status: complete ? 'complete' : 'incomplete', path, cost: result.cost, operations: result.ops };
  };
}

function roomBudget(maximum: number, allowed: ReadonlySet<string> | undefined): number {
  return Math.min(maximum, allowed?.size ?? maximum);
}
