import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import type { Envelope } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { planningEnabled: Game.time >= 3 && Game.time <= 6, planningCpuBudget: 100,
    planningCandidateAttempts: 1, planningEvaluationSteps: 0, layoutStrategy: 'constrained', planningAnchorLimit: 1 };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const saved = state.read('planning-candidates/W0N1') as Envelope | undefined;
  const data = saved?.data as { checkpoint?: { candidates: unknown[] }; revision: number } | undefined;
  const memory = Memory as Memory & { planningRuntimeRows?: unknown[] };
  (memory.planningRuntimeRows ??= []).push({ tick: Game.time, initialized: !!saved,
    revision: data?.revision ?? 0, candidates: data?.checkpoint?.candidates.length ?? 0 });
}
