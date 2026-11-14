export interface MigrationProgress {
  plan: string;
  next: number;
}
export interface MigrationPlan {
  id: string;
  keys: readonly string[];
  migrate(key: string): void;
}
export interface ProgressPort {
  read(): MigrationProgress | undefined;
  write(progress: MigrationProgress): void;
}
export function runMigrationBatch(plan: MigrationPlan, progress: ProgressPort, maximum: number, canContinue: () => boolean) {
  if (!Number.isSafeInteger(maximum) || maximum < 0) throw new Error('Invalid migration batch size');
  const state = progress.read() ?? { plan: plan.id, next: 0 };
  if (state.plan !== plan.id) throw new Error('Migration plan changed');
  if (!Number.isSafeInteger(state.next) || state.next < 0 || state.next > plan.keys.length) throw new Error('Corrupt migration cursor');
  let next = state.next;
  let processed = 0;
  while (next < plan.keys.length && processed < maximum && canContinue()) {
    const key = plan.keys[next]!;
    // Per-record migration must be idempotent: a reset can occur before checkpointing.
    plan.migrate(key);
    next++;
    progress.write({ plan: plan.id, next });
    processed++;
  }
  return { processed, next, complete: next === plan.keys.length };
}
