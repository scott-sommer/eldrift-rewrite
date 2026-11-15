import { expect, test } from 'vitest';
import { composeStamps } from '../../src/capabilities/planning/stamp-composition';
import { createStampReplayCache } from '../../src/capabilities/planning/stamp-replay-cache';
import { planningObservation } from '../fixtures/planning-observation';
import { planningLimits } from '../fixtures/planning-limits';
function input(maximumTotalAttempts = 100) {
  const stamps = Array.from({ length: 6 }, (_, index) => ({ id: 'extension-' + index,
    tiles: [{ type: 'extension', offset: { x: 0, y: 0 }, rcl: 8 },
      { type: 'road', offset: { x: 1, y: 0 }, rcl: 8 }], ports: [{ x: 1, y: 0 }] }));
  return { revision: 'cold-replay', observation: planningObservation(), limits: planningLimits,
    blocksMovement: (type: string) => type === 'extension', stamps, anchors: [], entries: [], corridors: [],
    anchorsByStamp: stamps.map((_, index) => [{ x: 10 + index * 4, y: 25 }]), maximumTotalAttempts };
}
test('a cold deep branch reconstructs across bounded slices without repeating completed search', () => {
  const request = input(), complete = composeStamps(request, undefined, 100);
  expect(complete.status).toBe('complete');
  const checkpoint = JSON.parse(JSON.stringify(complete.checkpoint)), before = JSON.stringify(checkpoint);
  const cache = createStampReplayCache();
  let result = complete;
  for (let tick = 0; tick < 8; tick++) {
    let remaining = 2;
    result = composeStamps(request, checkpoint, 0, () => remaining-- > 0, cache);
    expect(result.attempts).toBe(0);
    expect(result.checkpoint.totalAttempts).toBe(complete.checkpoint.totalAttempts);
    if (result.status === 'complete') break;
    expect(result.status).toBe('pending');
    expect(result.entries).toBeUndefined();
  }
  expect(result.status).toBe('complete');
  expect(result.entries).toEqual(complete.entries);
  expect(JSON.stringify(checkpoint)).toBe(before);
});
test('yielding while restoring a completed branch at its total cap is not search exhaustion', () => {
  const request = input(6), complete = composeStamps(request, undefined, 6);
  expect(complete.status).toBe('complete');
  const result = composeStamps(request, complete.checkpoint, 0, () => false, createStampReplayCache());
  expect(result.status).toBe('pending');
  expect(result.reason).toBeUndefined();
});
