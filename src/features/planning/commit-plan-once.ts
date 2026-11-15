import type { createPlanStore, PlanProposal, CommitContext } from './plan-store';
import type { PlanState } from './plan-model';
import { copyPlain } from '../../persistence/plain-data';
/** Recover a completed write before its caller recorded completion, without writing again. */
export function commitPlanOnce(
  store: ReturnType<typeof createPlanStore>, expectedRevision: number, proposal: PlanProposal,
  context: CommitContext, validate: (plan: PlanState) => boolean,
) {
  if (proposal.provenance.observation !== context.observation || proposal.provenance.policy !== context.policy) {
    return { ok: false as const, reason: 'stale' };
  }
  const current = store.read();
  if (current.revision === expectedRevision) {
    const result = store.commit(expectedRevision, proposal, context, validate);
    return result.ok ? { ...result, recovered: false } : result;
  }
  if (current.revision !== expectedRevision + 1 || !matchesProposal(current, proposal)) {
    return { ok: false as const, reason: 'revision' };
  }
  return { ok: true as const, recovered: true, plan: current };
}
function matchesProposal(current: PlanState, proposal: PlanProposal): boolean {
  if (!current.provenance) return false;
  const expected = copyPlain({ strategy: proposal.strategy, entries: proposal.entries,
    provenance: { ...proposal.provenance, committedAt: current.provenance.committedAt } });
  return sameData({ strategy: current.strategy, entries: current.entries, provenance: current.provenance }, expected);
}
/** Plain data only; property order is irrelevant, but array order and every value are significant. */
function sameData(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const a = left as Record<string, unknown>, b = right as Record<string, unknown>;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && sameData(a[key], b[key]));
}
