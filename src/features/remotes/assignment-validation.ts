import { roomCoordinates } from '../../core/geometry/room-grid';
import { framedIdentity } from '../../core/framed-identity';
import type { RemoteAssignment, RemoteRoomPlan } from './assignment-model';
export function remoteAssignmentId(home: string, room: string): string {
  return 'remote-assignment:' + framedIdentity([home,room]);
}
export function natural(value: unknown): value is number { return Number.isSafeInteger(value) && Number(value) >= 0; }
function text(value: unknown): value is string { return typeof value === 'string' && value.length > 0 && value.length <= 256; }
export function object(value: unknown): value is Record<string,unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
export function room(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try { roomCoordinates(value); return true; } catch { return false; }
}
export function validRemotePlan(value: unknown): value is RemoteRoomPlan {
  if (!object(value) || !room(value.room)) return false;
  if (!validSources(value.sources)) return false;
  return validReserve(value.reserve,value.room) && validInfrastructure(value.infrastructure)
    && ((value.sources as string[]).length > 0 || value.reserve !== null || value.infrastructure !== null);
}
function validReserve(value: unknown, targetRoom: string): boolean {
  if (value === null) return true;
  if (!object(value) || !text(value.id) || !object(value.position)) return false;
  const position = value.position;
  return position.room === targetRoom && natural(position.x) && position.x < 50 && natural(position.y) && position.y < 50;
}
function validInfrastructure(value: unknown): boolean {
  return value === null || object(value) && typeof value.roads === 'boolean' && typeof value.containers === 'boolean';
}
export function validRemoteAssignment(value: unknown): value is RemoteAssignment {
  if (!object(value) || !room(value.home) || !validRemotePlan(value.plan)) return false;
  if (value.home === value.plan.room || value.id !== remoteAssignmentId(value.home,value.plan.room)) return false;
  return natural(value.generation) && value.generation > 0 && natural(value.renewedAt)
    && natural(value.expiresAt) && value.expiresAt > value.renewedAt;
}

function validSources(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 16 && value.every(text) && new Set(value).size === value.length;
}
