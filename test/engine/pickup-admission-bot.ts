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
  const source = creep.room.find(FIND_DROPPED_RESOURCES)[0]!;
  const sink = containers.find(item => item.pos.x === 21);
  const memory = Memory as Memory & { pickupAdmission?: number[][] };
  if (!memory.pickupAdmission) {
    const queue = createLogisticsRequests(state, 'W0N1');
    const request = { owner: 'test', source: source.id, sink: sink!.id, resource: 'energy', expiresAt: Game.time + 100 };
    queue.submit({ ...request, id: 'partial', quantity: 10, priority: -1 }, Game.time);
    queue.submit({ ...request, id: 'whole', quantity: 50, priority: 0 }, Game.time);
  }
  botLoop();
  (memory.pickupAdmission ??= []).push([creep.store.energy, sink!.store.energy]);
}

