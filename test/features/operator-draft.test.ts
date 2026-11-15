import { expect, test } from 'vitest';
import { createOperatorDraftAmendment } from '../../src/features/planning/operator-draft';
import { finishDraft } from '../../src/capabilities/planning/finish-draft';
import type { FinishDraftInput } from '../../src/capabilities/planning/finish-draft';
import { finishDraftBatch } from '../../src/capabilities/planning/finish-draft-batch';
import { planningLimits } from '../fixtures/planning-limits';
import type { PlanEntry } from '../../src/features/planning/plan-model';
const road: PlanEntry = { type: 'road', x: 28, y: 25, rcl: 2, priority: -77, source: 'operator', tag: 'manual' };
function input(): FinishDraftInput {
  return { entries: [
    { type: 'spawn', position: { x: 24, y: 25 }, rcl: 1, priority: -430 },
    { type: 'storage', position: { x: 25, y: 25 }, rcl: 4, priority: -500 },
  ], storage: { x: 25, y: 25 }, anchors: [], limits: planningLimits,
    observation: { terrain: Array(2500).fill('plain'), objects: [], infrastructure: [],
      constraints: [{ id: 'manual-road', kind: 'locked', type: 'road', position: { x: 28, y: 25 } }] },
    blocksMovement: type => !['road', 'rampart'].includes(type),
    search: () => (_start, goal) => ({ incomplete: false, cost: 4,
      path: goal.x === 28 ? [{ x: 26, y: 25 }, { x: 27, y: 25 }] : [] }),
  };
}
test('manual additions satisfy locks before final validation and become connected road targets', () => {
  expect(finishDraft(input()).ok).toBe(false);
  const result = finishDraft({ ...input(), amendDraft: createOperatorDraftAmendment([road]) });
  if (!result.ok) throw new Error(JSON.stringify(result));
  expect(result.entries.find(entry => entry.position.x === 28)).toMatchObject({ type: 'road', rcl: 2, priority: -77, source: 'operator' });
  expect(result.connections).toHaveLength(1);
  expect(result.entries.filter(entry => entry.type === 'road').map(entry => entry.position.x).sort()).toEqual([26, 27, 28]);
});
test('serialized batch resumes the same amended geometry as uninterrupted road planning', () => {
  const request = { ...input(), amendDraft: createOperatorDraftAmendment([road]) };
  const first = finishDraftBatch(request, 'v1', undefined, 0);
  if (!first.ok || first.done) throw new Error('Missing pending batch');
  const resumed = finishDraftBatch(request, 'v1', JSON.parse(JSON.stringify(first.checkpoint)), 1);
  const direct = finishDraft(request);
  if (!resumed.ok || !resumed.done || !direct.ok) throw new Error('Failed amended draft');
  expect(resumed.entries).toEqual(direct.entries);
  expect(resumed.connections).toEqual(direct.connections);
  const changed = { ...request, amendDraft: createOperatorDraftAmendment([{ ...road, rcl: 3 }]) };
  expect(() => finishDraftBatch(changed, 'v1', first.checkpoint, 1)).toThrow('Stale');
});
test('conflicting manual geometry still fails hard validation', () => {
  const request = input();
  request.observation = { ...request.observation, constraints: [] };
  request.amendDraft = createOperatorDraftAmendment([{ type: 'terminal', x: 25, y: 25, rcl: 6, priority: 0, source: 'operator' }]);
  expect(finishDraft(request)).toMatchObject({ ok: false, phase: 'placement' });
});
test('matching manual entries do not add duplicate targets and snapshots detach source data', () => {
  const manual: PlanEntry = { type: 'storage', x: 25, y: 25, rcl: 4, priority: -777, source: 'operator' };
  const amend = createOperatorDraftAmendment([manual, road]);
  manual.priority = 0;
  const original = input(), result = amend(original.entries, [{ x: 28, y: 25 }]);
  expect(result.anchors).toEqual([{ x: 28, y: 25 }]);
  expect(result.entries.find(entry => entry.type === 'storage')?.priority).toBe(-777);
  expect(original.entries.find(entry => entry.type === 'storage')?.priority).toBe(-500);
});
