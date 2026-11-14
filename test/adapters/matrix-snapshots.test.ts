import { expect, test } from 'vitest';
import { createMatrixSnapshots } from '../../src/adapters/screeps/matrix-snapshots';
test('matrix snapshots share static work, isolate movers and refresh every tick', () => {
  let tick = 1;
  const calls: string[] = [];
  const snapshots = createMatrixSnapshots((room, options) => {
    calls.push(room);
    return { matrix: undefined, visible: false, version: JSON.stringify([tick, room, options.ignoreUnitId]) };
  }, () => tick);
  const options = { roadCost: 1, avoidUnits: false, ignoreUnitId: 'a' };
  const first = snapshots.prepare(['W0N0', 'E0N0'], options);
  const second = snapshots.prepare(['E0N0', 'W0N0', 'E0N0'], { ...options, ignoreUnitId: 'b' });
  expect(first.version).toBe(second.version);
  expect(calls).toHaveLength(2);
  snapshots.prepare(['W0N0'], { ...options, avoidUnits: true });
  snapshots.prepare(['W0N0'], { ...options, avoidUnits: true, ignoreUnitId: 'b' });
  expect(calls).toHaveLength(4);
  tick++;
  expect(snapshots.prepare(['W0N0', 'E0N0'], options).version).not.toBe(first.version);
  expect(calls).toHaveLength(6);
});
test('searches receive cloned matrices rather than mutable shared snapshots', () => {
  const value = 1;
  const snapshots = createMatrixSnapshots(() => ({
    visible: true, version: 'v1',
    matrix: { clone: () => ({ get: () => value }) } as unknown as CostMatrix,
  }), () => 1);
  const prepared = snapshots.prepare(['W0N0'], { roadCost: 1, avoidUnits: false });
  expect(prepared.matrix('W0N0')).not.toBe(prepared.matrix('W0N0'));
  expect(prepared.matrix('unseen')).toBeUndefined();

});

