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
  settings.empire = { logisticsEnabled: true, storeBalancingEnabled: true };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const room = creep.room;
  const memory = Memory as Memory & { storeBalance?: number[][] };
  (memory.storeBalance ??= []).push([room.storage!.store.energy, room.terminal!.store.energy,
    room.storage!.store.H ?? 0, room.terminal!.store.H ?? 0, creep.store.getUsedCapacity()]);
}
