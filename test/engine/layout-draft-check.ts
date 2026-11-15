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
  if (result.entries.length <= 138 || result.connections.length !== 10) throw new Error('Missing logistics roads');
  for (let transform = 0; transform < 8; transform++) {
    const compact = constrainedDraft({
      candidate: { anchor: storage, transform: transform as TransformIndex }, observation, limits: planningLimits,
      blocksMovement: type => OBSTACLE_OBJECT_TYPES.some(obstacle => obstacle === type),
      search: costs => planningRoadSearch('W0N1', costs, 10000),
    });
    if (!compact.ok) throw new Error('Constrained draft failed: ' + transform + ':' + JSON.stringify(compact));
    for (const [type, count] of [['extension', 60], ['spawn', 3], ['tower', 6], ['lab', 10]] as const) {
      if (compact.entries.filter(entry => entry.type === type).length !== count) throw new Error('Missing compact ' + type);
    }
  }
  (Memory as Memory & { assembledDraft?: unknown }).assembledDraft = {
    count: result.entries.length, connections: result.connections.length, validated: true,
  };
}

