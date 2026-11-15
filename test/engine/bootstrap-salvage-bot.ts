import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
export function loop() {
  const creep = Object.values(Game.creeps)[0]!;
  creep.memory.population ??= { owner: 'upgrade-bootstrap:W0N1', home: 'W0N1' };
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.rooms = { W0N1: { override: { upgradeRoomEnabled: true,
    upgradeRoomSpawningEnabled: false, upgradeBootstrapDismantleEnabled: creep.name !== 'disabled' } } };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const room = creep.room;
  const row = { tick: Game.time, energy: creep.store.energy,
    wall: room.find(FIND_STRUCTURES).filter(item => item.structureType === STRUCTURE_WALL).reduce((sum, item) => sum + item.hits, 0),
    siteProgress: room.find(FIND_MY_CONSTRUCTION_SITES).reduce((sum, site) => sum + site.progress, 0),
    sources: room.find(FIND_SOURCES).length, sourceEnergy: room.find(FIND_SOURCES).reduce((sum, source) => sum + source.energy, 0) };
  const memory = Memory as Memory & { salvage?: (typeof row)[] };
  (memory.salvage ??= []).push(row);
}
