import { expect, test } from 'vitest';
import { initialUpgradeRotation, defaultUpgradeRotation } from '../../src/features/work/upgrade-rotation-model';
import type { UpgradeRotationObservation } from '../../src/features/work/upgrade-rotation-model';
import { planUpgradeRotation } from '../../src/features/work/upgrade-rotation';
import { advanceUpgradeRotation } from '../../src/features/work/upgrade-rotation-store';
import { upgradeRotationSchema } from '../../src/features/work/upgrade-rotation-schema';
import type { Envelope } from '../../src/persistence/versioned-state';
const observation = (tick: number, ttl = 9): UpgradeRotationObservation => ({ tick, enabled: true,
  members: [{ id: 'old', ttl }], empireEnergy: 2700000, ownedRooms: 2, settledBoosts: [] });
test('renewal persists, rotates only above1490 observed TTL, and boost completion survives reset', () => {
  const records = new Map<string, Envelope>();
  const port = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, structuredClone(value)); } };
  const first = advanceUpgradeRotation(port, 'W0N1', observation(1));
  expect(first).toMatchObject({ renew: 'old', rotated: false, shortage: false });
  expect(first.state.slots).toEqual([{ unit: 'old', slot: 6 }]);
  expect(advanceUpgradeRotation(port, 'W0N1', observation(1)).renew).toBeUndefined();
  expect(advanceUpgradeRotation(port, 'W0N1', observation(2, 1490)).renew).toBe('old');
  const renewed = advanceUpgradeRotation(port, 'W0N1', observation(3, 1491));
  expect(renewed).toMatchObject({ rotated: true, boost: 'old' });
  expect(renewed.state.slots).toEqual([{ unit: 'old', slot: 0 }]);
  expect(advanceUpgradeRotation(port, 'W0N1', observation(4, 1490)).boost).toBe('old');
  const settled = advanceUpgradeRotation(port, 'W0N1', { ...observation(5, 1489), settledBoosts: ['old'] });
  expect(settled.state.boosting).toEqual([]);
  expect(advanceUpgradeRotation(port, 'W0N1', observation(6, 1488)).state.slots).toEqual([{ unit: 'old', slot: 6 }]);
});
test.each([1, 2, 3, 4, 5, 6])('strict staggered trigger at slot %i renews the tail, not the triggering peer', slot => {
  const previous = { ...initialUpgradeRotation('W0N1'), lastTick: 0,
    slots: Array.from({ length: 7 }, (_, index) => ({ unit: 'unit' + index, slot: index })) };
  const threshold = defaultUpgradeRotation.thresholds[slot]!;
  const members = previous.slots.map(item => ({ id: item.unit, ttl: item.slot === slot ? threshold : 1000 }));
  const boundary = { ...observation(1), members };
  expect(planUpgradeRotation(previous, boundary).renew).toBeUndefined();
  members[slot]!.ttl--;
  expect(planUpgradeRotation(previous, boundary).renew).toBe('unit6');
});
test('roster changes and identity replacement cannot inherit retirement or renewal state', () => {
  const started = planUpgradeRotation(initialUpgradeRotation('W0N1'), observation(1)).state;
  const previous = planUpgradeRotation(started, { ...observation(2), empireEnergy: 2699999 }).state;
  const next = planUpgradeRotation(previous, { ...observation(3), members: [{ id: 'replacement', ttl: 1500 }, { id: 'new-old', ttl: 8 }] });
  expect(next.state.slots).toEqual([{ unit: 'new-old', slot: 6 }, { unit: 'replacement', slot: 5 }]);
  expect(next.renew).toBe('new-old');
  expect(next.state.boosting).toEqual([]);
  expect(previous.renewing).toBe('old');
});
test('energy shortage is strict, retirement is sticky, and disable does not retire the fleet', () => {
  const initial = initialUpgradeRotation('W0N1');
  expect(planUpgradeRotation(initial, observation(1)).renew).toBe('old');
  const low = planUpgradeRotation(initial, { ...observation(1), empireEnergy: 2699999 });
  expect(low).toMatchObject({ shortage: true, rotated: false });
  expect(low.renew).toBeUndefined();
  expect(low.state.retiring).toEqual(['old']);
  expect(planUpgradeRotation(low.state, observation(2)).renew).toBeUndefined();
  const disabled = planUpgradeRotation(initial, { ...observation(1), enabled: false, empireEnergy: 0 });
  expect(disabled.state.retiring).toEqual([]);
  expect(disabled.renew).toBeUndefined();
});
test('invalid roster, state and backwards observations fail instead of corrupting station ownership', () => {
  const initial = initialUpgradeRotation('W0N1');
  expect(() => planUpgradeRotation(initial, observation(-1))).toThrow();
  expect(() => planUpgradeRotation(initial, { ...observation(1), members: [{ id: 'x', ttl: 1 }, { id: 'x', ttl: 2 }] })).toThrow();
  expect(() => planUpgradeRotation(initial, { ...observation(1), members: Array.from({ length: 8 }, (_, id) => ({ id: String(id), ttl: 100 })) })).toThrow();
  expect(upgradeRotationSchema('W0N1').valid({ ...initial, boosting: ['missing'] })).toBe(false);
  expect(upgradeRotationSchema('W0N1').valid({ ...initial, slots: [{ unit: 'a', slot: 6 }, { unit: 'b', slot: 6 }] })).toBe(false);
  const state = planUpgradeRotation(initial, observation(2)).state;
  expect(() => planUpgradeRotation(state, observation(1))).toThrow();
});

test('a seven-member renewal rotates every slot exactly once before the next tail is renewed', () => {
  const previous = { ...initialUpgradeRotation('W0N1'), lastTick: 0,
    slots: Array.from({ length: 7 }, (_, slot) => ({ unit: 'unit' + slot, slot })) };
  const members = previous.slots.map(slot => ({ id: slot.unit, ttl: slot.slot === 6 ? 9 : 1000 }));
  const started = planUpgradeRotation(previous, { ...observation(1), members });
  expect(started.renew).toBe('unit6');
  members[6]!.ttl = 1491;
  const rotated = planUpgradeRotation(started.state, { ...observation(2), members });
  expect(rotated.boost).toBe('unit6');
  expect(rotated.state.slots.map(slot => slot.slot)).toEqual([1, 2, 3, 4, 5, 6, 0]);
  expect(planUpgradeRotation(rotated.state, { ...observation(2), members }).rotated).toBe(false);
  members[5]!.ttl = 9;
  const next = planUpgradeRotation(rotated.state, { ...observation(3), members, settledBoosts: ['unit6'] });
  expect(next.renew).toBe('unit5');
  expect(next.boost).toBeUndefined();
});
