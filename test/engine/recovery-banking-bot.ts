import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { haulingOwner } from '../../src/features/logistics/identity';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { recoveryEnabled: true, recoveryScavengerEnabled: false, recoveryInterval: 1,
    recoveryEnterEnergy: 200, recoveryExitEnergy: 300 };
  saveState(state, 'operator/config', operatorSchema, settings);
  Game.creeps['rescuer']!.memory.population = { owner: haulingOwner('W0N1'), home: 'W0N1' };
  botLoop();
  const room = Game.rooms['W0N1']!;
  const structures = room.find(FIND_STRUCTURES).filter(item => ['container', 'link', 'lab', 'terminal'].includes(item.structureType));
  const row = { pos: Game.creeps['rescuer']!.pos, stored: room.storage!.store.energy, cargo: Game.creeps['rescuer']!.store.energy,
    sources: structures.map(item => ({ active: item.isActive(), kind: item.structureType, energy: 'store' in item ? item.store.getUsedCapacity('energy') : 0,
      hydrogen: 'store' in item ? item.store.getUsedCapacity('H') : 0 })) };
  const memory = Memory as Memory & { recoveryBanking?: (typeof row)[] };
  (memory.recoveryBanking ??= []).push(row);
}
