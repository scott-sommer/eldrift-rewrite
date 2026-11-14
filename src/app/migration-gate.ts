import { runPersistentMigration } from '../persistence/migrations/persistent-batch';
import type { MigrationPlan } from '../persistence/migration-batch';
import type { StatePort } from '../persistence/versioned-state';
interface MigrationBudget {
  clock(): { tick: number; tickLimit: number };
  usedCpu(): number;
}
export function createMigrationGate(state: StatePort, plans: readonly MigrationPlan[], budget: MigrationBudget, maximum = 10) {
  if (!Number.isSafeInteger(maximum) || maximum < 1) throw new Error('Invalid migration record limit');
  if (new Set(plans.map(plan => plan.id)).size !== plans.length) throw new Error('Duplicate migration plan ID');
  const registry = plans.map(plan => ({ ...plan, keys: [...plan.keys] }));
  let lastTick: number | undefined;
  let ready = false;
  return (): boolean => {
    const clock = budget.clock();
    if (lastTick === clock.tick) return ready;
    lastTick = clock.tick;
    ready = false;
    let remaining = maximum;
    for (const plan of registry) {
      const result = runPersistentMigration(state, plan, remaining, () => budget.usedCpu() < clock.tickLimit * 0.5);
      remaining -= result.processed;
      if (!result.complete) return false;
    }
    ready = true;
    return true;
  };
}
