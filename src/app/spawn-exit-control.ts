import { pendingSpawnExits, samePoint } from '../adapters/screeps/spawn-exits';
import { canStandAt } from '../adapters/screeps/service-position';
import type { Position } from '../capabilities/movement/step';
import type { createActionArbiter } from '../core/execution/action-arbiter';
import type { createMovementService } from '../adapters/screeps/movement-service';
/** Before role execution, clear movable owned blockers without taking another action owner's claim. */
export function createSpawnExitControl(arbiter: ReturnType<typeof createActionArbiter>, movement: Pick<ReturnType<typeof createMovementService>,'move'>) {
  let previous: number | undefined;
  return (): boolean => {
    if (previous === Game.time) return false; previous = Game.time;
    const exits = pendingSpawnExits(), protectedTiles = exits.map(exit => exit.position); let moved = false;
    for (const exit of exits) {
      const blockers = Object.values(Game.creeps).filter(creep => creep.name !== exit.name && samePoint(position(creep),exit.position));
      for (const creep of blockers) if (clear(creep,'spawn-exit:'+exit.spawn,protectedTiles)) moved = true;
    }
    return moved;
  };
  function clear(creep: Creep, owner: string, protectedTiles: readonly Position[]): boolean {
    if (!creep.my || creep.spawning || creep.getActiveBodyparts(MOVE) < 1 || !arbiter.claim(creep.name,owner)) return false;
    if (creep.fatigue > 0) return false;
    const destination = parking(creep,protectedTiles); if (!destination) return false;
    movement.move(creep,{ owner,destination,range: 0,priority: -1000,policy: { version: 'spawn-exit-clearance-v1',maximumRooms: 1,allowedRooms: [creep.pos.roomName],blockedRooms: [],costs: {} } });
    return true;
  }
}
function position(creep: Creep): Position { return { room: creep.pos.roomName,x: creep.pos.x,y: creep.pos.y }; }
function parking(creep: Creep, protectedTiles: readonly Position[]): Position | undefined {
  const occupied = Object.values(Game.creeps).map(position), room = Game.rooms[creep.pos.roomName]; if (!room) return undefined;
  const candidates: Position[] = [];
  for (let dx=-1; dx<=1; dx++) for (let dy=-1; dy<=1; dy++) if (dx || dy) candidates.push({ room: room.name,x: creep.pos.x+dx,y: creep.pos.y+dy });
  return candidates.find(point => available(point,room,protectedTiles,occupied));
}
function available(point: Position, room: Room, protectedTiles: readonly Position[], occupied: readonly Position[]): boolean {
  return point.x > 0 && point.x < 49 && point.y > 0 && point.y < 49 && ![...protectedTiles,...occupied].some(other => samePoint(point,other)) && canStandAt(room,point);
}
