import type { StateSchema } from '../../persistence/versioned-state';
import { integer, validEntry } from './plan-model';
import type { PlanState } from './plan-model';
export function planSchema(room: string, structureTypes: readonly string[]): StateSchema<PlanState> {
  const types = new Set(structureTypes);
  return {
    owner: 'planning', version: 1, migrations: {},
    initial: () => ({ room, revision: 0, strategy: null, entries: [] }),
    valid(value: unknown): value is PlanState {
      if (!value || typeof value !== 'object') return false;
      const state = value as Partial<PlanState>;
      if (state.room !== room || !integer(state.revision, 0, Number.MAX_SAFE_INTEGER)) return false;
      if (state.strategy !== null && typeof state.strategy !== 'string') return false;
      if (!Array.isArray(state.entries) || state.entries.length > 10000) return false;
      return state.entries.every(entry => validEntry(entry, types)) && uniqueEntries(state.entries);
    },
  };
}
function uniqueEntries(entries: PlanState['entries']): boolean {
  return new Set(entries.map(entry => `${entry.type}:${entry.x}:${entry.y}`)).size === entries.length;
}
