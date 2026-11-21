import { expect, test } from 'vitest';
import { selectStockThresholds } from '../../src/capabilities/industry/production/stock-thresholds';
import { defaults } from '../../src/config/model';
import { selectProductionPolicy, productionPolicySignature } from '../../src/features/industry/production-policy';
const recipes: Record<string,readonly [string,string]> = { OH: ['O','H'],UH: ['U','H'],UH2O: ['UH','OH'] };
const recipe = (product: string) => recipes[product] ?? null, target = { product: 'UH2O',amount: 15,priority: 0 };
test('global intermediate demands use terminal-scaled stock targets, not floors on every raw input or bank',() => {
  expect(selectStockThresholds([target],{ OH: 20,UH: 5 },recipe,{ base: 10,perTerminal: 5,terminals: 2 })).toEqual({ targets: [{ product: 'UH',amount: 20,priority: 0 },{ product: 'UH2O',amount: 15,priority: 1 }],selection: { index: 0,product: 'UH2O',amount: 15 },intermediate: 20 });
  expect(selectStockThresholds([target],{},recipe,{ base: 10,perTerminal: 0,terminals: 0 }).targets.map(item => item.product)).toEqual(['OH','UH','UH2O']);
});
test('duplicate final thresholds retain their own priority boundary instead of merging into an early larger deficit',() => {
  const thresholds = [{ product: 'OH',amount: 10,priority: 0 },{ product: 'UH',amount: 7,priority: 1 },{ product: 'OH',amount: 30,priority: 2 }], options = { base: 0,perTerminal: 0,terminals: 0 };
  expect(selectStockThresholds(thresholds,{ OH: 15 },recipe,options).selection).toMatchObject({ index: 1,product: 'UH' });
  expect(selectStockThresholds(thresholds,{ OH: 15,UH: 7 },recipe,options).targets).toEqual([{ product: 'OH',amount: 30,priority: 0 }]);
  expect(selectStockThresholds(thresholds,{ OH: 30,UH: 7 },recipe,options).targets).toEqual([]);
});
test('cyclic graphs, invalid observations, excessive terminal scaling and dependency breadth refuse',() => {
  const options = { base: 0,perTerminal: 0,terminals: 0 }, cycle = (product: string): readonly [string,string] | null => product === 'A' ? ['B','H'] : product === 'B' ? ['A','H'] : null;
  expect(() => selectStockThresholds([{ product: 'A',amount: 5,priority: 0 }],{},cycle,options)).toThrow('Cyclic');
  expect(() => selectStockThresholds([target],{ OH: NaN },recipe,options)).toThrow('stock');
  expect(() => selectStockThresholds([target],{},recipe,{ base: 1000000,perTerminal: 1,terminals: 1 })).toThrow('bounds');
  expect(() => selectStockThresholds([target],{},recipe,{ ...options,terminals: 51 })).toThrow('terminal');
  const chain = (product: string): readonly [string,string] | null => /^P\d+$/.test(product) && Number(product.slice(1)) < 17 ? ['P'+(Number(product.slice(1))+1),'H'] : null;
  expect(() => selectStockThresholds([{ product: 'P0',amount: 5,priority: 0 }],{},chain,options)).toThrow('Too many');
});
test('durable context is stable while intermediate deficits change, and ordinary target context remains compatible',() => {
  const policy = { ...defaults,labProductionPolicy: 'thresholds' as const,labProductionThresholds: [target],labIntermediateBase: 10,labIntermediatePerTerminal: 0 };
  const a = selectProductionPolicy(policy,{},0,recipe), b = selectProductionPolicy(policy,{ OH: 10 },0,recipe);
  expect(a.context).toEqual(b.context); expect(a.targets).not.toEqual(b.targets);
  expect(selectProductionPolicy(defaults,{},0,recipe).context).toBe(defaults.labProductionTargets);
  expect(productionPolicySignature(defaults)).toBe(productionPolicySignature({ ...defaults,labIntermediateBase: 4 }));
});
