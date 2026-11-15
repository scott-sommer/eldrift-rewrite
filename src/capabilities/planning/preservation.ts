import { tileIndex } from '../../core/geometry/local-grid';
import type { Infrastructure, PlanningConstraint } from './assessment-model';
import type { PlacedTile } from './template';
export interface ConstraintFailure {
  id: string; reason: 'missing-lock' | 'occupied-clearance';
}
/** Caller chooses valuable types; only owned observed structures become automatic locks. */
export function preservationLocks(
  structures: readonly Infrastructure[], valuableTypes: ReadonlySet<string>,
): PlanningConstraint[] {
  return structures.filter(item => item.owned && valuableTypes.has(item.type)).map(item => ({
    id: 'preserve:' + item.id, kind: 'locked' as const, type: item.type, position: { ...item.position },
  })).sort((a, b) => a.id.localeCompare(b.id));
}
/** A lock requires the exact type/tile in the desired plan, not merely a nearby replacement. */
export function validatePlanningConstraints(
  placements: readonly PlacedTile[], constraints: readonly PlanningConstraint[],
): ConstraintFailure[] {
  const occupied = new Map<number, Set<string>>();
  for (const entry of placements) {
    const index = tileIndex(entry.position), types = occupied.get(index) ?? new Set<string>();
    types.add(entry.type);
    occupied.set(index, types);
  }
  const failures: ConstraintFailure[] = [];
  for (const constraint of [...constraints].sort((a, b) => a.id.localeCompare(b.id))) {
    const types = occupied.get(tileIndex(constraint.position));
    if (constraint.kind === 'locked') {
      if (!constraint.type) throw new Error('Locked constraint requires a structure type');
      if (!types?.has(constraint.type)) failures.push({ id: constraint.id, reason: 'missing-lock' });
    } else if (types?.size) failures.push({ id: constraint.id, reason: 'occupied-clearance' });
  }
  return failures;
}
