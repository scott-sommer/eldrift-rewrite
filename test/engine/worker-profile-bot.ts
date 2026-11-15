import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { workOwner } from '../../src/features/work/identity';
import type { WorkerEnergyProfile } from '../../src/features/work/energy-profiles';
export function loop() {
  const creep = Object.values(Game.creeps).find(item => item.name.startsWith('profile-'))!;
  const profile = creep.name.slice('profile-'.length);
  if (profile === 'flag-hold' && Game.time === 1) {
    creep.room.createFlag(10, 10, 'Transfer:test:W0N1');
    return;
  }
  creep.memory.population = { owner: workOwner('W0N1'), home: 'W0N1' };
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { workersEnabled: true, workerEnergyProfile: ((profile === 'hold' || profile === 'flag-hold') ? 'upgrader-v2' : profile) as WorkerEnergyProfile,
    workerHoldStoragePosition: profile === 'hold' };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const room = creep.room;
  const link = room.find(FIND_MY_STRUCTURES).find((item): item is StructureLink => item.structureType === STRUCTURE_LINK)!;
  const memory = Memory as Memory & { workerProfile?: number[][] };
  (memory.workerProfile ??= []).push([creep.store.energy, link.store.energy, room.terminal!.store.energy,
    room.storage!.store.energy, room.find(FIND_DROPPED_RESOURCES)[0]?.amount ?? 0, creep.pos.x, creep.pos.y]);
}
