import { validProvenance } from './plan-provenance';
import { validDependencyGraph } from './dependencies';
import type { StateSchema } from '../../persistence/versioned-state';
import { integer, validEntry } from './plan-model';
import type { PlanState } from './plan-model';
export function planSchema(room: string, structureTypes: readonly string[]): StateSchema<PlanState> {
  const types = new Set(structureTypes);
  return {
    owner: 'planning', version: 3, migrations: { 1: data => data, 2: data => data },
    initial: () => ({ room, revision: 0, strategy: null, entries: [] }),
    valid(value: unknown): value is PlanState {
      if (!value || typeof value !== 'object') return false;
      const state = value as Partial<PlanState>;
      if (state.room !== room || !integer(state.revision, 0, Number.MAX_SAFE_INTEGER)) return false;
      if (state.strategy !== null && typeof state.strategy !== 'string') return false;
      if (!Array.isArray(state.entries) || state.entries.length > 10000) return false;
      return validEntries(state.entries, types)
        && optionalProvenance(state);
    },
  };
}
function uniqueEntries(entries: PlanState['entries']): boolean {
  return new Set(entries.map(entry => `${entry.type}:${entry.x}:${entry.y}`)).size === entries.length;
}

function validEntries(entries: PlanState['entries'], types: ReadonlySet<string>): boolean {
  return entries.every(entry => validEntry(entry, types)) && uniqueEntries(entries) && validDependencyGraph(entries);
}

function optionalProvenance(state: Partial<PlanState>): boolean {
  if (state.provenance === undefined) return true;
  return typeof state.strategy === 'string' && state.strategy.length > 0 && validProvenance(state.provenance, state.entries!);
}
