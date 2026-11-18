import { openState, peekState, saveState } from '../../persistence/versioned-state';
import type { StatePort, StateSchema } from '../../persistence/versioned-state';
import { roomCoordinates } from '../../core/geometry/room-grid';
export interface CaptureProgress { revision: number; cursor: string | null }
function validCursor(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== 'string') return false;
  try { roomCoordinates(value); return true; } catch { return false; }
}
const schema: StateSchema<CaptureProgress> = {
  owner: 'intel-capture', version: 1, initial: () => ({ revision: 0, cursor: null }), migrations: {},
  valid: (value): value is CaptureProgress => !!value && typeof value === 'object'
    && 'revision' in value && Number.isSafeInteger(value.revision) && Number(value.revision) >= 0
    && 'cursor' in value && validCursor(value.cursor),
};
export function createCaptureProgressStore(port: StatePort) {
  const key = 'intel-capture/empire';
  const read = () => peekState(port, key, schema) ?? schema.initial();
  return {
    read,
    save(expected: number, cursor: string): boolean {
      if (!validCursor(cursor)) throw new Error('Invalid capture cursor');
      const current = read();
      if (current.revision !== expected) return false;
      if (current.cursor === cursor) return true;
      if (!Number.isSafeInteger(expected + 1)) throw new Error('Capture revision exhausted');
      openState(port, key, schema);
      saveState(port, key, schema, { revision: expected + 1, cursor });
      return true;
    },
  };
}
