import { salvageBootstrapWall } from './native-bootstrap-salvage';
import type { createNativeDispatch } from './native-dispatch';
import type { Outcome } from '../core/execution/model';
import { selectBootstrapSource } from '../features/work/bootstrap-energy';
import { movementPosition } from '../adapters/screeps/movement-traffic';
import { createCreepActions } from '../adapters/screeps/creep-actions';
import { harvestStep } from '../capabilities/harvesting/step';
export function harvestBootstrapEnergy(creep: Creep, room: Room, owner: string, dispatch: ReturnType<typeof createNativeDispatch>, salvage = true): Outcome {
  const origin = creep.pos.roomName === room.name ? movementPosition(creep.pos) : { room: room.name, x: 25, y: 25 };
  const sources = room.find(FIND_SOURCES);
  const selected = selectBootstrapSource(sources.map(source => ({ id: source.id, position: movementPosition(source.pos),
    energy: source.energy, regeneration: source.ticksToRegeneration ?? 0 })), origin);
  const source = sources.find(source => source.id === selected?.id);
  if (!source) return salvageBootstrapWall(creep, room, owner, dispatch, salvage);
  const actions = createCreepActions(creep, owner, dispatch.arbiter);
  return harvestStep({ tick: Game.time, stored: creep.store.energy, goal: creep.store.energy + creep.store.getFreeCapacity(),
    target: 'visible', inRange: creep.pos.inRangeTo(source, 1), available: source.energy,
    retryAt: Game.time + (source.ticksToRegeneration ?? 1) }, {
    approach: () => dispatch.movement.move(creep, { owner, destination: movementPosition(source.pos), range: 1,
      policy: { version: 'bootstrap-harvest', blockedRooms: [], costs: {}, maximumRooms: 16 } }),
    harvest: () => actions.harvest(source),
    rejected: code => ({ status: 'blocked', reason: 'bootstrap-harvest:' + code, retryAt: Game.time + 1 }),
  });
}
