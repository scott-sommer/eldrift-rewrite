import { loop as botLoop } from '../../src/main';
import { haulingOwner } from '../../src/app/native-logistics';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const creep = Game.creeps['hauler']!;
  creep.memory.population = { owner: haulingOwner('W0N1'), home: 'W0N1' };
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { logisticsEnabled: true, mineralTransportEnabled: true };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const room = creep.room;
  const containers = room.find(FIND_STRUCTURES).filter((item): item is StructureContainer => item.structureType === STRUCTURE_CONTAINER);
  const memory = Memory as Memory & { mineralTransport?: number[][] };
  (memory.mineralTransport ??= []).push([containers.find(item => item.pos.x === 19)!.store.H ?? 0, creep.store.getUsedCapacity(),
    room.terminal!.store.H ?? 0, room.storage!.store.H ?? 0, containers.find(item => item.pos.x === 21)!.store.H ?? 0,
    room.terminal!.store.getFreeCapacity()]);
}
