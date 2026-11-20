import { validateSpawnPlacement } from '../../capabilities/spawning/placement';
import { canStandAt } from './service-position';
import type { SpawnRequest } from '../../capabilities/spawning/request';
/** Undefined preserves native choice; null refuses invalid/static-blocked geometry. Occupancy may delay birth. */
export function nativeSpawnDirections(spawn: StructureSpawn, request: SpawnRequest): DirectionConstant[] | null | undefined {
  const placement = request.placement;
  if (placement === undefined) return undefined;
  try { validateSpawnPlacement(placement,request.room); } catch { return null; }
  const exit = placement.exit;
  if (placement.spawn !== spawn.id || exit.room !== spawn.room.name) return null;
  const distance = Math.max(Math.abs(exit.x-spawn.pos.x),Math.abs(exit.y-spawn.pos.y));
  if (distance !== 1 || !canStandAt(spawn.room,exit)) return null;
  return [spawn.pos.getDirectionTo(exit.x,exit.y)];
}
