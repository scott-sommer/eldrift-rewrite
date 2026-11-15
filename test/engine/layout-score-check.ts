import { evaluateDraft } from '../../src/capabilities/planning/evaluate-draft';
import { planningRoadSearch } from '../../src/adapters/screeps/planning-road-search';
import type { StagedTile } from '../../src/capabilities/planning/template';
import type { AssessmentInput } from '../../src/capabilities/planning/assessment-model';
import { planningLimits } from '../fixtures/planning-limits';
export function measuredLayout(id: string, entries: readonly StagedTile[], observation: AssessmentInput) {
  const protectedTypes = ['spawn', 'extension', 'storage', 'terminal', 'lab', 'tower', 'factory', 'powerSpawn', 'nuker', 'observer'];
  const protectedEntries = entries.filter(entry => protectedTypes.includes(entry.type));
  const defended = [...entries, ...protectedEntries.map(entry => ({ type: 'rampart', position: entry.position, rcl: 4 }))];
  const limits = { ...planningLimits, rampart: [0, 0, 0, 2500, 2500, 2500, 2500, 2500, 2500] };
  const weights = Object.fromEntries(defended.map(entry => [entry.type, 1]));
  const result = evaluateDraft({
    entries: defended, storage: { x: 25, y: 25 }, observation, limits, protectedTypes,
    desiredCapacity: { spawn: 3, extension: 60, tower: 6, lab: 10, observer: 1, powerSpawn: 1, nuker: 1 },
    constructionCost: weights, retirementCost: weights, barrierCosts: { rampart: 1, constructedWall: 1 },
    hauling: observation.objects.map(object => ({ id: object.id, position: object.position, weight: 1 })),
    serviceWeights: { spawn: 8, extension: 1 },
    blocksMovement: type => OBSTACLE_OBJECT_TYPES.some(obstacle => obstacle === type),
    search: costs => planningRoadSearch('W0N1', costs, 10000),
  });
  if (!result.ok) throw new Error('Score failed: ' + id + ':' + JSON.stringify(result));
  if (!Object.values(result.costs).every(cost => Number.isFinite(cost) && cost >= 0)) throw new Error('Invalid measured scores');
  return { id, costs: result.costs };
}
