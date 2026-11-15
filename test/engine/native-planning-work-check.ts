import { createNativePlanningWork } from '../../src/app/native-planning-work';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { resolveConfig } from '../../src/config/resolve';
import { runEnumeratedPlanningCycle } from '../../src/features/planning/enumerated-planning-cycle';
import type { PlanningConstraint } from '../../src/capabilities/planning/assessment-model';
export function verifyNativePlanningWork(constraints: readonly PlanningConstraint[]): void {
  const memory = Memory as Memory & { nativePlanningWork?: { eldrift?: unknown }; planningWorkRows?: unknown[] };
  const state = createMemoryPort(() => memory.nativePlanningWork ??= {});
  const prepare = createNativePlanningWork(state, 'W0N1', () => ({
    config: resolveConfig({ roomOverride: { planningEnabled: true } }, Game.time).values,
    valuableTypes: ['spawn', 'storage'], implementationRevision: 'engine-work-v1', constraints,
    protectedTypes: ['spawn', 'storage'], barrierCosts: { rampart: 1, constructedWall: 1 },
    versions: { standard: 'v1', constrained: 'v1' }, searchRevision: 'v1', scoreRevision: 'v1',
    maximumPathOps: 10000, minimumImprovement: 0,
    weights: { hauling: 1, service: 0, capacityShortfall: 0, swamps: 0, defense: 0, migration: 0 },
    prepareScore: () => () => { throw new Error('Enumeration-only scenario attempted scoring'); },
  }));
  const ready = prepare(() => true);
  if (ready.status !== 'ready') throw new Error('Native work unavailable: ' + ready.status);
  const { work } = ready;
  const result = runEnumeratedPlanningCycle(work.ports, work.enumeration, work.input, Game.time,
    { attempts: 100, steps: 0 });
  const saved = work.ports.candidates.read();
  (memory.planningWorkRows ??= []).push({ tick: Game.time, phase: result.phase, status: result.status,
    candidates: saved.checkpoint?.candidates.length ?? 0, revision: saved.revision,
    planRevision: work.ports.plans.read().revision });
}
