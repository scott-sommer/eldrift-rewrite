import { verifyTrafficRoads } from './traffic-road-check';
import { loop as botLoop } from '../../src/main';
import { canShareTile } from '../../src/capabilities/planning/placement-validation';
import { planningRoadSearch } from '../../src/adapters/screeps/planning-road-search';
import { observeStandardLayoutDraft } from '../../src/adapters/screeps/standard-layout-draft';
import { verifyAssembledDraft } from './layout-draft-check';
export function loop() {
  botLoop();
  const room = Game.rooms.W0N1!;
  const spawn = room.find(FIND_MY_SPAWNS)[0]!;
  const memory = Memory as Memory & { layoutPlacement?: unknown[] };
  const rows = memory.layoutPlacement ??= [];
  if (Game.time === 1) {
    verifyRoadSearch();
    verifyTrafficRoads();
    verifyAssembledDraft();
    const candidate = { anchor: { x: spawn.pos.x, y: spawn.pos.y }, transform: 0 as const };
    const live = observeStandardLayoutDraft(room.name, candidate);
    const hidden = observeStandardLayoutDraft('E9S9', candidate);
    if (live.ok || live.phase !== 'placement') throw new Error('Live spawn conflict was not rejected');
    if (hidden.ok || hidden.phase !== 'visibility') throw new Error('Hidden room was evaluated');
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

function verifyRoadSearch() {
  const costs = Array<number>(2500).fill(255);
  for (let x = 10; x <= 15; x++) costs[10 * 50 + x] = 2;
  const start = { x: 10, y: 10 }, goal = { x: 15, y: 10 };
  const complete = planningRoadSearch('W0N1', costs)(start, goal, []);
  const limited = planningRoadSearch('W0N1', costs, 1)(start, goal, []);
  costs[10 * 50 + 12] = 255;
  const blocked = planningRoadSearch('W0N1', costs)(start, goal, [{ x: 12, y: 10 }]);
  if (complete.incomplete || complete.path.length !== 4 || complete.cost !== 8) throw new Error('Complete road search mismatch');
  if (!limited.incomplete) throw new Error('Search budget did not report incomplete');
  if (!blocked.incomplete || blocked.path.some(tile => tile.x === 12)) throw new Error('Preferred road reopened obstacle');
}
