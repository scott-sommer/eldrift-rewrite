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
  const alternate = containers.find(item => item.pos.y === 19)!;
  const sink = containers.find(item => item.pos.x === 21)!;
  const queue = createLogisticsRequests(state, 'W0N1');
  queue.submit({ id: 'primary', owner: 'test', source: source.id, sink: sink.id, resource: 'energy', quantity: 100, priority: 0, expiresAt: 100 }, Game.time);
  queue.submit({ id: 'alternate', owner: 'test', source: alternate.id, sink: sink.id, resource: 'energy', quantity: 20, priority: 1, expiresAt: 100 }, Game.time);
  botLoop();
  const memory = Memory as Memory & { emptySource?: number[][] };
  (memory.emptySource ??= []).push([source.store.energy, alternate.store.energy, creep.store.energy, sink.store.energy]);
}
