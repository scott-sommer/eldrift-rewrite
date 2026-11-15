import { openState, saveState } from '../../persistence/versioned-state';
import type { StatePort, StateSchema } from '../../persistence/versioned-state';
import { copyPlain } from '../../persistence/plain-data';
import { stateKey } from '../../persistence/state-key';
import { integer } from './plan-model';
import type { PlanState } from './plan-model';
import { planSchema } from './plan-state';
export interface PlanningRequestRecord {
  room: string; revision: number;
  request?: { identity: string; basePlan: PlanState };
}
/** Same request retains its original base plan even after its result commits. */
export function createPlanningRequestStore(port: StatePort, room: string, types: readonly string[]) {
  const key = stateKey('planning-requests', room), schema = requestSchema(room, types);
  function capture(expectedRevision: number, identity: string, basePlan: PlanState) {
    const current = openState(port, key, schema);
    if (current.revision !== expectedRevision) return { ok: false as const, reason: 'revision' as const };
    if (!identity) throw new Error('Missing planning request identity');
    if (current.request?.identity === identity) return { ok: true as const, reused: true, record: current };
    const record: PlanningRequestRecord = { room, revision: current.revision + 1, request: { identity, basePlan } };
    saveState(port, key, schema, record);
    return { ok: true as const, reused: false, record: copyPlain(record) };
  }
  function clear(expectedRevision: number) {
    const current = openState(port, key, schema);
    if (current.revision !== expectedRevision) return { ok: false as const, reason: 'revision' as const };
    const record: PlanningRequestRecord = { room, revision: current.revision + 1 };
    saveState(port, key, schema, record);
    return { ok: true as const, record };
  }
  return { capture, clear, read: () => openState(port, key, schema) };
}
function requestSchema(room: string, types: readonly string[]): StateSchema<PlanningRequestRecord> {
  const plans = planSchema(room, types);
  return { owner: 'planning-requests', version: 1, migrations: {}, initial: () => ({ room, revision: 0 }),
    valid(value: unknown): value is PlanningRequestRecord {
      if (!value || typeof value !== 'object') return false;
      const record = value as PlanningRequestRecord;
      if (record.room !== room || !integer(record.revision, 0, Number.MAX_SAFE_INTEGER)) return false;
      if (record.request === undefined) return true;
      return !!record.request && typeof record.request.identity === 'string' && record.request.identity.length > 0
        && plans.valid(record.request.basePlan);
    } };
}
