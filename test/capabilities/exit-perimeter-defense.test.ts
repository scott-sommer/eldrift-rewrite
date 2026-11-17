import { expect, test } from 'vitest';
import { exitPerimeterDefense } from '../../src/capabilities/planning/exit-perimeter-defense';
import { planningObservation } from '../fixtures/planning-observation';
function input() {
  return { observation: planningObservation(), rcl: 6,
    protectedAssets: [{ type: 'storage', position: { x: 25, y: 25 } }],
    costs: { rampart: 1, constructedWall: 1 } };
}
test('open exits receive a deterministic legal envelope staged by caller economy policy', () => {
  const request = input(), before = JSON.stringify(request);
  const result = exitPerimeterDefense(request);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('Expected envelope');
  expect(result.barriers).toHaveLength(180);
  expect(result.barriers.every(entry => entry.rcl === 6)).toBe(true);
  expect(result.validation.cost).toBe(180);
  expect(exitPerimeterDefense(JSON.parse(before))).toEqual(result);
  expect(JSON.stringify(request)).toBe(before);
});
test('natural walls replace barrier cells without diagonal leakage', () => {
  const request = input();
  request.observation.terrain = request.observation.terrain.map((cell, index) => index % 50 === 2 ? 'wall' : cell);
  const result = exitPerimeterDefense(request);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('Expected envelope');
  expect(result.barriers).toHaveLength(134);
});
test('assets outside envelope and forbidden barrier tiles reject the candidate', () => {
  const request = input();
  request.protectedAssets[0]!.position = { x: 1, y: 25 };
  expect(exitPerimeterDefense(request)).toMatchObject({ ok: false });
  request.protectedAssets[0]!.position = { x: 25, y: 25 };
  request.observation.constraints = [{ id: 'gate', kind: 'keep-clear', position: { x: 2, y: 25 } }];
  expect(exitPerimeterDefense(request)).toMatchObject({ ok: false, validation: { reason: 'constraints' } });
});
test('invalid stage and inset fail explicitly', () => {
  expect(() => exitPerimeterDefense({ ...input(), depth: 1 })).toThrow('depth');
  expect(() => exitPerimeterDefense({ ...input(), rcl: 1 })).toThrow('RCL');
});
