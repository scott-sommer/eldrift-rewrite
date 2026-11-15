import { selectLayout } from '../../src/capabilities/planning/selection';
import { measuredLayout } from './layout-score-check';
import { draftRouteCosts } from '../../src/capabilities/planning/draft-route-costs';
import { constrainedDraft } from '../../src/capabilities/planning/constrained-draft';
import { standardDraft } from '../../src/capabilities/planning/standard-draft';
import { planningRoadSearch } from '../../src/adapters/screeps/planning-road-search';
import { planningLimits } from '../fixtures/planning-limits';
import type { TransformIndex } from '../../src/core/geometry/transforms';
import type { AssessmentInput } from '../../src/capabilities/planning/assessment-model';
export function verifyAssembledDraft(): void {
  const storage = { x: 25, y: 25 };
  const observation: AssessmentInput = {
    terrain: Array(2500).fill('plain'), infrastructure: [], constraints: [], costs: { plain: 2, swamp: 2 },
    objects: [{ id: 'c', kind: 'controller', position: { x: 40, y: 40 } },
      { id: 's1', kind: 'source', position: { x: 10, y: 10 } },
      { id: 's2', kind: 'source', position: { x: 40, y: 10 } },
      { id: 'm', kind: 'mineral', position: { x: 10, y: 40 } }],
  };
  const result = standardDraft({
    candidate: { anchor: storage, transform: 0 }, observation, limits: planningLimits,
    blocksMovement: type => OBSTACLE_OBJECT_TYPES.some(obstacle => obstacle === type),
    search: costs => planningRoadSearch('W0N1', costs, 10000),
  });
  if (!result.ok) throw new Error('Draft failed: ' + JSON.stringify(result));
  const measured = draftRouteCosts({
    entries: result.entries, storage, observation, limits: planningLimits,
    hauling: observation.objects.map(object => ({ id: object.id, position: object.position, weight: 1 })),
    serviceWeights: { spawn: 8, extension: 1 },
    blocksMovement: type => OBSTACLE_OBJECT_TYPES.some(obstacle => obstacle === type),
    search: costs => planningRoadSearch('W0N1', costs, 10000),
  });
  if (!measured.ok || measured.service.routes.length !== 63 || measured.hauling.routes.length !== 4
    || measured.service.total <= 0 || measured.hauling.total <= 0) throw new Error('Missing measured layout journeys');
  if (result.entries.length <= 138 || result.connections.length !== 10) throw new Error('Missing logistics roads');
  const candidates = [measuredLayout('standard', result.entries, observation)];
  for (let transform = 0; transform < 8; transform++) {
    const compact = constrainedDraft({
      candidate: { anchor: storage, transform: transform as TransformIndex }, observation, limits: planningLimits,
      blocksMovement: type => OBSTACLE_OBJECT_TYPES.some(obstacle => obstacle === type),
      search: costs => planningRoadSearch('W0N1', costs, 10000),
    });
    if (!compact.ok) throw new Error('Constrained draft failed: ' + transform + ':' + JSON.stringify(compact));
    if (transform === 0) candidates.push(measuredLayout('constrained', compact.entries, observation));
    for (const [type, count] of [['extension', 60], ['spawn', 3], ['tower', 6], ['lab', 10]] as const) {
      if (compact.entries.filter(entry => entry.type === type).length !== count) throw new Error('Missing compact ' + type);
    }
  }
  const zero = { hauling: 0, service: 0, capacityShortfall: 0, swamps: 0, defense: 0, migration: 0 };
  const serviceChoice = selectLayout(candidates, { ...zero, service: 1 }, () => true, undefined, 0);
  const haulingChoice = selectLayout(candidates, { ...zero, hauling: 1 }, () => true, undefined, 0);
  if (serviceChoice?.id !== 'standard' || haulingChoice?.id !== 'constrained') throw new Error('Measured strategy selection did not follow configuration');
  (Memory as Memory & { assembledDraft?: unknown }).assembledDraft = {
    candidates, serviceChoice, haulingChoice, routeCosts: measured, count: result.entries.length, connections: result.connections.length, validated: true,
  };
}

