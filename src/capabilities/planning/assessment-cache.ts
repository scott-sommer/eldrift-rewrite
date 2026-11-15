import { assessRoom } from './assessment';
import type { AssessmentInput } from './assessment-model';
export type AssessmentProvider = typeof assessRoom;
/** Caller-owned, single-observation heap cache. A runtime reload simply rebuilds it. */
export function createAssessmentCache(assess: AssessmentProvider = assessRoom): AssessmentProvider {
  let cached: { signature: string; value: ReturnType<AssessmentProvider> } | undefined;
  return (input: AssessmentInput) => {
    const signature = JSON.stringify(input);
    if (cached?.signature === signature) return cached.value;
    const value = assess(input);
    freezeAssessment(value);
    cached = { signature, value };
    return value;
  };
}
/** Assessment output is plain, acyclic data; freezing prevents one consumer corrupting later reads. */
function freezeAssessment(value: unknown): void {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return;
  for (const child of Object.values(value)) freezeAssessment(child);
  Object.freeze(value);
}
