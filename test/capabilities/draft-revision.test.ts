import { expect, test } from 'vitest';
import { compactSequence, draftRevision } from '../../src/capabilities/planning/draft-revision';
import type { FinishDraftInput } from '../../src/capabilities/planning/finish-draft';
import { planningObservation } from '../fixtures/planning-observation';
import { planningLimits } from '../fixtures/planning-limits';
function input(): FinishDraftInput {
  return { entries: [], storage: { x: 25, y: 25 }, anchors: [], observation: planningObservation(),
    limits: planningLimits, blocksMovement: () => false, search: () => () => ({ path: [], incomplete: false, cost: 0 }) };
}
test('run encoding is lossless and never larger, including alternating and empty sequences', () => {
  const sequences = [[], Array(2500).fill('plain'), Array.from({ length: 2500 }, (_, i) => i % 2),
    [1, 11, 1, 11], ['1', '11', '1'], [255, 255, 2, 2, 2]];
  for (const values of sequences) {
    const encoded = compactSequence(values);
    const decoded = Array.isArray(encoded) ? encoded : (encoded as { runs: [string | number, number][] }).runs
      .flatMap(([value, count]) => Array(count).fill(value));
    expect(decoded).toEqual(values);
    expect(JSON.stringify(encoded).length).toBeLessThanOrEqual(JSON.stringify(values).length);
  }
});
test('all binary sequences through length eight retain distinct identities', () => {
  const identities = new Set<string>();
  for (let length = 0; length <= 8; length++) for (let bits = 0; bits < 2 ** length; bits++) {
    const encoded = JSON.stringify(compactSequence(Array.from({ length }, (_, index) => (bits >> index) & 1)));
    expect(identities.has(encoded)).toBe(false);
    identities.add(encoded);
  }
  expect(identities.size).toBe(511);
});
test('room terrain and costs compact substantially without losing changed-cell invalidation', () => {
  const request = input();
  const costs = Array<number>(2500).fill(2);
  const baseline = draftRevision(request, 'search-v1', costs);
  expect(baseline.length).toBeLessThan(2000);
  const terrain = [...request.observation.terrain];
  terrain[1234] = 'swamp';
  expect(draftRevision({ ...request, observation: { ...request.observation, terrain } }, 'search-v1', costs)).not.toBe(baseline);
  costs[1234] = 255;
  expect(draftRevision(request, 'search-v1', costs)).not.toBe(baseline);
});
test('identity retains limits, placements, observation metadata and caller policy', () => {
  const request = input();
  const costs = Array<number>(2500).fill(2);
  const baseline = draftRevision(request, 'v1', costs);
  const variants: FinishDraftInput[] = [
    { ...request, entries: [{ type: 'road', position: { x: 20, y: 20 }, rcl: 4, priority: -190 }] },
    { ...request, limits: { ...planningLimits, spawn: Array(9).fill(0) } },
    { ...request, observation: { ...request.observation, margin: 3 } },
    { ...request, observation: { ...request.observation, costs: { plain: 3, swamp: 6 } } },
    { ...request, observation: { ...request.observation, constraints: [{ id: 'lock', kind: 'locked', type: 'spawn', position: { x: 20, y: 20 } }] } },
  ];
  for (const variant of variants) expect(draftRevision(variant, 'v1', costs)).not.toBe(baseline);
  expect(draftRevision(request, 'v2', costs)).not.toBe(baseline);
  expect(draftRevision(request, 'v1', costs)).toBe(baseline);
});
