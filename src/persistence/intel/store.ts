import { openState, saveState } from '../versioned-state';
import type { StatePort } from '../versioned-state';
import { intelSchema } from './schema';
import type { IntelRecord } from './schema';
export function createIntelStore(port: StatePort) {
  return {
    read(room: string, tick: number) {
      const record = openState(port, `intel/${room}`, intelSchema);
      return { record, visible: record.lastSeen === tick, age: record.lastSeen === null ? null : Math.max(0, tick - record.lastSeen) };
    },
    observe(room: string, record: IntelRecord): void {
      const key = `intel/${room}`;
      const current = openState(port, key, intelSchema);
      if (record.lastSeen === null) throw new Error('Observation requires a tick');
      if (current.lastSeen !== null && record.lastSeen < current.lastSeen) throw new Error('Observation is older than stored intel');
      saveState(port, key, intelSchema, record);
    },
  };
}
