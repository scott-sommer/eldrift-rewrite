import { expect, test } from 'vitest';
import { validateDraft } from '../../src/capabilities/planning/draft-validation';
import { assessRoom } from '../../src/capabilities/planning/assessment';
const assessment = assessRoom({
  terrain: Array(2500).fill('plain'), objects: [], infrastructure: [], constraints: [],
});
const input = {
  assessment, entries: [{ type: 'spawn', position: { x: 25, y: 25 }, rcl: 1 }],
  limits: { spawn: [0, 1, 1, 1, 1, 1, 1, 2, 3] }, constraints: [],
  blocksMovement: () => true, placementFailures: () => [] as string[],
};
test('capacity rejects invalid levels before later validators can accidentally ignore them', () => {
  let called = false;
  expect(validateDraft({ ...input, entries: [{ ...input.entries[0]!, rcl: 9 }],
    placementFailures: () => { called = true; return []; } })).toMatchObject({ ok: false, phase: 'capacity' });
  expect(called).toBe(false);
});
test('placement legality is mandatory and cannot be overridden by valid access or capacity', () => {
  expect(validateDraft({ ...input, placementFailures: () => ['spawn on wall'] }))
    .toEqual({ ok: false, phase: 'placement', details: ['spawn on wall'] });
  expect(validateDraft(input)).toEqual({ ok: true });
});
test('locks are enforced before placement and reaction geometry before access', () => {
  expect(validateDraft({ ...input, constraints: [
    { id: 'keep', kind: 'locked', type: 'storage', position: { x: 24, y: 25 } },
  ] })).toMatchObject({ ok: false, phase: 'constraints' });
  expect(validateDraft({ ...input, entries: [{ type: 'lab', position: { x: 25, y: 25 }, rcl: 6 }],
    limits: { lab: [0, 0, 0, 0, 0, 0, 3, 6, 10] } }))
    .toEqual({ ok: false, phase: 'labs', details: [6, 7, 8] });
});
