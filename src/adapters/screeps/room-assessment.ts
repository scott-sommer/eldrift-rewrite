import { assessmentSnapshot } from '../../capabilities/planning/snapshot';
import type { AssessmentInput, FixedObject } from '../../capabilities/planning/assessment-model';
import type { TerrainCell } from '../../capabilities/planning/terrain';
import { tileAt } from '../../core/geometry/local-grid';
import { blocksMovement } from './structure-walkability';
type AssessmentOptions = Pick<AssessmentInput, 'costs' | 'margin'> & { constraints?: AssessmentInput['constraints'] };
/** Observation only. Hidden rooms return no new snapshot, never an empty infrastructure claim. */
export function observeRoomAssessment(name: string, options: AssessmentOptions = {}) {
  const room = Game.rooms[name];
  if (!room) return undefined;
  const terrain = room.getTerrain();
  const cells = Array.from({ length: 2500 }, (_, index): TerrainCell => {
    const { x, y } = tileAt(index), value = terrain.get(x, y);
    if (value & TERRAIN_MASK_WALL) return 'wall';
    return value & TERRAIN_MASK_SWAMP ? 'swamp' : 'plain';
  });
  const objects: FixedObject[] = [
    ...room.find(FIND_SOURCES).map(item => ({ id: item.id, kind: 'source' as const, position: position(item.pos) })),
    ...room.find(FIND_MINERALS).map(item => ({ id: item.id, kind: 'mineral' as const, position: position(item.pos) })),
  ];
  if (room.controller) objects.push({ id: room.controller.id, kind: 'controller', position: position(room.controller.pos) });
  const infrastructure = room.find(FIND_STRUCTURES).map(item => ({ id: item.id, type: item.structureType,
    position: position(item.pos), walkable: !blocksMovement(item), owned: 'my' in item && item.my }));
  const sites = room.find(FIND_CONSTRUCTION_SITES).map(item => ({ id: 'site:' + item.id,
    kind: 'locked' as const, type: item.structureType, position: position(item.pos) }));
  return assessmentSnapshot(name, { ...options, terrain: cells, objects, infrastructure,
    constraints: [...sites, ...(options.constraints ?? [])] }, Game.time);
}
function position(pos: RoomPosition) { return { x: pos.x, y: pos.y }; }
