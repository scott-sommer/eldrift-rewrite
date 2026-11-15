import { expect, test } from 'vitest';
import { searchStampBatch } from '../../src/capabilities/planning/stamp-search';
import type { StampSearchInput } from '../../src/capabilities/planning/stamp-search';
import { planningObservation } from '../fixtures/planning-observation';
function input(): StampSearchInput {
  const observation = planningObservation();
  observation.terrain = Array.from({ length: 2500 }, (_, index) =>
    [1275, 1276, 1325].includes(index) ? 'plain' : 'wall');
  return { revision: 'room-v1', anchors: [{ x: 20, y: 20 }, { x: 25, y: 25 }],
    observation, entries: [], corridors: [], blocksMovement: type => type === 'spawn',
    stamp: { id: 'corner-spawn', tiles: [
      { type: 'spawn', offset: { x: 0, y: 0 }, rcl: 1 },
      { type: 'road', offset: { x: 1, y: 0 }, rcl: 2 },
      { type: 'road', offset: { x: 0, y: 1 }, rcl: 2 }],
    ports: [{ x: 1, y: 0 }, { x: 0, y: 1 }] } };
}
test('serialized batches find the same irregular-alcove placements in stable order', () => {
  const request = input(), complete = searchStampBatch(request, undefined, 16);
  expect(complete.done).toBe(true);
  expect(complete.matches.map(match => match.candidate.transform)).toEqual([0, 6]);
  let batch = searchStampBatch(request, undefined, 3);
  const matches = [...batch.matches];
  while (!batch.done) {
    batch = searchStampBatch(request, JSON.parse(JSON.stringify(batch.checkpoint)), 3);
    expect(batch.attempts).toBeLessThanOrEqual(3);
    matches.push(...batch.matches);
  }
  expect(matches).toEqual(complete.matches);
});
test('yielding and exhausted search are distinct and rejections explain the last attempted placement', () => {
  const request = input();
  const paused = searchStampBatch(request, undefined, 16, () => false);
  expect(paused).toMatchObject({ done: false, attempts: 0, matches: [] });
  request.anchors = [{ x: 20, y: 20 }];
  const failed = searchStampBatch(request, undefined, 8);
  expect(failed).toMatchObject({ done: true, attempts: 8, matches: [],
    lastRejection: { reason: 'spawn:20:20:wall' } });
});
test('changed placement inputs or observation revision cannot resume old search', () => {
  const request = input(), checkpoint = searchStampBatch(request, undefined, 1).checkpoint;
  for (const changed of [{ ...request, revision: 'room-v2' },
    { ...request, corridors: [{ x: 25, y: 25 }] },
    { ...request, claimed: ['spawn:1275'] },
    { ...request, anchors: [...request.anchors].reverse() },
    { ...request, stamp: { ...request.stamp, id: 'new-definition' } }]) {
    expect(() => searchStampBatch(changed, checkpoint, 1)).toThrow('Stale');
  }
  expect(() => searchStampBatch(request, checkpoint, -1)).toThrow('budget');
});
test('returned placements and checkpoints cannot mutate the caller or a saved cursor', () => {
  const request = input(), before = JSON.stringify(request);
  const first = searchStampBatch(request, undefined, 9), saved = JSON.stringify(first.checkpoint);
  const next = searchStampBatch(request, first.checkpoint, 1);
  next.checkpoint.seen.push('mutated');
  first.matches[0]!.placement.entries[0]!.position.x = 0;
  expect(JSON.stringify(request)).toBe(before);
  expect(JSON.stringify(first.checkpoint)).toBe(saved);
});
