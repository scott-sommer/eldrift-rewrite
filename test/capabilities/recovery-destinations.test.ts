import { expect, test } from 'vitest';
import { recoveryPriority } from '../../src/features/logistics/recovery-destinations';
const rank = (kind: string, free: number, resource = 'H', owned = true, reserve = 50000) =>
  recoveryPriority({ kind, free, owned }, resource, reserve);
test('mineral recovery prefers terminal above configured headroom and storage at the boundary', () => {
  expect(rank('terminal', 50001)).toBeLessThan(rank('storage', 100)!);
  expect(rank('terminal', 50000)).toBeGreaterThan(rank('storage', 100)!);
  expect(rank('terminal', 20, 'H', true, 10)).toBe(-1);
  expect(rank('terminal', 20, 'H', true, 20)).toBe(1);
});
test('energy retains durable store ordering and specialized energy fallback', () => {
  expect(['storage', 'terminal', 'spawn', 'extension', 'container'].map(kind => rank(kind, 100000, 'energy'))).toEqual([0, 1, 2, 3, 4]);
  expect(rank('spawn', 100, 'H')).toBeUndefined();
  expect(rank('extension', 100, 'H')).toBeUndefined();
});
test('full, hostile and unsupported destinations cannot admit cargo', () => {
  expect(rank('terminal', 0)).toBeUndefined();
  expect(rank('storage', 100, 'H', false)).toBeUndefined();
  expect(rank('terminal', 100000, 'H', false)).toBeUndefined();
  expect(rank('lab', 100)).toBeUndefined();
  expect(rank('container', 100, 'H', false)).toBe(4);
});
