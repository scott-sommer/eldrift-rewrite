import { loop as botLoop } from '../../src/main';
import { haulingOwner } from '../../src/app/native-logistics';
import { workOwner } from '../../src/features/work/identity';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const courier = Game.creeps['hauler']!;
  const worker = Game.creeps['worker']!;
  courier.memory.population = { owner: haulingOwner('W0N1'), home: 'W0N1' };
  worker.memory.population = { owner: workOwner('W0N1'), home: 'W0N1' };
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { logisticsEnabled: true, workerSupplyEnabled: true };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const containers = courier.room.find(FIND_STRUCTURES).filter((item): item is StructureContainer => item.structureType === STRUCTURE_CONTAINER);
  const source = containers.find(item => item.pos.x === 19)!;
  const reserve = containers.find(item => item.pos.x === 21)!;
  const memory = Memory as Memory & { workSupply?: number[][] };
  (memory.workSupply ??= []).push([source.store.energy, courier.store.energy, reserve.store.energy, worker.store.energy]);
}
