import { compactEnumeration, expandEnumeration } from './compact-enumeration';
import { enumerateCompactCandidates } from './compact-candidate-enumeration';
import type { CandidateSeeds } from '../../capabilities/planning/standard-candidates';
import type { AnchorOptions } from '../../capabilities/planning/constrained-anchors';
import type { CandidateCheckpoint } from '../../capabilities/planning/candidate-batch';
import type { PlanningCandidate } from './planning-job-model';
export interface EnumerationOptions { standard?: CandidateSeeds; constrained?: AnchorOptions; stamps?: AnchorOptions }
export interface EnumerationCheckpoint {
  version: 1; signature: string; candidates: PlanningCandidate[];
  standard?: CandidateCheckpoint; constrained?: CandidateCheckpoint; stamps?: CandidateCheckpoint;
}
export function enumeratePlanningCandidates(
  options: EnumerationOptions, previous: EnumerationCheckpoint | undefined,
  maximumAttempts: number, canContinue: () => boolean = () => true,
) {
  const result = enumerateCompactCandidates(options, previous ? compactEnumeration(previous) : undefined, maximumAttempts, canContinue);
  return { ...result, checkpoint: expandEnumeration(result.checkpoint) };
}
export { enumerationSignature } from './enumeration-identity';
