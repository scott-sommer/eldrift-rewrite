import { expect, test } from 'vitest';
import { planUpgradeParking } from '../../src/features/work/upgrade-parking';
const pos = (x: number, y: number) => ({ room: 'W0N1', x, y });
test('parking clears controller access, uses distinct standable tiles and retains valid positions', () => {
  const units = Array.from({ length: 8 }, (_, index) => ({ id: String(index), position: pos(20, 20) }));
  units[0]!.position = pos(24, 22);
  const plan = planUpgradeParking(pos(20, 20), pos(23, 22), units, point => !(point.x === 23 && point.y === 22));
  expect(plan.size).toBe(8);
  expect(plan.get('0')).toEqual(pos(24, 22));
  expect(new Set([...plan.values()].map(point => point.x + ':' + point.y)).size).toBe(8);
  expect([...plan.values()].every(point => Math.max(Math.abs(point.x - 20), Math.abs(point.y - 20)) > 1)).toBe(true);
  expect(planUpgradeParking(pos(20, 20), pos(23, 22), [...units].reverse(), point => !(point.x === 23 && point.y === 22))).toEqual(plan);
});
test('parking holds when blocked and supports missing-spawn controller anchor without using exits', () => {
  expect(planUpgradeParking(pos(20, 20), pos(23, 22), [{ id: 'u', position: pos(20, 21) }], () => false).size).toBe(0);
  const plan = planUpgradeParking(pos(1, 1), pos(3, 3), [{ id: 'u', position: pos(1, 2) }], () => true);
  expect([...plan.values()].every(point => point.x > 0 && point.y > 0 && Math.max(point.x - 1, point.y - 1) > 1)).toBe(true);
  expect(plan.size).toBe(1);
});
