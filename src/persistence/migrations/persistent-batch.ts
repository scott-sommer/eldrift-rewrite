import { openState, saveState } from '../versioned-state';
import type { StatePort, StateSchema } from '../versioned-state';
import { runMigrationBatch } from '../migration-batch';
import type { MigrationPlan } from '../migration-batch';
interface Checkpoint { plan: string; keys: string[]; next: number }
function checkpointSchema(plan: MigrationPlan): StateSchema<Checkpoint> {
  return {
    owner: 'migrations', version: 1, migrations: {},
    initial: () => ({ plan: plan.id, keys: [...plan.keys], next: 0 }),
    valid(value: unknown): value is Checkpoint {
      if (!value || typeof value !== 'object') return false;
      const state = value as Partial<Checkpoint>;
      return state.plan === plan.id && Array.isArray(state.keys)
        && state.keys.length === plan.keys.length && state.keys.every((key, index) => key === plan.keys[index])
        && Number.isSafeInteger(state.next) && state.next! >= 0 && state.next! <= plan.keys.length;
    },
  };
}
/** Persists the ordered manifest as well as the cursor, rejecting changed plans. */
export function runPersistentMigration(port: StatePort, plan: MigrationPlan, maximum: number, canContinue: () => boolean) {
  if (!/^[a-zA-Z0-9_-]+$/.test(plan.id)) throw new Error('Invalid migration plan ID');
  if (new Set(plan.keys).size !== plan.keys.length) throw new Error('Duplicate migration record');
  const fixedPlan = { ...plan, keys: [...plan.keys] };
  const schema = checkpointSchema(fixedPlan);
  const key = `migrations/${plan.id}`;
  const state = openState(port, key, schema);
  return runMigrationBatch(fixedPlan, {
    read: () => ({ plan: state.plan, next: state.next }),
    write: progress => {
      saveState(port, key, schema, { ...state, next: progress.next });
    },
  }, maximum, canContinue);
}
