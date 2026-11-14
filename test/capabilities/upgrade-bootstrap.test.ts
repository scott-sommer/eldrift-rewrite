import { expect, test } from 'vitest';
import { upgradeBootstrapDemand, type UpgradeBootstrapView } from '../../src/features/work/upgrade-bootstrap-policy';
import { upgradeBootstrapBody } from '../../src/features/work/upgrade-bootstrap-body';
const policy = { enabled: true, fleetActive: true, storageFloor: 200000, workers: 7, haulers: 8 };
const base: UpgradeBootstrapView = { owned: true, level: 4, terminal: false, progressRemaining: 1000000, upgraders: 2 };
test('bootstrap counts target upgraders and supports absent storage even with a terminal', () => {
  expect(upgradeBootstrapDemand(base, policy)).toEqual({ workers: 5, haulers: 0 });
  expect(upgradeBootstrapDemand({ ...base, terminal: true }, policy)).toEqual({ workers: 5, haulers: 0 });
  expect(upgradeBootstrapDemand({ ...base, upgraders: 9 }, policy).workers).toBe(0);
});
test('storage and controller boundaries retain the legacy supply and bootstrap rules', () => {
  expect(upgradeBootstrapDemand({ ...base, storageEnergy: 199999 }, policy)).toEqual({ workers: 5, haulers: 8 });
  expect(upgradeBootstrapDemand({ ...base, storageEnergy: 200000 }, policy)).toEqual({ workers: 0, haulers: 8 });
  const mature = { ...base, level: 6, storageEnergy: 100000 };
  expect(upgradeBootstrapDemand(mature, policy).haulers).toBe(8);
  expect(upgradeBootstrapDemand({ ...mature, terminal: true }, policy).haulers).toBe(0);
  expect(upgradeBootstrapDemand({ ...mature, storageEnergy: 200000 }, policy).haulers).toBe(0);
});
test('RCL5 supply stops only above the remaining-progress margin', () => {
  const room = { ...base, level: 5, storageEnergy: 100000, progressRemaining: 105000 };
  expect(upgradeBootstrapDemand(room, policy).haulers).toBe(8);
  expect(upgradeBootstrapDemand({ ...room, progressRemaining: 104999 }, policy).haulers).toBe(0);
});
test('ownership, level, operator and fleet gates cancel all demand', () => {
  for (const view of [{ ...base, owned: false }, { ...base, level: 8 }]) {
    expect(upgradeBootstrapDemand(view, policy)).toEqual({ workers: 0, haulers: 0 });
  }
  for (const gate of [{ ...policy, enabled: false }, { ...policy, fleetActive: false }]) {
    expect(upgradeBootstrapDemand(base, gate)).toEqual({ workers: 0, haulers: 0 });
  }
});
test('bootstrap body preserves low-budget mobility and the six-WORK capped recipe', () => {
  expect(upgradeBootstrapBody(249)).toBeUndefined();
  expect(upgradeBootstrapBody(250)?.parts).toEqual(['work', 'carry', 'move', 'move']);
  expect(upgradeBootstrapBody(1299)?.cost).toBe(1250);
  expect(upgradeBootstrapBody(1300)?.parts.filter(part => part === 'work')).toHaveLength(6);
  expect(upgradeBootstrapBody(1300)?.cost).toBe(1300);
  expect(upgradeBootstrapBody(10000)?.parts).toHaveLength(40);
  expect(upgradeBootstrapBody(10000)?.cost).toBe(2300);
  expect(() => upgradeBootstrapBody(-1)).toThrow();
});
