import { expect, test } from 'vitest';
import { selectUpgradeSupplyDestination, selectUpgradeSupplySource } from '../../src/features/work/upgrade-supply-destination';
const anchor = { room: 'E0N1', x: 20, y: 20 };
const endpoint = (id: string, free = 100) => ({ id, free, position: anchor });
const base = { owned: true, level: 5, anchor, terminal: endpoint('terminal'), master: endpoint('master'), storage: endpoint('storage') };
test('terminal becomes the exclusive destination at RCL6, including waiting when full', () => {
  expect(selectUpgradeSupplyDestination({ ...base, level: 6 })).toEqual({ kind: 'transfer', endpoint: base.terminal });
  expect(selectUpgradeSupplyDestination({ ...base, level: 6, terminal: endpoint('terminal', 0) })).toEqual({ kind: 'wait', endpoint: endpoint('terminal', 0) });
  expect(selectUpgradeSupplyDestination(base)).toEqual({ kind: 'transfer', endpoint: base.master });
});
test('master handoff waits rather than dropping cargo when its store is full', () => {
  expect(selectUpgradeSupplyDestination({ ...base, master: endpoint('master', 0) })).toEqual({ kind: 'wait', endpoint: endpoint('master', 0) });
});
test('storage capacity selects storage delivery or explicit ground delivery at low RCL', () => {
  const room = { owned: true, level: 2, anchor, storage: endpoint('storage', 0) };
  expect(selectUpgradeSupplyDestination(room)).toEqual({ kind: 'ground', anchor });
  expect(selectUpgradeSupplyDestination({ ...room, storage: endpoint('storage') })).toEqual({ kind: 'transfer', endpoint: endpoint('storage') });
  expect(selectUpgradeSupplyDestination({ owned: true, level: 2, anchor })).toEqual({ kind: 'ground', anchor });
  expect(selectUpgradeSupplyDestination({ ...room, owned: false })).toEqual({ kind: 'hold', reason: 'target-not-owned' });
});
test('sponsor terminal threshold preserves equality and handles missing terminal safely', () => {
  const terminal = { id: 'terminal', energy: 100 };
  expect(selectUpgradeSupplySource({ id: 'storage', energy: 69999 }, terminal)).toEqual(terminal);
  expect(selectUpgradeSupplySource({ id: 'storage', energy: 70000 }, terminal)?.id).toBe('storage');
  expect(selectUpgradeSupplySource(undefined, terminal)).toEqual(terminal);
  expect(selectUpgradeSupplySource({ id: 'storage', energy: 1 }, undefined)?.id).toBe('storage');
  expect(selectUpgradeSupplySource({ id: 'storage', energy: 0 }, undefined)).toBeUndefined();
  expect(() => selectUpgradeSupplySource(undefined, terminal, -1)).toThrow();
});
