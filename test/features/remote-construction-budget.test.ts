import { expect, test } from 'vitest';
import { allocateRemoteConstruction, remoteConstructionBody } from '../../src/features/remotes/infrastructure/worker-budget';
import { remoteConstructionOwner, remoteConstructionIdentity } from '../../src/features/remotes/infrastructure/worker-identity';
import { resolveConfig } from '../../src/config/resolve';
const budget = { storageEnergy: 3000,storageReserve: 1000,spawnEnergy: 600,maximumWorkers: 2,liveWorkers: 0,additionalSlots: 2 };
const candidate = (owner: string, remainingEnergy = 1200) => ({ owner,remainingEnergy,carriedEnergy: 0,effective: false,present: false,bodyCost: 300 });
test('home-wide capital cannot fund the same remaining work twice and includes already-carried supply',() => {
  expect(allocateRemoteConstruction([candidate('a'),candidate('b')],budget)).toEqual(['a']);
  expect(allocateRemoteConstruction([{ ...candidate('a'),present: true,effective: true,carriedEnergy: 100 },candidate('b',900)],{ ...budget,liveWorkers: 1 })).toEqual(['a','b']);
});
test('worker slots, spawn energy and body budgets constrain additions separately from stored capital',() => {
  expect(allocateRemoteConstruction([candidate('a')],{ ...budget,spawnEnergy: 299 })).toEqual([]);
  expect(allocateRemoteConstruction([candidate('a')],{ ...budget,additionalSlots: 0 })).toEqual([]);
  expect(allocateRemoteConstruction([candidate('a')],{ ...budget,liveWorkers: 2 })).toEqual([]);
  expect(remoteConstructionBody(299)).toBeUndefined(); expect(remoteConstructionBody(300)?.parts).toEqual(['work','carry','carry','move','move']);
});
test('existing work has priority and completion or insufficient funding withdraws demand',() => {
  expect(allocateRemoteConstruction([candidate('a'),{ ...candidate('b'),present: true,effective: true }],{ ...budget,liveWorkers: 1 })).toEqual(['b']);
  expect(allocateRemoteConstruction([candidate('a',0)],budget)).toEqual([]);
  expect(allocateRemoteConstruction([candidate('a')],{ ...budget,storageEnergy: 1000 })).toEqual([]);
});
test('generation-scoped ownership is portable and malformed construction identities are refused',() => {
  const identity = { home: 'W0N1',room: 'E0N1',generation: 7 }, owner = remoteConstructionOwner(identity);
  expect(remoteConstructionIdentity(owner)).toEqual(identity); expect(remoteConstructionIdentity('remote-construction:["W0N1","E0N1",0]')).toBeUndefined();
  expect(remoteConstructionIdentity('other')).toBeUndefined(); expect(() => remoteConstructionOwner({ ...identity,generation: 0 })).toThrow();
});
test('construction controls default off and validate bounded values without changing source worker controls',() => {
  const config = resolveConfig({},1).values; expect(config.remoteConstructionWorkersEnabled).toBe(false); expect(config.remoteConstructionEnergyReserve).toBe(50000);
  expect(resolveConfig({ empire: { remoteConstructionWorkersEnabled: true,remoteConstructionMaximumWorkers: 1,remoteConstructionBodyBudget: 300,remoteConstructionEnergyReserve: 0 } },1).values.remoteConstructionMaximumWorkers).toBe(1);
  expect(() => resolveConfig({ empire: { remoteConstructionMaximumWorkers: 21 } },1)).toThrow();
});
