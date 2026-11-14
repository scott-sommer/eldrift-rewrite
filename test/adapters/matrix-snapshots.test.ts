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


test('vision loss discards visible matrices and changes the path topology revision', () => {
  let tick = 1;
  let visible = true;
  const matrix = { clone: () => ({ get: () => 255 }) } as unknown as CostMatrix;
  const snapshots = createMatrixSnapshots(room => ({
    matrix: visible ? matrix : undefined, visible, version: visible ? room + ':obstacle' : 'unseen:' + room,
  }), () => tick);
  const options = { roadCost: 1, avoidUnits: false };
  const seen = snapshots.prepare(['W0N0'], options);
  expect(seen.matrix('W0N0')!.get(20, 20)).toBe(255);
  visible = false;
  tick++;
  const lost = snapshots.prepare(['W0N0'], options);
  expect(lost.matrix('W0N0')).toBeUndefined();
  expect(lost.version).not.toBe(seen.version);
  visible = true;
  tick++;
  expect(snapshots.prepare(['W0N0'], options).version).toBe(seen.version);
});
