import { expect, test } from 'vitest';
import { canShareTile, placementFailures } from '../../src/capabilities/planning/placement-validation';
import type { AssessmentInput } from '../../src/capabilities/planning/assessment-model';
const input: AssessmentInput = { terrain: Array(2500).fill('plain'), objects: [], infrastructure: [], constraints: [] };
const position = { x: 25, y: 25 };
test('sharing policy is symmetric, preserves road/rampart overlays and rejects competing buildings', () => {
  for (const [a, b, allowed] of [
    ['road', 'lab', true], ['rampart', 'spawn', true], ['container', 'road', true],
    ['spawn', 'extension', false], ['container', 'link', false], ['road', 'road', false],
  ] as const) {
    expect(canShareTile(a, b)).toBe(allowed);
    expect(canShareTile(b, a)).toBe(allowed);
  }
});
test('planned and retained observed infrastructure conflicts are explicit; matching existing structures are reused', () => {
  expect(placementFailures([{ type: 'spawn', position }, { type: 'extension', position }], input))
    .toEqual(['extension:25:25:planned-conflict']);
  const occupied = { ...input, infrastructure: [{ id: 's', type: 'spawn', position, owned: true, walkable: false }] };
  expect(placementFailures([{ type: 'spawn', position }], occupied)).toEqual([]);
  expect(placementFailures([{ type: 'extension', position }], occupied)).toEqual(['extension:25:25:existing-conflict']);
  expect(placementFailures([{ type: 'road', position }, { type: 'rampart', position }], occupied)).toEqual([]);
});
test('terrain failure remains visible even where sharing itself would be permitted', () => {
  expect(placementFailures([{ type: 'road', position }], {
    ...input, objects: [{ id: 's', kind: 'source', position }],
  })).toEqual(['road:25:25:fixed-object']);
});
