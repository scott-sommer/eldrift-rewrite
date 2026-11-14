import { loop as botLoop } from '../../src/main';
import { haulingOwner } from '../../src/features/logistics/identity';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const memory = Memory as Memory & { courierDeath?: number[][] };
  for (const creep of Object.values(Game.creeps)) creep.memory.population = { owner: haulingOwner('W0N1'), home: 'W0N1' };
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { logisticsEnabled: true };
  saveState(state, 'operator/config', operatorSchema, settings);
  const containers = Game.rooms['W0N1']!.find(FIND_STRUCTURES).filter((item): item is StructureContainer => item.structureType === STRUCTURE_CONTAINER);
  const source = containers.find(item => item.pos.x === 19)!;
  const sink = containers.find(item => item.pos.x === 21)!;
  createLogisticsRequests(state, 'W0N1').submit({ id: 'delivery', owner: 'test', source: source.id, sink: sink.id,
    resource: 'energy', quantity: 50, priority: 0, expiresAt: 100 }, Game.time);
  botLoop();
  if (!memory.courierDeath && Game.creeps['a-hauler']!.suicide() !== OK) throw new Error('Courier death setup failed');
  const deadClaims = createQuantityReservations(state).list(Game.time).filter(claim => claim.holder === 'a-hauler').length;
  (memory.courierDeath ??= []).push([source.store.energy, Game.creeps['z-hauler']!.store.energy, sink.store.energy, deadClaims]);
}
