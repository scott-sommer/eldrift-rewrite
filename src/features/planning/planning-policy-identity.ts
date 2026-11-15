import type { PlanningRequestPolicy } from './planning-request';
import type { PlanEntry } from './plan-model';
/** Explicit tuples bind policy semantics independently of object serialization order. */
export function planningPolicyIdentity(policy: PlanningRequestPolicy, entries: readonly PlanEntry[]): string {
  const settings = [policy.strategy, policy.preserveExisting, [...new Set(policy.valuableTypes)].sort(),
    policy.constrainedAnchorLimit, policy.refreshRevision ?? 0];
  const operators = entries.map(entry => [entry.type, entry.x, entry.y, entry.rcl, entry.priority,
    entry.source, entry.tag ?? null, entry.objectId ?? null, [...(entry.dependencies ?? [])].sort()]);
  operators.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return 'planning-request-v3:' + JSON.stringify([settings, operators]);
}
