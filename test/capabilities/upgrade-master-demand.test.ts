import { expect, test } from 'vitest';
import { needsUpgradeMaster } from '../../src/features/work/upgrade-master-demand';
const view = { owned: true, level: 2, storageEnergy: 260000, terminal: true };
test('low-RCL recruitment preserves the strict legacy stock threshold', () => {
  expect(needsUpgradeMaster(view, 260000)).toBe(false);
  expect(needsUpgradeMaster({ ...view, storageEnergy: 260001 }, 260000)).toBe(true);
  expect(needsUpgradeMaster({ ...view, owned: false, storageEnergy: 300000 }, 260000)).toBe(false);
  expect(needsUpgradeMaster({ owned: true, level: 6, terminal: true }, 260000)).toBe(false);
});
test('mature terminal-backed masters remain eligible including RCL8, independent of retained energy', () => {
  for (const level of [6, 7, 8]) expect(needsUpgradeMaster({ ...view, level, storageEnergy: 0 }, 260000)).toBe(true);
  expect(needsUpgradeMaster({ ...view, level: 6, terminal: false }, 260000)).toBe(false);
  expect(() => needsUpgradeMaster(view, -1)).toThrow();
});
