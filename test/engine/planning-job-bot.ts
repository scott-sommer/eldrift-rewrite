import { createPlanningCommitValidator } from '../../src/features/planning/planning-commit-validation';
import { createPlanningRequestStore } from '../../src/features/planning/planning-request-store';
import { measure, profileJobs, profilePlans } from './planning-profile';
import { runPlanningCycle } from '../../src/features/planning/planning-cycle';
import { loop as botLoop } from '../../src/main';
import { createPlanningJobStore } from '../../src/features/planning/planning-job-store';
import { createPlanStore } from '../../src/features/planning/plan-store';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { validateDraft } from '../../src/capabilities/planning/draft-validation';
import { assessRoom } from '../../src/capabilities/planning/assessment';
import { placementFailures } from '../../src/capabilities/planning/placement-validation';
import type { PlanProposal } from '../../src/features/planning/plan-store';
import { evaluateJobCandidate } from './planning-job-evaluator';
import { planningObservation } from '../fixtures/planning-observation';
import { planningLimits } from '../fixtures/planning-limits';
const limits = { ...planningLimits, rampart: [0, 0, 0, 2500, 2500, 2500, 2500, 2500, 2500] };
let calls = 0;
export function loop() {
  botLoop();
  const memory = Memory as Memory & { jobRows?: unknown[]; jobCommitted?: boolean; recoveredCommit?: boolean };
  const store = profilePlans(createPlanStore(createMemoryPort(() => Memory), 'W0N1', Object.keys(limits)));
  const requests = createPlanningRequestStore(createMemoryPort(() => Memory), 'W0N1', Object.keys(limits));
  const captured = requests.capture(requests.read().revision, 'fixture-request-v1', store.read());
  if (!captured.ok) throw new Error('Planning request conflict');
  const baseRevision = captured.record.request!.basePlan.revision;
  const jobs = profileJobs(createPlanningJobStore(createMemoryPort(() => Memory), 'W0N1', Object.keys(limits)));
  const cycleJobs = { ...jobs, finish: (...args: Parameters<typeof jobs.finish>) =>
    Game.time === 199 ? { ok: false as const, reason: 'revision' as const } : jobs.finish(...args) };
  const result = measure('cycle', runPlanningCycle)({ jobs: cycleJobs, plans: store,
    validateCommit: createPlanningCommitValidator(() => ({
      room: 'W0N1', observation: planningObservation(), observationIdentity: JSON.stringify(planningObservation()),
      policyIdentity: 'fixture-v1', limits, blocksMovement: type => OBSTACLE_OBJECT_TYPES.some(item => item === type),
      protectedTypes: ['spawn', 'extension', 'storage', 'terminal', 'lab', 'tower', 'factory', 'powerSpawn', 'nuker', 'observer'],
      barrierCosts: { rampart: 1, constructedWall: 1 },
    })) }, {
      observation: JSON.stringify(planningObservation()), policy: 'fixture-v1', baseRevision,
      source: { revision: 'two-strategies-v1', count: 2, at: index => {
        const strategy = index === 0 ? 'standard' : 'constrained';
        return { id: strategy + ':25:25:0', strategy, anchor: { x: 25, y: 25 }, transform: 0 };
      } },
      weights: { hauling: 1, service: 0, capacityShortfall: 0, swamps: 0, defense: 0, migration: 0 },
      minimumImprovement: 0, step: measure('evaluate', evaluateJobCandidate), validate: measure('validate', valid),
    }, Game.time, 1);
  if (result.status === 'finished') memory.recoveredCommit = result.recovered;
  const job = jobs.read();
  memory.jobCommitted = !!job.receipt;
  const plan = store.read();
  (memory.jobRows ??= []).push({ tick: Game.time, calls: ++calls, next: job.checkpoint?.next ?? 2, status: result.status,
    revision: plan.revision, strategy: plan.strategy, committed: memory.jobCommitted ?? false });
}
function valid(proposal: PlanProposal): boolean {
  const observation = planningObservation();
  const entries = proposal.entries.map(entry => ({ ...entry, position: { x: entry.x, y: entry.y } }));
  return validateDraft({ assessment: assessRoom(observation), entries, limits, constraints: observation.constraints,
    blocksMovement: type => OBSTACLE_OBJECT_TYPES.some(item => item === type),
    placementFailures: draft => placementFailures(draft, observation) }).ok;
}
