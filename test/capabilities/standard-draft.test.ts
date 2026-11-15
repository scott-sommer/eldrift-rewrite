import { expect, test, vi } from 'vitest';
import { standardDraft } from '../../src/capabilities/planning/standard-draft';
import { planningLimits } from '../fixtures/planning-limits';
import type { AssessmentInput } from '../../src/capabilities/planning/assessment-model';
const observation: AssessmentInput = {
  terrain: Array(2500).fill('plain'), objects: [], infrastructure: [], constraints: [],
};
function input(anchor = { x: 25, y: 25 }) {
  return { candidate: { anchor, transform: 0 as const }, observation, limits: planningLimits,
    blocksMovement: (type: string) => !['road', 'container', 'rampart'].includes(type),
    search: vi.fn(() => vi.fn(() => ({ path: [], incomplete: true, cost: 0 }))) };
}
test('out-of-room candidate fails before path search', () => {
  const request = input({ x: 1, y: 1 });
  expect(standardDraft(request)).toMatchObject({ ok: false, phase: 'footprint' });
  expect(request.search).not.toHaveBeenCalled();
});
test('terrain conflicts fail before infrastructure and search', () => {
  const request = input();
  const terrain = [...observation.terrain];
  terrain[25 * 50 + 25] = 'wall';
  expect(standardDraft({ ...request, observation: { ...observation, terrain } })).toMatchObject({ ok: false, phase: 'placement' });
  expect(request.search).not.toHaveBeenCalled();
});
test('incomplete searches never expose a successful partial draft', () => {
  const request = input();
  expect(standardDraft(request)).toMatchObject({ ok: false, phase: 'roads' });
  expect(request.search).toHaveBeenCalledOnce();
});

test('inaccessible source infrastructure is reported before road search', () => {
  const request = input();
  const terrain = [...observation.terrain];
  for (let x = 9; x <= 11; x++) for (let y = 9; y <= 11; y++) terrain[y * 50 + x] = 'wall';
  const observed: AssessmentInput = { ...observation, terrain,
    objects: [{ id: 'source', kind: 'source', position: { x: 10, y: 10 } }] };
  const result = standardDraft({ ...request, observation: observed });
  expect(result).toMatchObject({ ok: false, phase: 'infrastructure' });
  if (!result.ok && result.phase === 'infrastructure') expect(result.details).toContain('source:container');
  expect(request.search).not.toHaveBeenCalled();
});
test('shared link capacity rejects overcommitted infrastructure atomically', () => {
  const request = input();
  const limits = { ...planningLimits, link: [0, 0, 0, 0, 0, 1, 1, 1, 1] };
  expect(standardDraft({ ...request, limits })).toMatchObject({ ok: false, phase: 'capacity' });
  expect(request.search).not.toHaveBeenCalled();
});
