import { loop as botLoop } from '../../src/main';
import { canShareTile } from '../../src/capabilities/planning/placement-validation';
export function loop() {
  botLoop();
  const room = Game.rooms.W0N1!;
  const spawn = room.find(FIND_MY_SPAWNS)[0]!;
  const memory = Memory as Memory & { layoutPlacement?: unknown[] };
  const rows = memory.layoutPlacement ??= [];
  if (Game.time === 1) {
    rows.push({
      predictedRoad: canShareTile('road', 'spawn'),
      predictedExtension: canShareTile('extension', 'spawn'),
      extension: room.createConstructionSite(spawn.pos, STRUCTURE_EXTENSION),
      road: room.createConstructionSite(spawn.pos, STRUCTURE_ROAD),
    });
  } else {
    rows.push({
      spawnPresent: room.find(FIND_MY_SPAWNS).some(item => item.id === spawn.id),
      roadSite: room.find(FIND_CONSTRUCTION_SITES).some(site =>
        site.structureType === STRUCTURE_ROAD && site.pos.isEqualTo(spawn.pos)),
      extensionSite: room.find(FIND_CONSTRUCTION_SITES).some(site =>
        site.structureType === STRUCTURE_EXTENSION && site.pos.isEqualTo(spawn.pos)),
    });
  }
}
