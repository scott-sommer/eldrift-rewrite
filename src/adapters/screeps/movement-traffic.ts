import type { TrafficRequest, Occupant } from '../../capabilities/movement/traffic/model';
import { tileKey } from '../../capabilities/movement/traffic/model';
import { movementTransition, stepDirection } from '../../capabilities/movement/transition';
import type { Position } from '../../capabilities/movement/step';
import type { createMatrixSnapshots } from './matrix-snapshots';
export const movementPosition = (pos: RoomPosition): Position => ({ room: pos.roomName, x: pos.x, y: pos.y });
export function movementOccupants(): Occupant[] {
  return Object.values(Game.rooms).flatMap(room =>
    [...room.find(FIND_CREEPS), ...room.find(FIND_POWER_CREEPS)].map(unit => ({ unit: unit.id, position: movementPosition(unit.pos) })));
}
export function createMovementLegality(snapshots: ReturnType<typeof createMatrixSnapshots>) {
  function passable(position: Position): boolean {
    const matrix = snapshots.prepare([position.room], { roadCost: 1, avoidUnits: false }).matrix(position.room);
    const cost = matrix?.get(position.x, position.y) ?? 0;
    if (cost === 255) return false;
    return cost > 0 || (Game.map.getRoomTerrain(position.room).get(position.x, position.y) & TERRAIN_MASK_WALL) === 0;
  }
  return (request: TrafficRequest): boolean => {
    const direction = stepDirection(request.from, request.via ?? request.to);
    const transition = movementTransition(request.from, direction);
    if (!transition || tileKey(transition.landing) !== tileKey(request.to)) return false;
    if (!validTransit(request, transition.local)) return false;
    if (!connected(request.from.room, request.to.room)) return false;
    return passable(transition.local) && passable(transition.landing);
  };
}

function validTransit(request: TrafficRequest, local: Position): boolean {
  return request.via === undefined || tileKey(local) === tileKey(request.via);
}
function connected(origin: string, destination: string): boolean {
  return origin === destination || Object.values(Game.map.describeExits(origin) ?? {}).includes(destination);
}
