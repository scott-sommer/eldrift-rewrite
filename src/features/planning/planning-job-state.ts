import { integer } from './plan-model';
import { copyPlain } from '../../persistence/plain-data';
import { scoreDimensions } from '../../capabilities/planning/selection';
import type { PlanningJobCheckpoint, PlanningJobInput } from './planning-job-model';
export function planningJobState(input: PlanningJobInput, previous?: PlanningJobCheckpoint): PlanningJobCheckpoint {
  validateInput(input);
  const signature = JSON.stringify([input.observation, input.policy, input.baseRevision, input.source.revision,
    input.source.count, input.weights, input.minimumImprovement, input.previousId ?? null]);
  if (!previous) return { version: 1, signature, next: 0, seen: [], rejected: 0 };
  const state = copyPlain(previous);
  if (state.version !== 1 || state.signature !== signature) throw new Error('Stale planning job');
  validateCursor(state, input.source.count);
  validateRetained(state, input);
  return state;
}
function validateCursor(state: PlanningJobCheckpoint, count: number): void {
  if (!integer(state.next, 0, count)) throw new Error('Invalid planning cursor');
  if (!Array.isArray(state.seen) || state.seen.length !== state.next) throw new Error('Invalid completed candidates');
  if (state.seen.some(id => !id) || new Set(state.seen).size !== state.seen.length) throw new Error('Invalid completed candidates');
  if (!integer(state.rejected, 0, state.next)) throw new Error('Invalid rejection count');
}
function validateRetained(state: PlanningJobCheckpoint, input: PlanningJobInput): void {
  for (const proposal of [state.best, state.previous]) {
    if (proposal && !state.seen.includes(proposal.provenance.candidateId)) throw new Error('Unknown retained candidate');
  }
  if (state.previous && state.previous.provenance.candidateId !== input.previousId) throw new Error('Invalid previous candidate');
  if (state.pending && (state.next === input.source.count || state.seen.includes(state.pending.id))) throw new Error('Invalid pending candidate');
}
function validateInput(input: PlanningJobInput): void {
  if (!input.observation || !input.policy || !input.source.revision) throw new Error('Missing planning identity');
  validateCounts(input.baseRevision, input.source.count);
  if (!Number.isFinite(input.minimumImprovement) || input.minimumImprovement < 0) throw new Error('Invalid switching threshold');
  if (!scoreDimensions.every(key => Number.isFinite(input.weights[key]) && input.weights[key] >= 0)) throw new Error('Invalid layout weights');
}
function validateCounts(revision: number, count: number): void {
  if (!Number.isSafeInteger(revision) || revision < 0) throw new Error('Invalid base plan revision');
  if (!Number.isSafeInteger(count) || count < 0 || count > 10000) throw new Error('Invalid candidate count');
}
