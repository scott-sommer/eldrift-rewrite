import { expect, test } from 'vitest';
import { composeStamps } from '../../src/capabilities/planning/stamp-composition';
import type { StampCompositionInput } from '../../src/capabilities/planning/stamp-composition';
import { planningObservation } from '../fixtures/planning-observation';
import { planningLimits } from '../fixtures/planning-limits';
function input(): StampCompositionInput {
  return { revision: 'v1', anchors: [{ x: 20, y: 20 }, { x: 30, y: 30 }],
    observation: planningObservation(), entries: [], corridors: [], limits: planningLimits,
    blocksMovement: type => type !== 'road', stamps: [
      { id: 'spawn', tiles: [{ type: 'spawn', offset: { x: 0, y: 0 }, rcl: 1 },
        { type: 'road', offset: { x: 1, y: 0 }, rcl: 1 }], ports: [{ x: 1, y: 0 }] },
      { id: 'storage', tiles: [{ type: 'storage', offset: { x: 0, y: 0 }, rcl: 4 },
        { type: 'road', offset: { x: 1, y: 0 }, rcl: 4 }], ports: [{ x: 1, y: 0 }] }] };
}
test('serialized one-attempt composition matches uninterrupted search without duplicate capacity', () => {
  const request = input(), expected = composeStamps(request, undefined, 100);
  expect(expected.status).toBe('complete');
  let result = composeStamps(request, undefined, 1);
  for (let calls = 0; result.status === 'pending' && calls < 100; calls++) {
    result = composeStamps(request, JSON.parse(JSON.stringify(result.checkpoint)), 1);
  }
  expect(result.entries).toEqual(expected.entries);
  expect(result.checkpoint.choices).toEqual([0, 8]);
});
test('backtracks when the later stamp can only occupy the first anchor', () => {
  const request = input();
  request.observation.infrastructure = [{ id: 'spawn', type: 'spawn', position: { x: 30, y: 30 }, owned: true, walkable: false }];
  const result = composeStamps(request, undefined, 500);
  expect(result.status).toBe('complete');
  expect(result.checkpoint.choices[0]).toBe(8);
  expect(result.entries?.find(entry => entry.type === 'storage')?.position).toEqual({ x: 20, y: 20 });
});
test('exhaustion, yielding and changed request are explicit and never mutate prior progress', () => {
  const request = input(); request.anchors = [{ x: 20, y: 20 }];
  const paused = composeStamps(request, undefined, 10, () => false);
  expect(paused.status).toBe('pending');
  const before = JSON.stringify(paused.checkpoint);
  expect(composeStamps(request, paused.checkpoint, 500).status).toBe('rejected');
  expect(JSON.stringify(paused.checkpoint)).toBe(before);
  expect(() => composeStamps({ ...request, revision: 'v2' }, paused.checkpoint, 1)).toThrow('Stale');
});

test('combined capacity rejects individually legal stamps and corrupted cursors fail closed', () => {
  const request = input();
  request.stamps = [request.stamps[0]!, { ...request.stamps[0]!, id: 'second-spawn' }];
  const result = composeStamps(request, undefined, 500);
  expect(result.status).toBe('rejected');
  const paused = composeStamps(request, undefined, 1);
  expect(() => composeStamps(request, { ...paused.checkpoint, cursors: [0, 0] }, 1)).toThrow('choice');
  expect(() => composeStamps(request, { ...paused.checkpoint, exhausted: true }, 1)).toThrow('exhausted');
});
