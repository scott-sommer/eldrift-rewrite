import type { createNativeDispatch } from './native-dispatch';
import type { Outcome } from '../core/execution/model';
import { upgradeBootstrapOwner } from '../features/work/upgrade-identity';
import { movementPosition } from '../adapters/screeps/movement-traffic';
import { createCreepActions } from '../adapters/screeps/creep-actions';
import { dismantleStep } from '../capabilities/work/dismantle';
/** Called only after observing no natural sources in the assigned bootstrap room. */
export function salvageBootstrapWall(creep: Creep, room: Room, owner: string,
  dispatch: ReturnType<typeof createNativeDispatch>, enabled: boolean): Outcome {
  if (!enabled || !eligible(creep, room)) return unavailable(creep);
  const walls = room.find(FIND_STRUCTURES).filter((item): item is StructureWall => item.structureType === STRUCTURE_WALL && item.hits > 0);
  const wall = walls.sort((a, b) => distance(creep, a) - distance(creep, b) || a.id.localeCompare(b.id))[0];
  if (!wall) return unavailable(creep);
  return dismantleStep({ tick: Game.time, complete: creep.store.getFreeCapacity() === 0, target: 'visible',
    inRange: creep.pos.inRangeTo(wall, 1) }, {
    approach: () => dispatch.movement.move(creep, { owner, destination: movementPosition(wall.pos), range: 1,
      policy: { version: 'bootstrap-salvage', maximumRooms: 16, blockedRooms: [], costs: {} } }),
    act: () => createCreepActions(creep, owner, dispatch.arbiter).dismantle(wall),
    rejected: code => ({ status: 'blocked', reason: 'bootstrap-dismantle:' + code, retryAt: Game.time + 1 }),
  });
}
function eligible(creep: Creep, room: Room): boolean {
  return creep.my && !creep.spawning && !!room.controller?.my && creep.memory.population?.home === room.name
    && creep.memory.population.owner === upgradeBootstrapOwner(room.name);
}
function distance(creep: Creep, wall: StructureWall): number {
  return creep.room.name === wall.room!.name ? creep.pos.getRangeTo(wall) : 0;
}
function unavailable(creep: Creep): Outcome {
  return creep.store.energy > 0 ? { status: 'done' } : { status: 'blocked', reason: 'bootstrap-no-source', retryAt: Game.time + 1 };
}
