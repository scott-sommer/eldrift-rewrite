import { validConstructionRetries } from './retries';
import type { ConstructionRetries } from './retries';
import { openState, saveState } from '../../persistence/versioned-state';
import type { StatePort, StateSchema } from '../../persistence/versioned-state';
import { stateKey } from '../../persistence/state-key';
import { copyPlain } from '../../persistence/plain-data';
interface ConstructionProgress { room: string; revision: number; identity: string | null; next: number; retries: ConstructionRetries }
export function createConstructionProgressStore(port: StatePort, room: string) {
  const key = stateKey('construction', room), schema = progressSchema(room);
  return { read: () => openState(port, key, schema),
    save(expectedRevision: number, identity: string, next: number, retries: ConstructionRetries = {}) {
      const current = openState(port, key, schema);
      if (current.revision !== expectedRevision) return { ok: false as const, reason: 'revision' };
      const record = { room, revision: current.revision + 1, identity, next, retries };
      saveState(port, key, schema, record);
      return { ok: true as const, record: copyPlain(record) };
    } };
}
function progressSchema(room: string): StateSchema<ConstructionProgress> {
  return { owner: 'construction', version: 2, migrations: { 1: value => ({ ...value as object, retries: {} }) },
    initial: () => ({ room, revision: 0, identity: null, next: 0, retries: {} }),
    valid(value: unknown): value is ConstructionProgress {
      if (!value || typeof value !== 'object') return false;
      const record = value as ConstructionProgress;
      return record.room === room && integer(record.revision) && integer(record.next) && record.next <= 10000
        && validIdentity(record.identity) && validConstructionRetries(record.retries);
    } };
}
function integer(value: number): boolean { return Number.isSafeInteger(value) && value >= 0; }
function validIdentity(value: string | null): boolean { return value === null || typeof value === 'string' && value.length > 0; }
