import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createTransferJournal } from '../../src/features/logistics/transfer-journal';
import { distributorOwner } from '../../src/features/logistics/identity';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { logisticsEnabled: true, recoveryEnabled: Game.time > 1, recoveryScavengerEnabled: false, recoveryInterval: 1000,
    distributorSpawningEnabled: true, distributorTarget: 0 };
  saveState(state, 'operator/config', operatorSchema, settings);
  const original = Game.creeps['rescuer']!;
  original.memory.population ??= { owner: distributorOwner('W0N1'), home: 'W0N1' };
  botLoop();
  const row = { tick: Game.time, journal: createTransferJournal(state, original.id).read(), stored: Game.rooms['W0N1']!.storage!.store.energy,
    units: Object.values(Game.creeps).map(creep => ({ name: creep.name, owner: creep.memory.population?.owner,
      spawning: creep.spawning, body: creep.body.map(part => part.type), cargo: creep.store.energy })),
    queue: state.read('spawning/W0N1') };
  const memory = Memory as Memory & { distributorRecovery?: (typeof row)[] };
  (memory.distributorRecovery ??= []).push(row);
}
