import { tileIndex } from '../../core/geometry/local-grid';
import type { StagedTile } from './template';
import type { StructureLimits } from './core-model';
import { validateLimits } from './staging';
export type CapacityFailure =
  | { reason: 'unknown-type'; type: string }
  | { reason: 'duplicate'; type: string; index: number }
  | { reason: 'invalid-rcl'; type: string; rcl: number }
  | { reason: 'capacity'; type: string; rcl: number; actual: number; limit: number };
/** Counts the combined desired layout, not each contributing module in isolation. */
export function validateLayoutCapacity(entries: readonly StagedTile[], limits: StructureLimits): CapacityFailure[] {
  const failures: CapacityFailure[] = [];
  const groups = new Map<string, StagedTile[]>();
  const seen = new Set<string>();
  for (const entry of entries) {
    const index = tileIndex(entry.position), key = entry.type + ':' + index;
    if (seen.has(key)) failures.push({ reason: 'duplicate', type: entry.type, index });
    seen.add(key);
    if (!Number.isInteger(entry.rcl) || entry.rcl < 1 || entry.rcl > 8) {
      failures.push({ reason: 'invalid-rcl', type: entry.type, rcl: entry.rcl });
      continue;
    }
    const group = groups.get(entry.type) ?? [];
    group.push(entry);
    groups.set(entry.type, group);
  }
  for (const [type, group] of groups) failures.push(...typeFailures(type, group, limits));
  return failures;
}
function typeFailures(type: string, entries: readonly StagedTile[], limits: StructureLimits): CapacityFailure[] {
  const capacity = Object.hasOwn(limits, type) ? limits[type] : undefined;
  if (!capacity) return [{ reason: 'unknown-type', type }];
  validateLimits(capacity);
  const failures: CapacityFailure[] = [];
  for (let rcl = 1; rcl <= 8; rcl++) {
    const actual = entries.filter(entry => entry.rcl <= rcl).length;
    if (actual > capacity[rcl]!) failures.push({ reason: 'capacity', type, rcl, actual, limit: capacity[rcl]! });
  }
  return failures;
}
