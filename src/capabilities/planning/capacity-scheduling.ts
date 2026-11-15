import { tileIndex } from '../../core/geometry/local-grid';
import type { PlacedTile, StagedTile } from './template';
import type { StructureLimits } from './core-model';
import { validateLayoutCapacity } from './capacity-validation';
import { validateLimits } from './staging';
export interface StageRequest extends PlacedTile { minimumRcl: number; priority: number }
export type Scheduled<T> = T & { rcl: number };
export function scheduleCapacity<T extends StageRequest>(
  requests: readonly T[], fixed: readonly StagedTile[], limits: StructureLimits,
): { ok: true; entries: Scheduled<T>[] } | { ok: false; type: string; position: T['position'] } {
  if (validateLayoutCapacity(fixed, limits).length) throw new Error('Invalid fixed layout capacity');
  const occupied = new Set(fixed.map(entry => entry.type + ':' + tileIndex(entry.position)));
  const usage = [...fixed];
  const result: Scheduled<T>[] = [];
  for (const request of [...requests].sort(compareRequests)) {
    validateRequest(request, occupied);
    const capacity = limits[request.type];
    if (!Object.hasOwn(limits, request.type) || !capacity) throw new Error('Missing structure limits');
    validateLimits(capacity);
    const rcl = availableLevel(request, usage, capacity);
    if (rcl === undefined) return { ok: false, type: request.type, position: { ...request.position } };
    const entry = { ...request, position: { ...request.position }, rcl };
    usage.push(entry); result.push(entry);
  }
  return { ok: true, entries: result };
}
function compareRequests(a: StageRequest, b: StageRequest): number {
  return a.minimumRcl - b.minimumRcl || a.priority - b.priority || a.type.localeCompare(b.type)
    || tileIndex(a.position) - tileIndex(b.position);
}
function validateRequest(request: StageRequest, occupied: Set<string>): void {
  if (!Number.isInteger(request.minimumRcl) || request.minimumRcl < 1 || request.minimumRcl > 8
    || !Number.isFinite(request.priority)) throw new Error('Invalid stage request');
  const key = request.type + ':' + tileIndex(request.position);
  if (occupied.has(key)) throw new Error('Duplicate stage request');
  occupied.add(key);
}
function availableLevel(request: StageRequest, usage: readonly StagedTile[], capacity: readonly number[]): number | undefined {
  for (let level = request.minimumRcl; level <= 8; level++) {
    if (fitsFuture(request.type, level, usage, capacity)) return level;
  }
  return undefined;
}
function fitsFuture(type: string, level: number, usage: readonly StagedTile[], capacity: readonly number[]): boolean {
  for (let future = level; future <= 8; future++) {
    if (usage.filter(entry => entry.type === type && entry.rcl <= future).length >= capacity[future]!) return false;
  }
  return true;
}
