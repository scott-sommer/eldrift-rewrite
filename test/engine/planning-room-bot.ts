import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import type { Envelope } from '../../src/persistence/versioned-state';
import { createPlanningJobStore } from '../../src/features/planning/planning-job-store';
import type { PlanState } from '../../src/features/planning/plan-model';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { planningEnabled: true, planningCpuBudget: 100, planningCandidateAttempts: 1000,
    planningEvaluationSteps: 20, planningSearches: 4, planningDefenseScans: 100000, planningDefenseAugmentations: 4 };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const job = createPlanningJobStore(state, 'W0N1', Object.keys(CONTROLLER_STRUCTURES)).read();
  const plan = (state.read('planning/W0N1') as Envelope | undefined)?.data as PlanState | undefined;
  const candidates = (state.read('planning-candidates/W0N1') as Envelope | undefined)?.data as { checkpoint?: { candidates: string[] } } | undefined;
  const memory = Memory as Memory & { planningRoomRows?: unknown[] };
  (memory.planningRoomRows ??= []).push({ tick: Game.time, candidates: candidates?.checkpoint?.candidates.length ?? 0,
    next: job?.checkpoint?.next ?? null, rejected: job?.checkpoint?.rejected ?? null,
    lastRejection: job?.checkpoint?.lastRejection?.reason.slice(0, 300) ?? null,
    pending: job?.checkpoint?.pending?.id ?? null, best: job?.checkpoint?.best?.provenance.candidateId ?? null,
    outcome: job?.receipt?.outcome ?? null, revision: plan?.revision ?? 0,
    sites: Game.rooms.W0N1!.find(FIND_MY_CONSTRUCTION_SITES).length });
}
