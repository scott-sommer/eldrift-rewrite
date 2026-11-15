import type { LayoutCosts } from '../../src/capabilities/planning/selection';
import { createAssessmentCache } from '../../src/capabilities/planning/assessment-cache';
import { createPlanProposal } from '../../src/features/planning/plan-proposal';
import { planSchema } from '../../src/features/planning/plan-state';
import { evaluateDraft } from '../../src/capabilities/planning/evaluate-draft';
import { planningRoadSearch } from '../../src/adapters/screeps/planning-road-search';
import type { StagedTile } from '../../src/capabilities/planning/template';
import type { AssessmentInput } from '../../src/capabilities/planning/assessment-model';
import { planningLimits } from '../fixtures/planning-limits';
const assess = createAssessmentCache();
export function measurementInput(entries: readonly StagedTile[], observation: AssessmentInput) {
  const protectedTypes = ['spawn', 'extension', 'storage', 'terminal', 'lab', 'tower', 'factory', 'powerSpawn', 'nuker', 'observer'];
  const protectedEntries = entries.filter(entry => protectedTypes.includes(entry.type));
  const defended = [...entries, ...protectedEntries.map(entry => ({ type: 'rampart', position: entry.position, rcl: 4, priority: -100 }))];
  const limits = { ...planningLimits, rampart: [0, 0, 0, 2500, 2500, 2500, 2500, 2500, 2500] };
  const weights = Object.fromEntries(defended.map(entry => [entry.type, 1]));
  return { assess,
    entries: defended, storage: { x: 25, y: 25 }, observation, limits, protectedTypes,
    desiredCapacity: { spawn: 3, extension: 60, tower: 6, lab: 10, observer: 1, powerSpawn: 1, nuker: 1 },
    constructionCost: weights, retirementCost: weights, barrierCosts: { rampart: 1, constructedWall: 1 },
    hauling: observation.objects.map(object => ({ id: object.id, position: object.position, weight: 1 })),
    serviceWeights: { spawn: 8, extension: 1 },
    blocksMovement: (type: string) => OBSTACLE_OBJECT_TYPES.some(obstacle => obstacle === type),
    search: (costs: readonly number[]) => planningRoadSearch('W0N1', costs, 10000),
  };
}
export function measuredProposal(id: string, entries: readonly StagedTile[], observation: AssessmentInput) {
  const input = measurementInput(entries, observation);
  const result = evaluateDraft(input);
  if (!result.ok) throw new Error('Score failed: ' + id + ':' + JSON.stringify(result));
  if (!Object.values(result.costs).every(cost => Number.isFinite(cost) && cost >= 0)) throw new Error('Invalid measured scores');
  return scoredProposal(id, input, result.costs);
}
export function scoredProposal(id: string, input: ReturnType<typeof measurementInput>, costs: LayoutCosts) {
  const proposal = createPlanProposal({
    strategy: id, entries: input.entries, provenance: { candidateId: id + ':25:25:0', strategyVersion: 'fixture-v1',
      observation: JSON.stringify(input.observation), policy: 'fixture-v1', generatedAt: Game.time,
      anchor: { x: 25, y: 25 }, transform: 0, costs },
  });
  const record = { room: 'W0N1', revision: 1, ...proposal, provenance: { ...proposal.provenance, committedAt: Game.time } };
  if (!planSchema('W0N1', Object.keys(input.limits)).valid(record)) throw new Error('Generated proposal failed schema');
  if (!proposal.entries.some(entry => entry.tag === 'source' && entry.objectId === 's1')) throw new Error('Lost source association');
  return proposal;
}

export function measuredLayout(id: string, entries: readonly StagedTile[], observation: AssessmentInput) {
  const proposal = measuredProposal(id, entries, observation);
  return { id, costs: proposal.provenance.costs };
}
