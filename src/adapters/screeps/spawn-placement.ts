import { validateSpawnPlacement } from '../../capabilities/spawning/placement';
import { blocksMovement } from './structure-walkability';
import type { SpawnRequest } from '../../capabilities/spawning/request';
import type { Position } from '../../capabilities/movement/step';
/** Undefined preserves native choice; null refuses invalid/static-blocked geometry. Occupancy may delay birth. */
export function nativeSpawnDirections(spawn: StructureSpawn, request: SpawnRequest): DirectionConstant[] | null | undefined {
  const placement = request.placement;
  if (placement === undefined) return undefined;
  try { validateSpawnPlacement(placement,request.room); } catch { return null; }
  const exit = placement.exit;
  if (placement.spawn !== spawn.id || exit.room !== spawn.room.name) return null;
  const distance = Math.max(Math.abs(exit.x-spawn.pos.x),Math.abs(exit.y-spawn.pos.y));
  if (distance !== 1 || !staticExit(spawn.room,exit)) return null;
  return [spawn.pos.getDirectionTo(exit.x,exit.y)];
}
function staticExit(room: Room, exit: Position): boolean {
  const structures = room.lookForAt(LOOK_STRUCTURES,exit.x,exit.y);
  if (structures.some(blocksMovement)) return false;
  if (room.getTerrain().get(exit.x,exit.y) === TERRAIN_MASK_WALL && !structures.some(item => item.structureType === 'road')) return false;
  if (room.lookForAt(LOOK_CONSTRUCTION_SITES,exit.x,exit.y).some(site => (OBSTACLE_OBJECT_TYPES as readonly string[]).includes(site.structureType))) return false;
  if ([LOOK_SOURCES,LOOK_MINERALS,LOOK_DEPOSITS].some(kind => room.lookForAt(kind,exit.x,exit.y).length > 0)) return false;
  return !room.controller || room.controller.pos.x !== exit.x || room.controller.pos.y !== exit.y;
}
