import { expect, test } from 'vitest';
import { assessRecovery, defaultRecoveryPolicy } from '../../src/features/recovery/policy';
import { refreshRecovery } from '../../src/features/recovery/store';
import { recoverySchema } from '../../src/features/recovery/schema';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import type { RecoveryDonor } from '../../src/capabilities/recovery/assessment';
const target = { room: 'W0N0', owned: true, level: 5, energy: 9999 };
const donor = (room: string, energy: number, distance: number): RecoveryDonor => ({ room, owned: true, level: 4, energy, distance });
test('recovery hysteresis uses strict entry/exit boundaries and owned controller eligibility', () => {
  const assess = (energy: number, active: boolean) => assessRecovery({ ...target, energy }, active, [], defaultRecoveryPolicy).active;
  expect(assess(10000, false)).toBe(false);
  expect(assess(9999, false)).toBe(true);
  expect(assess(10000, true)).toBe(true);
  expect(assess(49999, true)).toBe(true);
  expect(assess(50000, true)).toBe(false);
  expect(assessRecovery({ ...target, level: 4 }, true, [], defaultRecoveryPolicy).active).toBe(false);
  expect(assessRecovery({ ...target, owned: false }, true, [], defaultRecoveryPolicy).active).toBe(false);
});
test('donors exclude self, unowned, distant and threshold stock; order by distance, stock then room', () => {
  const donors = [donor('W0N0', 100000, 0), donor('W1N0', 75000, 1), donor('W2N0', 75001, 4),
    donor('W3N0', 90000, 1), donor('W4N0', 100000, 1), donor('W5N0', 100000, 5), { ...donor('W6N0', 100000, 1), owned: false }];
  const result = assessRecovery(target, false, donors, defaultRecoveryPolicy);
  expect(result.donors.map(item => item.room)).toEqual(['W4N0', 'W3N0', 'W2N0']);
  expect(result.donors.every(item => item.requestedEnergy === 25000)).toBe(true);
  expect(assessRecovery({ ...target, energy: 50000 }, true, donors, defaultRecoveryPolicy).donors).toEqual([]);
});
test('persisted cadence survives reconstruction and avoids observing donors before the next assessment', () => {
  let memory = {};
  let state = createMemoryPort(() => memory);
  let observations = 0;
  const donors = () => { observations++; return [donor('W1N0', 80000, 1)]; };
  expect(refreshRecovery(state, target, donors, defaultRecoveryPolicy, true, 10).active).toBe(true);
  memory = JSON.parse(JSON.stringify(memory)); state = createMemoryPort(() => memory);
  expect(refreshRecovery(state, { ...target, energy: 50000 }, donors, defaultRecoveryPolicy, true, 259).active).toBe(true);
  expect(observations).toBe(1);
  expect(refreshRecovery(state, { ...target, energy: 50000 }, donors, defaultRecoveryPolicy, true, 260).active).toBe(false);
  expect(observations).toBe(2);
});
test('configuration changes, disable and loss of eligibility invalidate persisted recovery immediately', () => {
  const memory = {};
  const state = createMemoryPort(() => memory);
  refreshRecovery(state, target, () => [], defaultRecoveryPolicy, true, 1);
  expect(refreshRecovery(state, target, () => [], { ...defaultRecoveryPolicy, exitEnergy: 9999, enterEnergy: 1000 }, true, 2).active).toBe(false);
  refreshRecovery(state, target, () => [], defaultRecoveryPolicy, true, 3);
  expect(refreshRecovery(state, target, () => { throw new Error('disabled donor scan'); }, defaultRecoveryPolicy, false, 4).active).toBe(false);
  refreshRecovery(state, target, () => [], defaultRecoveryPolicy, true, 5);
  expect(refreshRecovery(state, { ...target, owned: false }, () => [], defaultRecoveryPolicy, true, 6).active).toBe(false);
  expect(recoverySchema(target.room).valid({ room: target.room, active: false, checkedAt: 6, energy: 9999, policyKey: '',
    donors: [{ room: 'W1N0', distance: 1, requestedEnergy: 25000 }] })).toBe(false);
});
test('invalid recovery configuration and duplicate donors fail before saving a new assessment', () => {
  expect(() => assessRecovery(target, false, [], { ...defaultRecoveryPolicy, enterEnergy: 50000 })).toThrow();
  expect(() => assessRecovery(target, false, [donor('W1N0', 80000, 1), donor('W1N0', 90000, 2)], defaultRecoveryPolicy)).toThrow('Duplicate');
  expect(() => assessRecovery({ ...target, energy: NaN }, false, [], defaultRecoveryPolicy)).toThrow();
});
