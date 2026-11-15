import { openState, saveState } from '../../persistence/versioned-state';
import type { StatePort } from '../../persistence/versioned-state';
import { copyPlain } from '../../persistence/plain-data';
import { stateKey } from '../../persistence/state-key';
import { planSchema } from './plan-state';
import type { PlanState } from './plan-model';
import type { PlanProvenance } from './plan-provenance';
export interface PlanProposal {
  strategy: string; entries: PlanState['entries']; provenance: Omit<PlanProvenance, 'committedAt'>;
}
export interface CommitContext { tick: number; observation: string; policy: string }
export function createPlanStore(port: StatePort, room: string, structureTypes: readonly string[]) {
  const key = stateKey('planning', room), schema = planSchema(room, structureTypes);
  return {
    read: () => openState(port, key, schema),
    commit(expectedRevision: number, proposal: PlanProposal, context: CommitContext, validate: (plan: PlanState) => boolean) {
      const current = openState(port, key, schema);
      if (current.revision !== expectedRevision) return { ok: false as const, reason: 'revision' };
      if (proposal.provenance.observation !== context.observation || proposal.provenance.policy !== context.policy) {
        return { ok: false as const, reason: 'stale' };
      }
      const candidate: PlanState = copyPlain({ room, revision: current.revision + 1, strategy: proposal.strategy,
        entries: proposal.entries, provenance: { ...proposal.provenance, committedAt: context.tick } });
      if (!schema.valid(candidate)) return { ok: false as const, reason: 'schema' };
      if (!preservesOperatorEntries(current, candidate)) return { ok: false as const, reason: 'operator-entry' };
      if (!validate(copyPlain(candidate))) return { ok: false as const, reason: 'validation' };
      if (openState(port, key, schema).revision !== expectedRevision) return { ok: false as const, reason: 'revision' };
      saveState(port, key, schema, candidate);
      return { ok: true as const, plan: copyPlain(candidate) };
    },
  };
}
function preservesOperatorEntries(current: PlanState, candidate: PlanState): boolean {
  return current.entries.filter(entry => entry.source === 'operator').every(entry =>
    candidate.entries.some(next => next.source === 'operator' && next.type === entry.type && next.x === entry.x && next.y === entry.y));
}
