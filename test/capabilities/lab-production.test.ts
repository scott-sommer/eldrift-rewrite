import { expect, test } from 'vitest';
import { planProduction } from '../../src/capabilities/industry/production/plan';
import type { ProductionInventory } from '../../src/capabilities/industry/production/model';
const book: Record<string,readonly [string,string]> = { OH: ['H','O'],UH: ['H','U'],UH2O: ['OH','UH'],ZH: ['Z','H'],XUH2O: ['UH2O','X'] };
const recipe = (product: string) => book[product] ?? null;
const target = (product = 'UH2O',amount = 10,priority = 0) => ({ product,amount,priority });
const options = { batch: 100,reactionAmount: 5,inputReserve: 0,maximumNodes: 1024 };
function inventory(stock: Record<string,number>): ProductionInventory { return { total: { ...stock },available: { ...stock },reserveGap: {} }; }

test('a dependency chain schedules missing intermediates before the final product using observed stock',() => {
  const root = [target()], first = inventory({ H: 40,O: 20,U: 20 });
  expect(planProduction(root,first,recipe,options)).toMatchObject({ root: 'UH2O',product: 'OH',target: 10 });
  expect(planProduction(root,inventory({ H: 30,O: 10,U: 20,OH: 10 }),recipe,options)?.product).toBe('UH');
  expect(planProduction(root,inventory({ H: 20,O: 10,U: 10,OH: 10,UH: 10 }),recipe,options)?.product).toBe('UH2O');
  expect(planProduction(root,inventory({ UH2O: 10 }),recipe,options)).toBeNull();
  expect(first.total).toEqual({ H: 40,O: 20,U: 20 });
});

test('shared raw reagent is consumed once across virtual branches; scarce supply reduces the root window',() => {
  expect(planProduction([target()],inventory({ H: 10,O: 10,U: 10 }),recipe,options)).toMatchObject({ product: 'OH',target: 5 });
  expect(planProduction([target()],inventory({ H: 5,O: 10,U: 10 }),recipe,options)).toBeNull();
});

test('priority order chooses feasible targets without manufacturing dependencies for an impossible higher target',() => {
  const targets = [target('UH2O',10,2),target('ZH',5,1),target('XUH2O',10,0)];
  expect(planProduction(targets,inventory({ H: 100,O: 100,U: 100,Z: 20 }),recipe,options)).toMatchObject({ root: 'ZH',product: 'ZH' });
  expect(planProduction([target('ZH',5,2),target('OH',5,2)],inventory({ H: 10,Z: 10,O: 10 }),recipe,options)?.root).toBe('ZH');
});

test('input floors and future warehouse reserve gaps are funded in manufactured intermediate goals',() => {
  const stock = inventory({ H: 100,O: 100,U: 100 });
  expect(planProduction([target()],stock,recipe,{ ...options,inputReserve: 5 })).toMatchObject({ product: 'OH',target: 15 });
  stock.reserveGap = { OH: 5,UH: 5 };
  expect(planProduction([target()],stock,recipe,{ ...options,inputReserve: 5 })).toMatchObject({ product: 'OH',target: 20 });
});

test('only unclaimed availability may fund a chain, while already manufactured inventory counts toward goals',() => {
  const stock = inventory({ H: 40,O: 20,U: 20 }); stock.available = { H: 0,O: 20,U: 20 };
  expect(planProduction([target()],stock,recipe,options)).toBeNull();
  expect(planProduction([target('OH')],inventory({ OH: 9,H: 10,O: 10 }),recipe,options)).toBeNull();
});

test('root windows and rounding use the injected reaction quantum',() => {
  expect(planProduction([target('OH',10)],inventory({ H: 100,O: 100 }),recipe,{ ...options,batch: 6,reactionAmount: 3 })).toMatchObject({ product: 'OH',target: 6 });
});

test('cycles, unknown targets, duplicate targets and bounded work are refused before real effects',() => {
  const cycle = (product: string): readonly [string,string] | null => product === 'A' ? ['B','H'] : product === 'B' ? ['A','O'] : null;
  expect(() => planProduction([target('A')],inventory({ H: 100,O: 100 }),cycle,options)).toThrow('Cyclic');
  expect(() => planProduction([target('OH'),target('unknown')],inventory({ H: 100,O: 100 }),recipe,options)).toThrow('Unknown');
  expect(() => planProduction([target(),target()],inventory({}),recipe,options)).toThrow('targets');
  expect(() => planProduction([target()],inventory({ H: 100,O: 100,U: 100 }),recipe,{ ...options,maximumNodes: 1 })).toThrow('budget');
});
