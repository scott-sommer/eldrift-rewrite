import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { workOwner } from '../../src/features/work/identity';
export function loop() {
  const wide = !!Game.creeps['position-wide'];
  const creep = Game.creeps[wide ? 'position-wide' : 'position']!;
  creep.memory.population = { owner: workOwner('W0N1', 'upgrader'), home: 'W0N1' };
  const state = createMemoryPort(() => Memory), settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { workersEnabled: true, workerEnergyProfile: 'upgrader', workerUpgradeReserve: 0 };
  if (wide) settings.rooms = { W0N1: { override: { workerUpgradeApproachRange: 3 } } };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const controller = creep.room.controller!;
  const memory = Memory as Memory & { workerPosition?: unknown[] };
  (memory.workerPosition ??= []).push({ tick: Game.time, range: creep.pos.getRangeTo(controller),
    progress: controller.progress, energy: creep.store.energy, x: creep.pos.x, y: creep.pos.y });
}
