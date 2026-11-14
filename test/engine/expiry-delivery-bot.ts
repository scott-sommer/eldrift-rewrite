import { loop as botLoop } from '../../src/main';
import { haulingOwner } from '../../src/features/logistics/identity';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const creep = Game.creeps['hauler']!;
  creep.memory.population = { owner: haulingOwner('W0N1'), home: 'W0N1' };
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { logisticsEnabled: true };
  saveState(state, 'operator/config', operatorSchema, settings);
  const containers = creep.room.find(FIND_STRUCTURES).filter((item): item is StructureContainer => item.structureType === STRUCTURE_CONTAINER);
  const source = containers.find(item => item.pos.x === 19)!;
  const sink = containers.find(item => item.pos.x === 21);
  const memory = Memory as Memory & { missingSink?: number[][] };
  if (!memory.missingSink) createLogisticsRequests(state, 'W0N1').submit({ id: 'lost-sink', owner: 'test', source: source.id, sink: sink!.id, resource: 'energy', quantity: 30, priority: 0, expiresAt: Game.time + 2 }, Game.time);
  botLoop();
  (memory.missingSink ??= []).push([source.store.energy, creep.store.energy, sink?.store.energy ?? -1, creep.room.storage!.store.energy]);
}

