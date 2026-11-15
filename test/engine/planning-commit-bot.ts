import { loop as botLoop } from '../../src/main';
import { standardDraft } from '../../src/capabilities/planning/standard-draft';
import { validateDraft } from '../../src/capabilities/planning/draft-validation';
import { assessRoom } from '../../src/capabilities/planning/assessment';
import { placementFailures } from '../../src/capabilities/planning/placement-validation';
import { planningRoadSearch } from '../../src/adapters/screeps/planning-road-search';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createPlanStore } from '../../src/features/planning/plan-store';
import type { PlanState } from '../../src/features/planning/plan-model';
import { measuredProposal } from './layout-score-check';
import { planningObservation } from '../fixtures/planning-observation';
import { planningLimits } from '../fixtures/planning-limits';
const limits = { ...planningLimits, rampart: [0, 0, 0, 2500, 2500, 2500, 2500, 2500, 2500] };
let runtimeCalls = 0;
export function loop() {
  botLoop();
  const memory = Memory as Memory & { committedBaseline?: string; commitRows?: unknown[] };
  const observation = planningObservation();
  const context = { tick: Game.time, observation: JSON.stringify(observation), policy: 'fixture-v1' };
  const store = createPlanStore(createMemoryPort(() => Memory), 'W0N1', Object.keys(limits));
  let rejection = '';
  if (Game.time === 1) {
    const draft = standardDraft({ candidate: { anchor: { x: 25, y: 25 }, transform: 0 }, observation, limits,
      blocksMovement: blocks, search: costs => planningRoadSearch('W0N1', costs, 10000) });
    if (!draft.ok) throw new Error('Commit fixture failed to generate');
    const proposal = measuredProposal('standard', draft.entries, observation);
    const committed = store.commit(0, proposal, context, valid);
    if (!committed.ok) throw new Error('Generated commit failed: ' + committed.reason);
    memory.committedBaseline = JSON.stringify(store.read());
  } else {
    const current = store.read();
    if (!current.provenance) throw new Error('Missing committed provenance after reload');
    const proposal = { strategy: current.strategy!, entries: current.entries, provenance: current.provenance };
    if (Game.time === 2) {
      const spawn = proposal.entries.find(entry => entry.type === 'spawn' && entry.rcl === 1)!;
      spawn.x = 10; spawn.y = 10;
      proposal.provenance.bootstrap.spawn = 'spawn:10:10';
    }
    const result = store.commit(current.revision, proposal,
      Game.time === 3 ? { ...context, observation: 'changed-room' } : context, valid);
    if (result.ok) throw new Error('Invalid replacement committed');
    rejection = result.reason;
  }
  const plan = store.read();
  (memory.commitRows ??= []).push({ tick: Game.time, calls: ++runtimeCalls, revision: plan.revision,
    preserved: JSON.stringify(plan) === memory.committedBaseline, rejection });
}
function blocks(type: string): boolean { return OBSTACLE_OBJECT_TYPES.some(obstacle => obstacle === type); }
function valid(plan: PlanState): boolean {
  const observation = planningObservation();
  const entries = plan.entries.map(entry => ({ ...entry, position: { x: entry.x, y: entry.y } }));
  return validateDraft({ assessment: assessRoom(observation), entries, limits, constraints: observation.constraints,
    blocksMovement: blocks, placementFailures: draft => placementFailures(draft, observation) }).ok;
}
