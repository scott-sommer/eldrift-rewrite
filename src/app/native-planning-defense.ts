import type { CandidateDefense } from '../features/planning/candidate-defense';
import type { StatePort } from '../persistence/versioned-state';
import type { AssessmentInput } from '../capabilities/planning/assessment-model';
import type { createPlanningDefenseCache } from './planning-defense-cache';
export interface NativeDefensePolicy {
  revision: string;
  prepare(state: StatePort, observation: AssessmentInput): CandidateDefense;
}
/** Defer search preparation until the defense phase is actually admitted. */
export function nativePlanningDefense(
  policy: NativeDefensePolicy | undefined, state: StatePort, observation: AssessmentInput,
  identity: string, cache: ReturnType<typeof createPlanningDefenseCache>,
): { defense?: CandidateDefense } {
  if (!policy) return {};
  return { defense: { revision: policy.revision, advance(candidate, entries, checkpoint, guard) {
    if (!guard()) return { status: 'pending', checkpoint };
    const defense = cache(identity, () => {
      const prepared = policy.prepare(state, observation);
      if (prepared.revision !== policy.revision) throw new Error('Native defense revision mismatch');
      return prepared;
    });
    return defense.advance(candidate, entries, checkpoint, guard);
  } } };
}
