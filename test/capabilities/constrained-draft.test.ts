import { expect, test, vi } from 'vitest';
import { constrainedDraft } from '../../src/capabilities/planning/constrained-draft';
import { planningLimits } from '../fixtures/planning-limits';
import type { AssessmentInput } from '../../src/capabilities/planning/assessment-model';
test('a room without a controller cannot produce a constrained base', () => {
  const search = vi.fn();
  const observation: AssessmentInput = { terrain: Array(2500).fill('plain'), objects: [], infrastructure: [], constraints: [] };
  expect(constrainedDraft({ candidate: { anchor: { x: 25, y: 25 }, transform: 0 },
    observation, limits: planningLimits, blocksMovement: () => true, search }))
    .toEqual({ ok: false, phase: 'controller', details: 'missing-controller' });
  expect(search).not.toHaveBeenCalled();
});
