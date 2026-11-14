import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { workOwner } from '../../src/features/work/identity';
import { recoverySchema } from '../../src/features/recovery/schema';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const memory = Memory as Memory & { energyRecovery?: { active: boolean; energy: number; progress: number; donors: string[]; pending: number }[] };
  const rows = memory.energyRecovery ??= [];
  const creep = Game.creeps['build']!;
  creep.memory.population = { owner: workOwner('W0N1', 'upgrader'), home: 'W0N1' };
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.rooms = { W0N1: { override: { workersEnabled: true, workerSpawningEnabled: true, workerUpgraderTarget: 2,
    workerBodyBudget: 250, workerUpgradeReserve: 0, recoveryEnabled: rows.length < 7, recoveryInterval: 1 } } };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const recovery = openState(state, 'recovery/W0N1', recoverySchema('W0N1'));
  rows.push({ active: recovery.active, energy: recovery.energy, progress: creep.room.controller!.progress,
    donors: recovery.donors.map(item => item.room), pending: createSpawnQueue(state, 'W0N1').list().length });
}
