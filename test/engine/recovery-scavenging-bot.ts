import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { recoverySchema } from '../../src/features/recovery/schema';
import { haulingOwner } from '../../src/features/logistics/identity';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { recoveryEnabled: true, recoveryScavengerEnabled: false, recoveryInterval: 1, recoveryEnterEnergy: 10, recoveryExitEnergy: 50 };
  saveState(state, 'operator/config', operatorSchema, settings);
  Game.creeps['rescuer']!.memory.population = { owner: haulingOwner('W0N1'), home: 'W0N1' };
  if (state.read('recovery/W0N1') === undefined) {
    const room = Game.rooms['W0N1']!;
    createLogisticsRequests(state, room.name).submit({ id: 'mineral-before-recovery', owner: 'operator:test',
      source: room.find(FIND_TOMBSTONES)[0]!.id, sink: room.storage!.id, resource: 'H', quantity: 10,
      priority: -10, expiresAt: Game.time + 100 }, Game.time);
  }
  botLoop();
  const room = Game.rooms['W0N1']!;
  const recovery = openState(state, 'recovery/W0N1', recoverySchema('W0N1'));
  const tomb = room.find(FIND_TOMBSTONES)[0]!;
  const memory = Memory as Memory & { recoveryScavenging?: { active: boolean; stored: number; tombEnergy: number; hydrogen: number; ground: number; storedHydrogen: number }[] };
  (memory.recoveryScavenging ??= []).push({ active: recovery.active, stored: room.storage!.store.energy,
    tombEnergy: tomb.store.energy, hydrogen: tomb.store.H ?? 0, storedHydrogen: room.storage!.store.H ?? 0,
    ground: room.find(FIND_DROPPED_RESOURCES).reduce((sum, item) => sum + item.amount, 0) });
}
