import { expect, test } from 'vitest';
import { createUpgradeBoost } from '../../src/features/work/upgrade-boost';
import type { Envelope } from '../../src/persistence/versioned-state';
function fixture() {
  const records = new Map<string, Envelope>();
  const state = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, structuredClone(value)); } };
  return () => createUpgradeBoost(state, 'W0N1');
}
test('accepted boost requires next-tick body evidence and survives reconstruction until rotation consumes it', () => {
  const make = fixture();
  let calls = 0;
  const unit = { id: 'one', boosted: 0 };
  expect(make().issue(1, unit, () => { calls++; return 0; })).toBe(0);
  expect(make().issue(1, unit, () => { calls++; return 0; })).toBeUndefined();
  expect(make().settled(1, [{ ...unit, boosted: 42 }])).toEqual([]);
  expect(make().settled(2, [unit])).toEqual([]);
  expect(make().settled(2, [{ ...unit, boosted: 42 }])).toEqual(['one']);
  expect(make().settled(3, [{ ...unit, boosted: 42 }])).toEqual(['one']);
  make().consume(['one']);
  expect(make().settled(3, [{ ...unit, boosted: 42 }])).toEqual([]);
  expect(calls).toBe(1);
});
test('unavailable is an explicit skip; rejection/exception and identity replacement do not pretend success', () => {
  const make = fixture();
  const unit = { id: 'one', boosted: 0 };
  expect(() => make().issue(1, unit, () => { throw new Error('unknown'); })).toThrow('unknown');
  expect(make().issue(1, unit, () => 0)).toBeUndefined();
  expect(make().settled(2, [unit])).toEqual([]);
  make().issue(2, unit, () => -4);
  expect(make().settled(3, [unit])).toEqual([]);
  make().issue(3, unit, () => -6);
  expect(make().settled(4, [{ id: 'replacement', boosted: 42 }])).toEqual([]);
  expect(make().settled(4, [unit])).toEqual(['one']);
  make().consume(['one']);
  make().issue(4, unit, () => 0);
  expect(make().settled(5, [unit])).toEqual([]);
});
