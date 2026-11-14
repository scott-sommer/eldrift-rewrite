import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { haulingOwner } from '../../src/features/logistics/identity';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { miningEnabled: true, miningBodyBudget: 200, logisticsEnabled: true,
    energyRequestsEnabled: true, courierSpawningEnabled: true, courierBodyBudget: 100 };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const workers = Object.values(Game.creeps);
  const couriers = workers.filter(creep => creep.memory.population?.owner === haulingOwner('W0N1'));
  const memory = Memory as Memory & { colonyEconomy?: { miners: number; couriers: number; energy: number; delivered: number }[] };
  const requests = state.read('logistics-requests/W0N1') as { data: { records: { receipts: { amount: number }[] }[] } };
  const delivered = requests.data.records.flatMap(record => record.receipts).reduce((sum, receipt) => sum + receipt.amount, 0);
  (memory.colonyEconomy ??= []).push({ miners: workers.length - couriers.length, couriers: couriers.length,
    energy: Game.rooms['W0N1']!.energyAvailable, delivered });
}
