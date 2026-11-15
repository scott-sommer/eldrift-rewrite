import type { PlanningReceipt } from './planning-receipt';
import { copyPlain } from '../../persistence/plain-data';
import { openState, saveState } from '../../persistence/versioned-state';
import type { StatePort } from '../../persistence/versioned-state';
import { stateKey } from '../../persistence/state-key';
import { planningJobSchema } from './planning-job-schema';
import type { PlanningJobRecord } from './planning-job-schema';
import type { PlanningJobCheckpoint } from './planning-job-model';
/** Job progress has its own owner/revision and can never overwrite the committed plan namespace. */
export function createPlanningJobStore(port: StatePort, room: string, types: readonly string[]) {
  const key = stateKey('planning-jobs', room), schema = planningJobSchema(room, types);
  function write(expectedRevision: number, checkpoint?: PlanningJobCheckpoint) {
    const current = openState(port, key, schema);
    if (current.revision !== expectedRevision) return { ok: false as const, reason: 'revision' as const };
    if (checkpoint && current.checkpoint && checkpoint.signature !== current.checkpoint.signature) {
      return { ok: false as const, reason: 'identity' as const };
    }
    const record: PlanningJobRecord = { room, revision: current.revision + 1, ...(checkpoint ? { checkpoint } : {}) };
    saveState(port, key, schema, record);
    return { ok: true as const, record: copyPlain(record) };
  }
  function finish(expectedRevision: number, receipt: PlanningReceipt) {
    const current = openState(port, key, schema);
    if (current.revision !== expectedRevision) return { ok: false as const, reason: 'revision' as const };
    if (!current.checkpoint || current.checkpoint.signature !== receipt.signature || current.checkpoint.pending) {
      return { ok: false as const, reason: 'unfinished' as const };
    }
    const checkpoint = current.checkpoint;
    const diagnostics = { evaluated: checkpoint.next, rejected: checkpoint.rejected,
      ...(checkpoint.lastRejection ? { lastRejection: checkpoint.lastRejection } : {}) };
    const record: PlanningJobRecord = { room, revision: current.revision + 1, receipt: { ...receipt, diagnostics } };
    saveState(port, key, schema, record);
    return { ok: true as const, record: copyPlain(record) };
  }
  return { finish, read: () => openState(port, key, schema),
    save: (expectedRevision: number, checkpoint: PlanningJobCheckpoint) => write(expectedRevision, checkpoint),
    clear: (expectedRevision: number) => write(expectedRevision) };
}
