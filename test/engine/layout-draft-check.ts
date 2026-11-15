import { stageStandardCore } from '../../src/capabilities/planning/standard-core';
import { attachInfrastructure } from '../../src/capabilities/planning/attach-infrastructure';
import { finishDraft } from '../../src/capabilities/planning/finish-draft';
import { planningRoadSearch } from '../../src/adapters/screeps/planning-road-search';
import { planningLimits } from '../fixtures/planning-limits';
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
  const core = stageStandardCore(storage, 0, planningLimits)!;
  const attached = attachInfrastructure(core, storage, observation, planningLimits);
  if (!attached.ok || attached.missing.length) throw new Error('Infrastructure assembly failed');
  const result = finishDraft({
    entries: attached.entries, storage, anchors: attached.anchors, observation, limits: planningLimits,
    blocksMovement: type => OBSTACLE_OBJECT_TYPES.some(obstacle => obstacle === type),
    search: costs => planningRoadSearch('W0N1', costs, 10000),
  });
  if (!result.ok) throw new Error('Draft failed: ' + JSON.stringify(result));
  if (result.entries.length <= 138 || result.connections.length !== 10) throw new Error('Missing logistics roads');
  (Memory as Memory & { assembledDraft?: unknown }).assembledDraft = {
    count: result.entries.length, connections: result.connections.length, validated: true,
  };
}

