import { expect, test, vi } from 'vitest';
import { createStampReplayCache } from '../../src/capabilities/planning/stamp-replay-cache';
import { composeStamps } from '../../src/capabilities/planning/stamp-composition';
import { planningObservation } from '../fixtures/planning-observation';
import { planningLimits } from '../fixtures/planning-limits';
test('cached branch skips repeated validation but reset reconstructs identical output', () => {
  const cache = createStampReplayCache(), blocksMovement = vi.fn((type: string) => type !== 'road');
  const input = { revision: 'v1', observation: planningObservation(), limits: planningLimits, blocksMovement,
    anchors: [{ x: 25, y: 25 }], entries: [], corridors: [], stamps: [{ id: 'spawn',
      tiles: [{ type: 'spawn', offset: { x: 0, y: 0 }, rcl: 1 },
        { type: 'road', offset: { x: 1, y: 0 }, rcl: 1 }], ports: [{ x: 1, y: 0 }] }] };
  const first = composeStamps(input, undefined, 1, () => true, cache);
  expect(first.status).toBe('complete');
  const checkpoint = JSON.parse(JSON.stringify(first.checkpoint));
  blocksMovement.mockClear();
  const write = vi.spyOn(cache, 'write');
  const warm = composeStamps(input, checkpoint, 0, () => true, cache);
  expect(blocksMovement).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
  expect(warm.entries).toEqual(first.entries);
  warm.entries![0]!.position.x = 0;
  expect(composeStamps(input, checkpoint, 0, () => true, cache).entries).toEqual(first.entries);
  const cold = composeStamps(input, checkpoint, 0, () => true, createStampReplayCache());
  expect(blocksMovement).toHaveBeenCalled();
  expect(cold.entries).toEqual(first.entries);
  expect(composeStamps(input, checkpoint, 0, () => false, cache).entries).toBeUndefined();
});
test('cache is single-branch, detached and bound to exact revision signature and choices', () => {
  const cache = createStampReplayCache();
  const draft = { entries: [{ type: 'road', position: { x: 20, y: 20 }, rcl: 1 }],
    corridors: [{ x: 20, y: 20 }], claimed: ['road:1020'] };
  cache.write('v1', [0], draft);
  draft.entries[0]!.position.x = 0;
  expect(cache.read('v1', [0])?.entries[0]!.position.x).toBe(20);
  expect(cache.read('v2', [0])).toBeUndefined();
  expect(cache.read('v1', [1])).toBeUndefined();
  cache.write('v2', [1], draft);
  expect(cache.read('v1', [0])).toBeUndefined();
});

test('prefix restoration requires the same branch and returns detached validated work', () => {
  const cache = createStampReplayCache(), choices = [0, 3];
  cache.write('revision', choices, { entries: [], corridors: [{ x: 20, y: 20 }], claimed: [] });
  choices[0] = 7;
  expect(cache.readPrefix!('revision', [0, 3, 4])?.depth).toBe(2);
  expect(cache.read('revision', [0, 3, 4])).toBeUndefined();
  for (const branch of [[0], [0, 2], [7, 3, 4]]) expect(cache.readPrefix!('revision', branch)).toBeUndefined();
  expect(cache.readPrefix!('changed', [0, 3, 4])).toBeUndefined();
  const prefix = cache.readPrefix!('revision', [0, 3, 4])!;
  prefix.draft.corridors[0]!.x = 0;
  expect(cache.readPrefix!('revision', [0, 3, 4])?.draft.corridors[0]!.x).toBe(20);
});
