import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { recoverySchema } from '../../src/features/recovery/schema';
import { haulingOwner } from '../../src/features/logistics/identity';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { recoveryEnabled: true, recoveryInterval: 1, recoveryEnterEnergy: 25, recoveryExitEnergy: 50 };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const room = Game.rooms['W0N1']!;
  const units = Object.values(Game.creeps).filter(unit => !unit.spawning);
  const recovery = openState(state, 'recovery/W0N1', recoverySchema('W0N1'));
  const raw = state.read('logistics-requests/W0N1') as { data: { records: { request: { owner: string }; receipts: { amount: number }[] }[] } };
  const bank = raw.data.records.filter(record => record.request.owner.endsWith(':bank')).flatMap(record => record.receipts).reduce((sum, receipt) => sum + receipt.amount, 0);
  const consumer = raw.data.records.filter(record => !record.request.owner.endsWith(':bank')).flatMap(record => record.receipts).reduce((sum, receipt) => sum + receipt.amount, 0);
  const memory = Memory as Memory & { recoveryEconomy?: { active: boolean; stored: number; spawn: number; miners: number; couriers: number; source: number; bank: number; consumer: number }[] };
  (memory.recoveryEconomy ??= []).push({ active: recovery.active, stored: room.storage!.store.energy, spawn: room.energyAvailable,
    miners: units.filter(unit => unit.memory.population?.owner.startsWith('mining:')).length,
    couriers: units.filter(unit => unit.memory.population?.owner === haulingOwner(room.name)).length,
    source: room.find(FIND_SOURCES)[0]!.energy, bank, consumer });
}
