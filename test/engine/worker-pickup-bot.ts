import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { workOwner } from '../../src/features/work/identity';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
import { logisticsPool } from '../../src/capabilities/logistics/request';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const creep = Game.creeps['build']!;
  const memory = Memory as Memory & { workerPickup?: number[][] };
  const evidence = memory.workerPickup ??= [];
  const drop = creep.room.find(FIND_DROPPED_RESOURCES)[0];
  creep.memory.population = { owner: workOwner('W0N1'), home: 'W0N1' };
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { workersEnabled: true };
  saveState(state, 'operator/config', operatorSchema, settings);
  if (!evidence.length) {
    const pool = logisticsPool('stock', drop!.id, 'energy');
    createQuantityReservations(state).reserve({ id: 'external', owner: 'other', holder: 'other', scope: 'external', expiresAt: Game.time + 1,
      allocations: [{ pool, amount: 1 }] }, { [pool]: drop!.amount }, Game.time);
  }
  botLoop();
  evidence.push([creep.store.energy, drop?.amount ?? 0, creep.room.find(FIND_MY_CONSTRUCTION_SITES).length, creep.room.controller!.progress]);
}
