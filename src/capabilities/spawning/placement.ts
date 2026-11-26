import { sameSpawnAdmission } from './admission';
import { copySpawnBoost } from './boost';
import { validWorldPosition } from '../../core/geometry/world-position';
import type { SpawnPlacement, SpawnRequest, SpawnSlot } from './request';
export function validateSpawnPlacement(value: unknown, room: string): void {
  if (value === undefined) return;
  if (!value || typeof value !== 'object') throw new Error('Invalid spawn placement');
  const placement = value as Partial<SpawnPlacement>;
  if (typeof placement.spawn !== 'string' || !placement.spawn.length || placement.spawn.length > 240) throw new Error('Invalid placement spawn');
  if (!validWorldPosition(placement.exit) || placement.exit.room !== room) throw new Error('Invalid spawn exit');
}
export function matchesSpawn(request: SpawnRequest, slot: SpawnSlot): boolean {
  return slot.room === request.room && (request.placement === undefined || request.placement.spawn === slot.id);
}
export function copySpawnRequest(request: SpawnRequest): SpawnRequest {
  return { ...request,...(request.admission ? { admission: { ...request.admission } } : {}),body: [...request.body],...(request.boost ? { boost: copySpawnBoost(request.boost) } : {}),...(request.placement ? { placement: { spawn: request.placement.spawn,exit: { ...request.placement.exit } } } : {}) };
}

export function sameSpawnPlacement(a: SpawnPlacement | undefined, b: SpawnPlacement | undefined): boolean {
  if (!a || !b) return a === b;
  return a.spawn === b.spawn && a.exit.room === b.exit.room && a.exit.x === b.exit.x && a.exit.y === b.exit.y;
}

export function sameSpawnRequest(a: SpawnRequest, b: SpawnRequest): boolean {
  const fields = ['id','owner','room','home','name','priority','readyAt','expiresAt'] as const;
  return fields.every(key => a[key] === b[key]) && JSON.stringify(a.body) === JSON.stringify(b.body) && sameSpawnPlacement(a.placement,b.placement)
    && JSON.stringify(a.boost ? copySpawnBoost(a.boost) : null) === JSON.stringify(b.boost ? copySpawnBoost(b.boost) : null) && sameSpawnAdmission(a.admission,b.admission);
}
