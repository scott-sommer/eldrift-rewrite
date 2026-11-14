import { loop as botLoop } from '../../src/main';
import { haulingOwner } from '../../src/features/logistics/identity';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const memory = Memory as Memory & { cargoDeath?: number[][] };
  for (const creep of Object.values(Game.creeps)) creep.memory.population = { owner: haulingOwner('W0N1'), home: 'W0N1' };
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { logisticsEnabled: true, preservationEnabled: true };
  saveState(state, 'operator/config', operatorSchema, settings);
  const containers = Game.rooms['W0N1']!.find(FIND_STRUCTURES).filter((item): item is StructureContainer => item.structureType === STRUCTURE_CONTAINER);
  const source = containers.find(item => item.pos.x === 19)!;
  const sink = containers.find(item => item.pos.x === 21)!;
  createLogisticsRequests(state, 'W0N1').submit({ id: 'delivery', owner: 'test', source: source.id, sink: sink.id,
    resource: 'energy', quantity: 50, priority: 0, expiresAt: 100 }, Game.time);
  // Isolate native death after pickup: no logistics execution on the death tick.
  if (memory.cargoDeath?.length === 1) {
    if (Game.creeps['a-hauler']!.suicide() !== OK) throw new Error('Cargo death setup failed');
  } else botLoop();
  const room = Game.rooms['W0N1']!;
  (memory.cargoDeath ??= []).push([Game.creeps['a-hauler']?.store.energy ?? 0, Game.creeps['z-hauler']!.store.energy,
    sink.store.energy, room.storage!.store.energy, room.find(FIND_TOMBSTONES).reduce((sum, tomb) => sum + tomb.store.energy, 0)]);
}
