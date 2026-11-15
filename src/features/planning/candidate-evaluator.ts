import { evaluateDraftBatch } from '../../capabilities/planning/evaluate-draft-batch';
import type { EvaluateDraftInput } from '../../capabilities/planning/evaluate-draft';
import type { DraftRouteCheckpoint } from '../../capabilities/planning/draft-route-batch';
import type { StagedTile } from '../../capabilities/planning/template';
import type { ProposalInput } from './plan-proposal';
import { createPlanProposal } from './plan-proposal';
import type { PlanningCandidate, CandidateStep } from './planning-job-model';
import type { LayoutStrategy } from './layout-strategies';
import { copyPlain } from '../../persistence/plain-data';
export interface CandidateEvaluatorOptions {
  observation: string; policy: string; searchRevision: string;
  strategies: Readonly<Record<string, LayoutStrategy>>;
  maximumSearches: number; canContinue: () => boolean; tick: () => number;
  prepareScore: (candidate: PlanningCandidate, entries: readonly StagedTile[]) => EvaluateDraftInput;
}
interface Progress {
  version: 1; signature: string; phase: 'draft' | 'score';
  checkpoint?: unknown; entries?: StagedTile[];
}
export function createCandidateEvaluator(options: CandidateEvaluatorOptions) {
  if (!Number.isSafeInteger(options.maximumSearches) || options.maximumSearches < 0) throw new Error('Invalid evaluator search budget');
  if (!options.observation || !options.policy || !options.searchRevision) throw new Error('Missing evaluator identity');
  return (candidate: PlanningCandidate, saved: unknown): CandidateStep => {
    const strategy = Object.hasOwn(options.strategies, candidate.strategy) ? options.strategies[candidate.strategy] : undefined;
    if (!strategy) return { status: 'rejected', reason: 'unsupported-strategy:' + candidate.strategy };
    if (!strategy.version) throw new Error('Missing strategy version');
    const signature = JSON.stringify([candidate, strategy.version, options.observation, options.policy, options.searchRevision]);
    const progress = restoreProgress(signature, saved);
    if (progress.phase === 'score') return scoreCandidate(options, candidate, strategy.version, progress);
    const result = strategy.advance(copyPlain(candidate), signature, progress.checkpoint, options.maximumSearches, options.canContinue);
    if (result.status === 'rejected') return result;
    return { status: 'pending', checkpoint: copyPlain(result.status === 'complete'
      ? { version: 1, signature, phase: 'score', entries: result.entries }
      : { version: 1, signature, phase: 'draft', checkpoint: result.checkpoint }) };
  };
}
function restoreProgress(signature: string, saved: unknown): Progress {
  if (saved === undefined) return { version: 1, signature, phase: 'draft' };
  const progress = copyPlain(saved) as Progress;
  if (!progress || progress.version !== 1 || progress.signature !== signature) throw new Error('Stale candidate evaluation');
  if (progress.phase !== 'draft' && progress.phase !== 'score') throw new Error('Invalid evaluation phase');
  if (progress.phase === 'score' && !Array.isArray(progress.entries)) throw new Error('Missing score placements');
  return progress;
}
function scoreCandidate(
  options: CandidateEvaluatorOptions, candidate: PlanningCandidate, version: string, progress: Progress,
): CandidateStep {
  const input = options.prepareScore(copyPlain(candidate), copyPlain(progress.entries!));
  const result = evaluateDraftBatch(input, progress.signature, progress.checkpoint as DraftRouteCheckpoint | undefined,
    options.maximumSearches, options.canContinue);
  if (!result.ok) return { status: 'rejected', reason: JSON.stringify(result) };
  if (!result.done) return { status: 'pending', checkpoint: { ...progress, checkpoint: result.checkpoint } };
  return proposalStep({ strategy: candidate.strategy, entries: input.entries,
    provenance: { candidateId: candidate.id, strategyVersion: version, observation: options.observation,
      policy: options.policy, generatedAt: options.tick(), anchor: candidate.anchor, transform: candidate.transform, costs: result.costs } });
}

function proposalStep(input: ProposalInput): CandidateStep {
  try { return { status: 'complete', proposal: createPlanProposal(input) }; }
  catch (error) { return { status: 'rejected', reason: 'proposal:' + String(error) }; }
}
