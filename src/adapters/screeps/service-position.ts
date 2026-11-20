import { blocksMovement } from './structure-walkability';
import type { Position } from '../../capabilities/movement/step';
/** Current static standability only; unit occupancy remains a movement/traffic decision. */
export function canStandAt(room: Room, position: Position): boolean {
  const structures = room.lookForAt(LOOK_STRUCTURES,position.x,position.y);
  if (structures.some(blocksMovement)) return false;
  if (room.getTerrain().get(position.x,position.y) === TERRAIN_MASK_WALL && !structures.some(item => item.structureType === 'road')) return false;
  if (room.lookForAt(LOOK_CONSTRUCTION_SITES,position.x,position.y).some(site => (OBSTACLE_OBJECT_TYPES as readonly string[]).includes(site.structureType))) return false;
  if ([LOOK_SOURCES,LOOK_MINERALS,LOOK_DEPOSITS].some(kind => room.lookForAt(kind,position.x,position.y).length > 0)) return false;
  return !room.controller || room.controller.pos.x !== position.x || room.controller.pos.y !== position.y;
}
