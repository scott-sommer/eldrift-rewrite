import { selectLayout } from '../../capabilities/planning/selection';
import { copyPlain } from '../../persistence/plain-data';
import { planningJobState } from './planning-job-state';
import type { PlanningCandidate, PlanningJobCheckpoint, PlanningJobInput } from './planning-job-model';
import type { PlanProposal } from './plan-store';
/** Advances candidate evaluation only. Committing a selected proposal remains a separate guarded operation. */
export function advancePlanningJob(
  input: PlanningJobInput, previous: PlanningJobCheckpoint | undefined,
  maximumSteps: number, canContinue: () => boolean = () => true,
) {
  if (!Number.isSafeInteger(maximumSteps) || maximumSteps < 0) throw new Error('Invalid planning step budget');
  const checkpoint = planningJobState(input, previous);
  let steps = 0;
  while (checkpoint.next < input.source.count && steps < maximumSteps && canContinue()) {
    evaluateNext(input, checkpoint);
    steps++;
  }
  if (checkpoint.next < input.source.count) return { done: false as const, checkpoint, steps };
  const proposals = retainedProposals(checkpoint);
  if (proposals.some(proposal => !input.validate(copyPlain(proposal)))) {
    return { done: true as const, checkpoint, steps, reason: 'invalidated-selection' as const };
  }
  const selected = selectLayout(proposals.map(scored), input.weights, () => true, input.previousId, input.minimumImprovement);
  const proposal = proposals.find(item => item.provenance.candidateId === selected?.id);
  return { done: true as const, checkpoint, steps,
    ...(proposal ? { proposal: copyPlain(proposal), ranking: selected } : { reason: 'no-valid-candidate' as const }) };
}
function evaluateNext(input: PlanningJobInput, state: PlanningJobCheckpoint): void {
  const candidate = copyPlain(input.source.at(state.next));
  if (!candidate.id || state.seen.includes(candidate.id)) throw new Error('Duplicate or missing planning candidate');
  if (state.pending && state.pending.id !== candidate.id) throw new Error('Changed pending candidate');
  const result = input.step(copyPlain(candidate), state.pending?.checkpoint);
  if (result.status === 'pending') {
    state.pending = { id: candidate.id, checkpoint: copyPlain(result.checkpoint) };
    return;
  }
  if (result.status === 'complete') retainProposal(input, state, candidate, result.proposal);
  else {
    if (!result.reason) throw new Error('Missing rejection reason');
    state.rejected++;
    state.lastRejection = { id: candidate.id, reason: result.reason };
  }
  state.seen.push(candidate.id);
  state.next++;
  delete state.pending;
}
function retainProposal(input: PlanningJobInput, state: PlanningJobCheckpoint, candidate: PlanningCandidate, value: PlanProposal): void {
  const proposal = copyPlain(value);
  validateCandidateProposal(input, candidate, proposal);
  if (!input.validate(copyPlain(proposal))) throw new Error('Evaluator returned an invalid proposal');
  const contenders = state.best ? [state.best, proposal] : [proposal];
  const best = selectLayout(contenders.map(scored), input.weights, () => true, undefined, 0)!;
  state.best = contenders.find(item => item.provenance.candidateId === best.id)!;
  if (candidate.id === input.previousId) state.previous = proposal;
}
function retainedProposals(state: PlanningJobCheckpoint): PlanProposal[] {
  const proposals = state.best ? [state.best] : [];
  if (state.previous && state.previous.provenance.candidateId !== state.best?.provenance.candidateId) proposals.push(state.previous);
  return proposals;
}
function scored(proposal: PlanProposal) {
  return { id: proposal.provenance.candidateId, costs: proposal.provenance.costs };
}

function validateCandidateProposal(input: PlanningJobInput, candidate: PlanningCandidate, proposal: PlanProposal): void {
  const provenance = proposal.provenance;
  if (proposal.strategy !== candidate.strategy || provenance.candidateId !== candidate.id
    || provenance.observation !== input.observation || provenance.policy !== input.policy
    || provenance.transform !== candidate.transform
    || provenance.anchor.x !== candidate.anchor.x || provenance.anchor.y !== candidate.anchor.y) {
    throw new Error('Proposal does not match planning candidate');
  }
}
