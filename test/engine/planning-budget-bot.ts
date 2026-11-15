import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import type { Envelope } from '../../src/persistence/versioned-state';
interface Progress { revision?: number; checkpoint?: { candidates?: unknown[]; next?: number; pending?: unknown }; receipt?: { outcome: string } }
export function loop() {
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { planningEnabled: true };
  saveState(state, 'operator/config', operatorSchema, settings);
  const start = Game.cpu.getUsed();
  botLoop();
  const used = Game.cpu.getUsed() - start;
  const read = (key: string) => (state.read(key + '/W0N1') as Envelope | undefined)?.data as Progress | undefined;
  const candidates = read('planning-candidates'), job = read('planning-jobs');
  const memory = Memory as Memory & { planningBudgetRows?: unknown[] };
  (memory.planningBudgetRows ??= []).push({ tick: Game.time, used, candidates: candidates?.checkpoint?.candidates?.length ?? 0,
    jobRevision: job?.revision ?? 0, next: job?.checkpoint?.next ?? 0, pending: !!job?.checkpoint?.pending,
    outcome: job?.receipt?.outcome ?? null });
}
