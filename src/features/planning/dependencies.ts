import type { PlanEntry } from './plan-model';
export function placementKey(entry: Pick<PlanEntry, 'type' | 'x' | 'y'>): string {
  return entry.type + ':' + entry.x + ':' + entry.y;
}
/** Kahn traversal avoids recursion limits on large plans; references must be within the plan. */
export function validDependencyGraph(entries: readonly PlanEntry[]): boolean {
  const pending = new Map(entries.map(entry => [placementKey(entry), entry.dependencies?.length ?? 0]));
  const dependents = indexDependents(entries, pending);
  if (!dependents) return false;
  const ready = [...pending.keys()].filter(key => pending.get(key) === 0);
  for (let index = 0; index < ready.length; index++) {
    for (const child of dependents.get(ready[index]!) ?? []) {
      const count = pending.get(child)! - 1; pending.set(child, count);
      if (count === 0) ready.push(child);
    }
  }
  return ready.length === entries.length;
}
export function blockedPlanPlacements(entries: readonly PlanEntry[], completed: ReadonlySet<string>, level: number): ReadonlySet<string> {
  return new Set(entries.filter(entry => entry.rcl > level || (entry.dependencies ?? []).some(key => !completed.has(key))).map(placementKey));
}

function indexDependents(entries: readonly PlanEntry[], pending: ReadonlyMap<string, number>): Map<string, string[]> | undefined {
  const dependents = new Map<string, string[]>();
  for (const entry of entries) {
    for (const dependency of entry.dependencies ?? []) {
      if (!pending.has(dependency)) return undefined;
      const children = dependents.get(dependency) ?? [];
      children.push(placementKey(entry)); dependents.set(dependency, children);
    }
  }
  return dependents;
}
