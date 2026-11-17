import type { PlanningCandidate, CandidateStep } from './planning-job-model';
import type { CandidateProgress } from './candidate-progress';
import { saveCandidateProgress } from './candidate-progress';
import type { StagedTile } from '../../capabilities/planning/template';
import type { StrategyStep } from './layout-strategies';
import { copyPlain } from '../../persistence/plain-data';
export interface CandidateDefense {
  revision: string;
  advance(candidate: PlanningCandidate, entries: readonly StagedTile[], checkpoint: unknown, guard: () => boolean): StrategyStep;
}
/** Defense owns opaque progress; a scored proposal is impossible before its geometry completes. */
export function advanceCandidateDefense(
  defense: CandidateDefense | undefined, candidate: PlanningCandidate, progress: CandidateProgress, guard: () => boolean,
): CandidateStep {
  if (!defense) throw new Error('Missing candidate defense stage');
  if (!guard()) return { status: 'pending', checkpoint: saveCandidateProgress(progress) };
  const result = defense.advance(copyPlain(candidate), copyPlain(progress.entries!), copyPlain(progress.checkpoint ?? null), guard);
  if (result.status === 'rejected') return result;
  return { status: 'pending', checkpoint: saveCandidateProgress(result.status === 'complete'
    ? { signature: progress.signature, phase: 'score', entries: result.entries }
    : { ...progress, checkpoint: result.checkpoint }) };
}
