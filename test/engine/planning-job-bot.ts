import { loop as botLoop } from '../../src/main';
import { advancePlanningJob } from '../../src/features/planning/planning-job';
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
  const memory = Memory as Memory & { jobRows?: unknown[]; jobCommitted?: boolean };
  const store = createPlanStore(createMemoryPort(() => Memory), 'W0N1', Object.keys(limits));
  const jobs = createPlanningJobStore(createMemoryPort(() => Memory), 'W0N1', Object.keys(limits));
  let job = jobs.read();
  if (!memory.jobCommitted) {
    const result = advancePlanningJob({
      observation: JSON.stringify(planningObservation()), policy: 'fixture-v1', baseRevision: 0,
      source: { revision: 'two-strategies-v1', count: 2, at: index => {
        const strategy = index === 0 ? 'standard' : 'constrained';
        return { id: strategy + ':25:25:0', strategy, anchor: { x: 25, y: 25 }, transform: 0 };
      } },
      weights: { hauling: 1, service: 0, capacityShortfall: 0, swamps: 0, defense: 0, migration: 0 },
      minimumImprovement: 0, step: evaluateJobCandidate, validate: valid,
    }, job.checkpoint, 1);
    const saved = jobs.save(job.revision, result.checkpoint);
    if (!saved.ok) throw new Error('Lost planning job revision');
    job = saved.record;
    if (result.done) {
      if (!('proposal' in result) || !result.proposal) throw new Error('No selected native plan');
      const committed = store.commit(0, result.proposal,
        { tick: Game.time, observation: JSON.stringify(planningObservation()), policy: 'fixture-v1' },
        plan => valid({ ...plan, strategy: plan.strategy!, provenance: plan.provenance! }));
      if (!committed.ok) throw new Error('Selected plan failed commit: ' + committed.reason);
      memory.jobCommitted = true;
    }
  }
  const plan = store.read();
  (memory.jobRows ??= []).push({ tick: Game.time, calls: ++calls, next: job.checkpoint!.next,
    revision: plan.revision, strategy: plan.strategy, committed: memory.jobCommitted ?? false });
}
function valid(proposal: PlanProposal): boolean {
  const observation = planningObservation();
  const entries = proposal.entries.map(entry => ({ ...entry, position: { x: entry.x, y: entry.y } }));
  return validateDraft({ assessment: assessRoom(observation), entries, limits, constraints: observation.constraints,
    blocksMovement: type => OBSTACLE_OBJECT_TYPES.some(item => item === type),
    placementFailures: draft => placementFailures(draft, observation) }).ok;
}
