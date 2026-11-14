import type { Position } from '../capabilities/movement/step';
import { selectUpgradeSupplyDestination, type SupplyEndpoint } from '../features/work/upgrade-supply-destination';
import { upgradeMasterOwner } from '../features/work/upgrade-identity';
import { movementPosition } from '../adapters/screeps/movement-traffic';
/** Snapshot capability separately from delivery; zero capacity is meaningful after a reset. */
export function observeUpgradeSupplyDestination(room: Room | undefined, anchor: Position) {
  const master = Object.values(Game.creeps).filter(creep => creep.my && !creep.spawning && creep.pos.roomName === anchor.room
    && creep.memory.population?.home === anchor.room && creep.memory.population.owner === upgradeMasterOwner(anchor.room))
    .sort((a, b) => a.name.localeCompare(b.name))[0];
  const terminal = room?.terminal?.my ? endpoint(room.terminal) : undefined;
  const storage = room?.storage?.my ? endpoint(room.storage) : undefined;
  return selectUpgradeSupplyDestination({ owned: !!room?.controller?.my, level: room?.controller?.level ?? 0, anchor,
    ...(terminal ? { terminal } : {}), ...(storage ? { storage } : {}), ...(master ? { master: endpoint(master) } : {}) });
}
function endpoint(object: StructureStorage | StructureTerminal | Creep): SupplyEndpoint {
  return { id: object.id, position: movementPosition(object.pos), free: object.store.getFreeCapacity('energy') ?? 0 };
}
