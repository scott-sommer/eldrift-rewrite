import { expect, test } from 'vitest';
import { planUpgradeStations } from '../../src/features/work/upgrade-stations';
const pos = (x: number, y: number) => ({ room: 'W0N1', x, y });
const layout = { storage: pos(21, 22), controller: pos(20, 20), spawn: pos(23, 22), lab: pos(22, 20) };
test('station geometry preserves legacy slot order and validates renewal/boost reach', () => {
  const result = planUpgradeStations(layout, () => true);
  expect(result.status).toBe('ready');
  if (result.status !== 'ready') return;
  expect(result.stations).toEqual([pos(21, 21), pos(20, 21), pos(20, 22), pos(20, 23), pos(21, 23), pos(22, 23), pos(22, 22)]);
});
test('blocked and exit stations are rejected before any action plan is produced', () => {
  expect(planUpgradeStations(layout, position => position.x !== 22 || position.y !== 22)).toEqual({ status: 'invalid', reason: 'blocked-station', slot: 6 });
  expect(planUpgradeStations({ ...layout, storage: pos(1, 22) }, () => true)).toMatchObject({ status: 'invalid', reason: 'blocked-station' });
});
test('room mismatch and inaccessible work structures invalidate the arrangement', () => {
  expect(planUpgradeStations({ ...layout, lab: { ...layout.lab, room: 'E0N1' } }, () => true)).toMatchObject({ reason: 'invalid-layout' });
  expect(planUpgradeStations({ ...layout, controller: pos(10, 10) }, () => true)).toMatchObject({ reason: 'controller-out-of-range' });
  expect(planUpgradeStations({ ...layout, spawn: pos(30, 30) }, () => true)).toMatchObject({ reason: 'spawn-out-of-range' });
  expect(planUpgradeStations({ ...layout, lab: pos(30, 30) }, () => true)).toMatchObject({ reason: 'lab-out-of-range' });
});
