import { copyPlain } from './plain-data';
import type { StatePort } from './versioned-state';
/** Request-scoped consistent reads. Missing keys are captured too; callers cannot mutate another owner's state. */
export function createReadOnlyStateSnapshot(source: StatePort,maximumKeys = 256): StatePort {
  if (!Number.isSafeInteger(maximumKeys) || maximumKeys < 1) throw new Error('Invalid state snapshot bound');
  const values = new Map<string,unknown>();
  return { detachedReads: true,read(key) {
    if (!values.has(key)) {
      if (values.size >= maximumKeys) throw new Error('State snapshot key capacity');
      const value = source.read(key); values.set(key,value === undefined ? undefined : copyPlain(value));
    }
    const value = values.get(key); return value === undefined ? undefined : copyPlain(value);
  },write() { throw new Error('Read-only state snapshot'); } };
}
