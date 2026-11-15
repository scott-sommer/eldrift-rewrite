import { expect, test, vi } from 'vitest';
import { stampDraftBatch } from '../../src/capabilities/planning/stamp-draft-batch';
import { attachInfrastructure } from '../../src/capabilities/planning/attach-infrastructure';
import { planningObservation } from '../fixtures/planning-observation';
import { planningLimits } from '../fixtures/planning-limits';
function input() {
  return { storage: { x: 25, y: 25 }, observation: planningObservation(), limits: planningLimits,
    blocksMovement: (type: string) => !['road', 'container', 'rampart'].includes(type),
    search: vi.fn(() => vi.fn(() => ({ path: [], cost: 0, incomplete: true }))),
    composition: { stamps: [{ id: 'hub', tiles: [
      { type: 'storage', offset: { x: 0, y: 0 }, rcl: 4 },
      { type: 'road', offset: { x: 1, y: 0 }, rcl: 1 }], ports: [{ x: 1, y: 0 }] }],
    anchors: [{ x: 25, y: 25 }], entries: [], corridors: [] } };
}
test('unfinished composition does not invoke infrastructure road search', () => {
  const request = input();
  expect(stampDraftBatch(request, 'v1', undefined, 0, 1)).toMatchObject({ ok: true, done: false });
  expect(request.search).not.toHaveBeenCalled();
});
test('completed composition uses shared roads and rejects incomplete paths', () => {
  const request = input();
  expect(stampDraftBatch(request, 'v1', undefined, 1, 1)).toMatchObject({ ok: false, phase: 'roads' });
  expect(request.search).toHaveBeenCalled();
});
test('storage anchor mismatch is rejected before routing', () => {
  const request = input(); request.storage = { x: 30, y: 30 };
  expect(stampDraftBatch(request, 'v1', undefined, 1, 1)).toMatchObject({ ok: false, phase: 'storage' });
  expect(request.search).not.toHaveBeenCalled();
});
test('existing catalog factory is retained without requesting a duplicate', () => {
  const entries = [{ type: 'storage', position: { x: 25, y: 25 }, rcl: 4 },
    { type: 'factory', position: { x: 27, y: 27 }, rcl: 7, tag: 'stamp' }];
  const result = attachInfrastructure(entries, { x: 25, y: 25 }, planningObservation(), planningLimits);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('Infrastructure failed');
  expect(result.entries.filter(entry => entry.type === 'factory')).toEqual([entries[1]]);
});

test('guard pause preserves detached pending road work for the completed composition', () => {
  const request = input();
  const first = stampDraftBatch(request, 'v1', undefined, 1, 0);
  expect(first).toMatchObject({ ok: true, done: false });
  if (!first.ok) throw new Error('Expected progress');
  expect(first.checkpoint.roads).toBeDefined();
  const before = JSON.stringify(first.checkpoint);
  const paused = stampDraftBatch(request, 'v1', first.checkpoint, 1, 1, () => false);
  expect(paused).toMatchObject({ ok: true, done: false, checkpoint: first.checkpoint });
  if (!paused.ok) throw new Error('Expected pause');
  expect(paused.checkpoint.roads).not.toBe(first.checkpoint.roads);
  expect(JSON.stringify(first.checkpoint)).toBe(before);
});
