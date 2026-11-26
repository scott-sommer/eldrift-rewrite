import { validWorldPosition } from '../../core/geometry/world-position';
import type { SpawnPlacement } from '../../capabilities/spawning/request';
import type { Position } from '../../capabilities/movement/step';
declare global { interface CreepMemory { birthPlacement?: SpawnPlacement } }
export interface SpawnExit { spawn: string; name: string; position: Position }
/** Only an actual pending selected birth protects a tile; stale metadata alone grants no claim. */
export function pendingSpawnExits(): SpawnExit[] {
  return Object.values(Game.spawns ?? {}).flatMap(spawn => {
    const position = selectedExit(spawn); return position ? [{ spawn: spawn.id,name: spawn.spawning!.name,position }] : [];
  });
}
function selectedExit(spawn: StructureSpawn): Position | undefined {
  if (!spawn.my || !spawn.spawning) return undefined;
  const placement = Game.creeps[spawn.spawning.name]?.memory.birthPlacement;
  if (!placement || placement.spawn !== spawn.id || !validWorldPosition(placement.exit)) return undefined;
  const point = placement.exit;
  return point.room === spawn.room.name && Math.max(Math.abs(point.x-spawn.pos.x),Math.abs(point.y-spawn.pos.y)) === 1 ? { ...point } : undefined;
}
export function spawnExitAvoidance(name: string, destination?: Position): Position[] { return pendingSpawnExits().filter(exit => exit.name !== name && (!destination || !samePoint(exit.position,destination))).map(exit => exit.position); }
export function permitsSpawnExit(unit: string, destination: Position): boolean {
  return !pendingSpawnExits().some(exit => samePoint(exit.position,destination) && Game.creeps[exit.name]?.id !== unit);
}
export function samePoint(a: Position, b: Position): boolean { return a.room === b.room && a.x === b.x && a.y === b.y; }
