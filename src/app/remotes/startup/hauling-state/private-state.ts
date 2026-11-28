import { copyPlain } from '../../../../core/plain-data';
import type { Envelope, StatePort, StateSchema } from '../../../../persistence/versioned-state';
/** Forecast writes have no reference to live owner storage. Reads and writes are detached. */
export interface PrivateHaulingRecord { key: string; value: Envelope }
// At most64 selected actors: task, journal and bounded uncertainty archive each, plus four shared owners.
const MAX_RECORDS = 64*3+4;
export function privateHaulingState(initial: readonly PrivateHaulingRecord[] = []) {
  validateRecords(initial);
  const records = new Map(copyPlain([...initial]).map(record => [record.key,record.value]));
  return {
    detachedReads: true as const,
    checkpoint: () => copyPlain([...records].map(([key,value]) => ({ key,value }))),
    read(key: string) { const value = records.get(key); return value === undefined ? undefined : copyPlain(value); },
    write(key: string, value: Envelope) {
      if (!records.has(key) && records.size >= MAX_RECORDS) throw new Error('Forecast state capacity exceeded');
      records.set(key, copyPlain(value));
    },
  };
}
export function seedHaulingRecord<T>(state: StatePort, key: string, schema: StateSchema<T>, data: T): void {
  if (!schema.valid(data)) throw new Error('Invalid forecast seed: '+key);
  state.write(key, { owner: schema.owner,version: schema.version,data });
}

function validateRecords(records: readonly PrivateHaulingRecord[]): void {
  if (!Array.isArray(records) || records.length > MAX_RECORDS || new Set(records.map(record => record.key)).size !== records.length) throw new Error('Invalid private state checkpoint');
  for (const record of records) validateRecord(record);
}
function validateRecord({ key,value }: PrivateHaulingRecord): void {
  if (typeof key !== 'string' || !key || !value || typeof value.owner !== 'string' || !value.owner) throw new Error('Invalid private state identity');
  if (!Number.isSafeInteger(value.version) || value.version < 0 || !Object.hasOwn(value,'data')) throw new Error('Invalid private state envelope');
}
