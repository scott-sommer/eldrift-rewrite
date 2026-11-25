import { movementPosition } from '../../adapters/screeps/movement-traffic';
import type { WorkOrder } from '../../capabilities/work/assessment';
export function nativeLaborWork(order: WorkOrder) {
  const target = Game.getObjectById(order.id as Id<ConstructionSite | Structure | StructureController>);
  if (!target || JSON.stringify(movementPosition(target.pos)) !== JSON.stringify(order.position)) return undefined;
  if (order.kind === 'build') return buildTarget(target);
  if (order.kind === 'repair') return repairTarget(target,order.targetHits);
  return upgradeTarget(target);
}
function buildTarget(target: ConstructionSite | Structure | StructureController) {
  if ('level' in target || !('progressTotal' in target) || !('structureType' in target) || !('my' in target) || !target.my || !('progress' in target)) return undefined;
  return { target,remaining: Math.max(0,target.progressTotal-target.progress),nativeLimit: Math.max(0,target.progressTotal-target.progress) };
}
function repairTarget(target: ConstructionSite | Structure | StructureController, limit: number | undefined) {
  if (!('hits' in target) || !('hitsMax' in target) || 'my' in target && !target.my || !Number.isSafeInteger(limit)) return undefined;
  return { target,remaining: Math.max(0,Math.min(limit!,target.hitsMax)-target.hits),nativeLimit: Math.ceil(Math.max(0,target.hitsMax-target.hits)/100) };
}
function upgradeTarget(target: ConstructionSite | Structure | StructureController) {
  if (!('level' in target) || !target.my || target.level >= 8 || target.upgradeBlocked) return undefined;
  return { target,remaining: Math.max(0,target.progressTotal-target.progress),nativeLimit: Number.MAX_SAFE_INTEGER };
}

export function nativeLaborActor(creep: Creep | undefined) {
  return creep ? { id: creep.id,name: creep.name,owner: creep.memory.population?.owner ?? '',body: creep.body.filter(part => part.hits > 0).map(part => part.type),position: movementPosition(creep.pos),energy: creep.store.energy,spawning: creep.spawning } : undefined;
}
export function inLaborRange(creep: Creep, point: { room: string; x: number; y: number }, range: number): boolean {
  return creep.pos.roomName === point.room && Math.max(Math.abs(creep.pos.x-point.x),Math.abs(creep.pos.y-point.y)) <= range;
}
