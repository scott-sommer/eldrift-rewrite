import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
export function loop() {
  const creep = Game.creeps.assigned!;
  const sources = creep.room.find(FIND_SOURCES);
  if (Game.time === 1) {
    creep.memory.population = { owner: 'upgrade-bootstrap:W0N1', home: 'W0N1' };
    creep.memory.bootstrapSource = { room: 'W0N1', id: sources.find(source => source.pos.x === 23)!.id };
  }
  const port = createMemoryPort(() => Memory);
  const settings = openState(port, 'operator/config', operatorSchema);
  settings.rooms = { W0N1: { override: { upgradeRoomEnabled: true, upgradeRoomSpawningEnabled: false } } };
  saveState(port, 'operator/config', operatorSchema, settings);
  botLoop();
  const row = { tick: Game.time, assignedX: sources.find(source => source.id === creep.memory.bootstrapSource?.id)?.pos.x,
    near: sources.find(source => source.pos.x === 21)!.energy, far: sources.find(source => source.pos.x === 23)!.energy,
    progress: creep.room.find(FIND_MY_CONSTRUCTION_SITES).reduce((sum, site) => sum + site.progress, 0),
    wall: creep.room.find(FIND_STRUCTURES).filter(item => item.structureType === STRUCTURE_WALL).reduce((sum, wall) => sum + wall.hits, 0) };
  const memory = Memory as Memory & { assignment?: (typeof row)[] };
  (memory.assignment ??= []).push(row);
}
