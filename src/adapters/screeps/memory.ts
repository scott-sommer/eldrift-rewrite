import type { RemovableStatePort } from '../../persistence/versioned-state';
import { copyPlain } from '../../persistence/plain-data';
interface MemoryRoot { eldrift?: unknown }
interface Store { format: 1; records: Record<string, unknown> }
function store(root: MemoryRoot): Store {
  if (root.eldrift === undefined) root.eldrift = { format: 1, records: {} };
  const value = root.eldrift as Partial<Store> | null;
  if (!value || value.format !== 1 || !value.records || typeof value.records !== 'object' || Array.isArray(value.records)) throw new Error('Unsupported or corrupt Eldrift memory root');
  return value as Store;
}
function validKey(key: string): void {
  if (!/^[a-z][a-zA-Z0-9-]*\/(?:[a-zA-Z0-9_-]|%[0-9a-f]{4})+$/.test(key)) throw new Error(`Invalid state key: ${key}`);
}
export function createMemoryPort(memory: () => MemoryRoot): RemovableStatePort {
  return {
    read(key) {
      validKey(key);
      const records = store(memory()).records;
      return Object.hasOwn(records, key) ? copyPlain(records[key]) : undefined;
    },
    remove(key, owner) {
      validKey(key);
      const records = store(memory()).records;
      if (!Object.hasOwn(records, key)) return;
      const record = records[key];
      if (!record || typeof record !== 'object' || !('owner' in record) || record.owner !== owner) throw new Error('State deletion owner mismatch');
      delete records[key];
    },
    write(key, value) {
      validKey(key);
      const snapshot = copyPlain(value);
      store(memory()).records[key] = snapshot;
    },
  };
}

declare global {
  interface Memory { eldrift?: unknown }
}


