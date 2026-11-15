import type { StateSchema } from '../../persistence/versioned-state';
import type { PlanningJobCheckpoint } from './planning-job-model';
import { integer } from './plan-model';
import { planSchema } from './plan-state';
export interface PlanningJobRecord { room: string; revision: number; checkpoint?: PlanningJobCheckpoint }
export function planningJobSchema(room: string, types: readonly string[]): StateSchema<PlanningJobRecord> {
  const plans = planSchema(room, types);
  return { owner: 'planning-jobs', version: 1, migrations: {},
    initial: () => ({ room, revision: 0 }),
    valid(value: unknown): value is PlanningJobRecord {
      if (!value || typeof value !== 'object') return false;
      const record = value as Partial<PlanningJobRecord>;
      if (record.room !== room || !integer(record.revision, 0, Number.MAX_SAFE_INTEGER)) return false;
      return record.checkpoint === undefined || validCheckpoint(record.checkpoint, plans);
    } };
}
function validCheckpoint(value: unknown, plans: ReturnType<typeof planSchema>): value is PlanningJobCheckpoint {
  if (!value || typeof value !== 'object') return false;
  const state = value as PlanningJobCheckpoint;
  if (state.version !== 1 || !text(state.signature) || !integer(state.next, 0, 10000)) return false;
  if (!validSeen(state.seen, state.next) || !integer(state.rejected, 0, state.next)) return false;
  return validPending(state) && validRejection(state)
    && [state.best, state.previous].every(proposal => validProposal(proposal, state.seen, plans));
}
function validSeen(value: unknown, count: number): value is string[] {
  return Array.isArray(value) && value.length === count && value.every(text) && new Set(value).size === count;
}
function validPending(state: PlanningJobCheckpoint): boolean {
  if (state.pending === undefined) return true;
  return !!state.pending && typeof state.pending === 'object' && text(state.pending.id)
    && !state.seen.includes(state.pending.id) && Object.hasOwn(state.pending, 'checkpoint');
}
function validRejection(state: PlanningJobCheckpoint): boolean {
  if (state.lastRejection === undefined) return true;
  return !!state.lastRejection && typeof state.lastRejection === 'object'
    && state.seen.includes(state.lastRejection.id) && text(state.lastRejection.reason) && state.rejected > 0;
}
function validProposal(value: unknown, seen: readonly string[], plans: ReturnType<typeof planSchema>): boolean {
  if (value === undefined) return true;
  if (!value || typeof value !== 'object') return false;
  const proposal = value as NonNullable<PlanningJobCheckpoint['best']>;
  if (!proposal.provenance || !seen.includes(proposal.provenance.candidateId)) return false;
  return plans.valid({ ...plans.initial(), ...proposal,
    provenance: { ...proposal.provenance, committedAt: proposal.provenance.generatedAt } });
}
function text(value: unknown): value is string { return typeof value === 'string' && value.length > 0; }
