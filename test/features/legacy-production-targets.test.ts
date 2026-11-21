import { expect, test } from 'vitest';
import { legacyProductionTargets } from '../../src/features/industry/legacy-production-targets';
import { createEmpireLabOperator } from '../../src/features/operator/lab-empire';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
test('legacy defaults preserve source ordering, repair exception and symbolic upgrade target',() => {
  expect(legacyProductionTargets()).toEqual(['XZHO2','XLHO2','XZH2O','XLH2O','XUH2O','XKHO2','XGHO2','XGH2O'].map((product,priority) => ({ product,priority,amount: priority === 3 ? 25000 : priority === 7 ? 200000 : 50000 })));
  const targets = legacyProductionTargets({ upgradeProduct: 'GH2O',amounts: { BOOST: 1000,XLH2O: 0 } });
  expect(targets[3]!.amount).toBe(0); expect(targets[7]).toEqual({ product: 'GH2O',amount: 1000,priority: 7 });
  targets[0]!.amount = 1; expect(legacyProductionTargets()[0]!.amount).toBe(50000);
});
test('ambiguous duplicates and malformed overrides refuse rather than silently changing priority semantics',() => {
  for (const options of [{ upgradeProduct: 'XZHO2' },{ amounts: { BOOST: -1 } },{ amounts: { BOOST: Infinity } },{ amounts: { BOOST: 1000001 } }]) expect(() => legacyProductionTargets(options)).toThrow();
  for (const options of [{ amounts: { unexpected: 4 } },{ amounts: null },{ upgradeProduct: null },{ amounts: { BOOST: null } }]) expect(() => legacyProductionTargets(options as never)).toThrow();
});
test('operator preset uses injected native catalog without writing policy or starting production',() => {
  const memory = {}, state = createMemoryPort(() => memory);
  const api = createEmpireLabOperator(state,{ clock: () => 1,homes: () => [],productSupported: product => product !== 'GH2O' });
  expect(api.legacyTargets()).toHaveLength(8); expect(memory).toEqual({});
  expect(() => api.legacyTargets({ upgradeProduct: 'GH2O' })).toThrow('Unsupported'); expect(memory).toEqual({});
  const targets = api.legacyTargets({ amounts: { BOOST: 25 } });
  expect(api.configureEmpire({ labProductionTargets: targets }).changed).toBe(true);
  expect(api.inspectEmpire().values.labReactionsEnabled).toBe(false);
});

test('legacy policy explicitly preserves colliding upgrade threshold priority while leaving ordinary targets unique',() => {
  const memory = {}, state = createMemoryPort(() => memory), api = createEmpireLabOperator(state,{ clock: () => 1,homes: () => [],productSupported: () => true });
  const policy = api.legacyPolicy({ upgradeProduct: 'XZHO2' });
  expect(policy.labProductionThresholds.filter(target => target.product === 'XZHO2').map(target => [target.amount,target.priority])).toEqual([[50000,0],[200000,7]]);
  expect(policy).toMatchObject({ labProductionPolicy: 'thresholds',labIntermediateBase: 1000,labIntermediatePerTerminal: 1000 }); expect(memory).toEqual({});
  expect(api.configureEmpire(policy).changed).toBe(true); expect(() => api.legacyTargets({ upgradeProduct: 'XZHO2' })).toThrow('legacyPolicy');
});
