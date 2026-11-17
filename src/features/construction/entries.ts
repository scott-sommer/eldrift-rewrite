import { copyPlain } from '../../persistence/plain-data';
import { validEntry } from '../planning/plan-model';
import type { PlanEntry } from '../planning/plan-model';
import { placementKey, validDependencyGraph } from '../planning/dependencies';
/** Exact duplicates collapse; manual entries override generated metadata without changing placement identity. */
export function mergeConstructionEntries(entries: readonly PlanEntry[], types: ReadonlySet<string>): PlanEntry[] {
  const merged = new Map<string, PlanEntry>();
  for (const entry of entries) {
    if (!validEntry(entry, types)) throw new Error('Invalid construction plan entry');
    const key = placementKey(entry), previous = merged.get(key);
    if (!previous || preferEntry(previous, entry)) merged.set(key, copyPlain(entry));
  }
  const result = [...merged.values()].sort((a, b) => compare(placementKey(a), placementKey(b)));
  if (!validDependencyGraph(result)) throw new Error('Invalid construction dependencies');
  return result;
}
function preferEntry(previous: PlanEntry, next: PlanEntry): boolean {
  if (previous.source !== next.source) return next.source === 'operator';
  if (signature(previous) !== signature(next)) throw new Error('Conflicting construction plan duplicates');
  return false;
}
function signature(entry: PlanEntry): string {
  return JSON.stringify(Object.keys(entry).sort().map(key => {
    const value = entry[key as keyof PlanEntry];
    return [key, key === 'dependencies' && Array.isArray(value) ? [...value].sort() : value];
  }));
}
function compare(a: string, b: string): number { return a < b ? -1 : Number(a > b); }
