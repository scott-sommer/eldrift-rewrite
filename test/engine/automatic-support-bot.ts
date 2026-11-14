import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { recoverySchema } from '../../src/features/recovery/schema';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { recoveryScavengerEnabled: false, recoverySupportBodyBudget: 100, recoverySupportReserve: 700,
    recoverySupportTravelTicks: 20, recoverySupportLifetime: 1500 };
  settings.rooms = { E0N1: { override: { recoveryEnabled: true, recoveryInterval: 1,
    recoveryEnterEnergy: 50, recoveryExitEnergy: 100, recoveryDonorMinimumEnergy: 900, recoverySupportBatch: 50 } } };
  saveState(state, 'operator/config', operatorSchema, settings);
  const before = Object.values(Game.creeps).filter(unit => unit.memory.population).length;
  botLoop();
  const row = { before, active: openState(state, 'recovery/E0N1', recoverySchema('E0N1')).active,
    donor: Game.rooms['W0N1']!.storage!.store.energy, target: Game.rooms['E0N1']!.storage!.store.energy,
    units: Object.values(Game.creeps).filter(unit => unit.memory.population).map(unit => ({
      name: unit.name, owner: unit.memory.population!.owner, room: unit.pos.roomName,
      spawning: unit.spawning, cargo: unit.store.energy, parts: unit.body.map(part => part.type) })) };
  const memory = Memory as Memory & { automaticSupport?: (typeof row)[] };
  (memory.automaticSupport ??= []).push(row);
}
