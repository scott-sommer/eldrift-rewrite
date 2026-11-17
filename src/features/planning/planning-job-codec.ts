import { copyPlain, parsePlain } from '../../persistence/plain-data';
import type { StateSchema } from '../../persistence/versioned-state';
import { planningJobSchema } from './planning-job-schema';
import type { PlanningJobRecord } from './planning-job-schema';
import type { PlanningJobCheckpoint } from './planning-job-model';
import type { PlanProposal } from './plan-store';
type StoredCheckpoint = Omit<PlanningJobCheckpoint, 'best' | 'previous'> & { best?: string; previous?: string };
export type StoredPlanningJobRecord = Omit<PlanningJobRecord, 'checkpoint'> & { checkpoint?: StoredCheckpoint };
/** Retained plans cross persistence as opaque JSON; only this owner decodes and validates them. */
export function createPlanningJobCodec(room: string, types: readonly string[]) {
  const domain = planningJobSchema(room, types);
  function encode(value: PlanningJobRecord) {
    const record = copyPlain(value);
    if (!domain.valid(record)) throw new Error('planning-jobs: invalid state data');
    const { checkpoint, ...header } = record;
    const stored: StoredPlanningJobRecord = { ...header, ...(checkpoint ? { checkpoint: encodeCheckpoint(checkpoint) } : {}) };
    return { record, stored };
  }
  function decode(value: StoredPlanningJobRecord): PlanningJobRecord {
    const { checkpoint, ...header } = value;
    const record = { ...header, ...(checkpoint ? { checkpoint: decodeCheckpoint(checkpoint) } : {}) };
    if (!domain.valid(record)) throw new Error('planning-jobs: invalid state data');
    return record;
  }
  const schema: StateSchema<StoredPlanningJobRecord> = {
    owner: domain.owner, version: 3, initial: () => ({ room, revision: 0 }),
    migrations: { 1: data => data, 2: data => encode(data as PlanningJobRecord).stored },
    valid(value: unknown): value is StoredPlanningJobRecord {
      if (!value || typeof value !== 'object') return false;
      const record = value as StoredPlanningJobRecord;
      if (!record.checkpoint) return domain.valid(record);
      const { best, previous, ...checkpoint } = record.checkpoint;
      return validPayload(best) && validPayload(previous) && domain.valid({ ...record, checkpoint });
    },
  };
  return { schema, encode, decode };
}
function encodeCheckpoint(value: PlanningJobCheckpoint): StoredCheckpoint {
  const { best, previous, ...checkpoint } = value;
  return { ...checkpoint, ...(best ? { best: encodeProposal(best) } : {}),
    ...(previous ? { previous: encodeProposal(previous) } : {}) };
}
function decodeCheckpoint(value: StoredCheckpoint): PlanningJobCheckpoint {
  const { best, previous, ...checkpoint } = value;
  return { ...checkpoint, ...(best === undefined ? {} : { best: parsePlain(best) as PlanProposal }),
    ...(previous === undefined ? {} : { previous: parsePlain(previous) as PlanProposal }) };
}
function validPayload(value: unknown): boolean {
  return value === undefined || typeof value === 'string' && value.length > 0 && value.length <= 2000000;
}
function encodeProposal(proposal: PlanProposal): string {
  const payload = JSON.stringify(proposal);
  if (!validPayload(payload)) throw new Error('planning-jobs: invalid retained proposal payload');
  return payload;
}
