import { copyPlain } from '../../../../core/plain-data';
import type { Envelope, StatePort, StateSchema } from '../../../../persistence/versioned-state';
/** Forecast writes have no reference to live owner storage. Reads and writes are detached. */
export function privateHaulingState(): StatePort {
  const records = new Map<string, Envelope>();
  return {
    detachedReads: true,
    read(key) { const value = records.get(key); return value === undefined ? undefined : copyPlain(value); },
    write(key, value) {
      if (!records.has(key) && records.size >= 132) throw new Error('Forecast state capacity exceeded');
      records.set(key, copyPlain(value));
    },
  };
}
export function seedHaulingRecord<T>(state: StatePort, key: string, schema: StateSchema<T>, data: T): void {
  if (!schema.valid(data)) throw new Error('Invalid forecast seed: '+key);
  state.write(key, { owner: schema.owner,version: schema.version,data });
}
