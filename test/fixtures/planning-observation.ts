import type { AssessmentInput } from '../../src/capabilities/planning/assessment-model';
export function planningObservation(): AssessmentInput {
  return { terrain: Array(2500).fill('plain'), infrastructure: [], constraints: [], costs: { plain: 2, swamp: 2 },
    objects: [{ id: 'c', kind: 'controller', position: { x: 40, y: 40 } },
      { id: 's1', kind: 'source', position: { x: 10, y: 10 } },
      { id: 's2', kind: 'source', position: { x: 40, y: 10 } },
      { id: 'm', kind: 'mineral', position: { x: 10, y: 40 } }] };
}
