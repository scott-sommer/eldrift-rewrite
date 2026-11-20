import { expect, test } from 'vitest';
import { planEmpireProduction } from '../../src/capabilities/industry/production/empire';
import type { EmpireProductionRoom } from '../../src/capabilities/industry/production/empire';
const book: Record<string,readonly [string,string]> = { OH: ['H','O'],UH: ['H','U'],UH2O: ['OH','UH'] };
const recipe = (product: string) => book[product] ?? null;
function room(home: string,stock: Record<string,number> = { H: 100,O: 100,U: 100 }): EmpireProductionRoom {
  return { home,inventory: { total: { ...stock },available: { ...stock },reserveGap: {} },options: { batch: 10,reactionAmount: 5,inputReserve: 0,maximumNodes: 1024 } };
}
function input(rooms = [room('W1N1'),room('W0N1')]) { return { targets: [{ product: 'OH',amount: 15,priority: 0 }],stock: {},rooms,commitments: [] as { home: string; product: string; amount: number }[],maximumNodes: 1024 }; }
test('shared final deficit funds stable disjoint room windows without duplicating the target',() => {
  const source = input(), before = JSON.stringify(source), result = planEmpireProduction(source,recipe);
  expect(result.map(item => [item.home,item.product,item.amount])).toEqual([['W0N1','OH',10],['W1N1','OH',5]]);
  expect(result.map(item => item.step.target)).toEqual([10,5]); expect(JSON.stringify(source)).toBe(before);
  expect(planEmpireProduction({ ...source,rooms: [...source.rooms].reverse() },recipe)).toEqual(result);
});
test('observed empire product and outstanding commitments count once; a busy room receives no second assignment',() => {
  const source = input(); source.stock = { OH: 5 }; source.commitments = [{ home: 'W0N1',product: 'OH',amount: 5 }];
  expect(planEmpireProduction(source,recipe).map(item => [item.home,item.amount])).toEqual([['W1N1',5]]);
  expect(planEmpireProduction({ ...source,stock: { OH: 15 } },recipe)).toEqual([]);
});
test('root commitments reserve the funded final window even when the first stage manufactures an intermediate',() => {
  const source = { ...input(),targets: [{ product: 'UH2O',amount: 10,priority: 0 }] };
  const result = planEmpireProduction(source,recipe); expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({ home: 'W0N1',product: 'UH2O',amount: 10,step: { root: 'UH2O',product: 'OH',target: 10 } });
});
test('infeasible rooms do not borrow remote stock and lower priorities can use another room',() => {
  const source = input([room('W0N1',{ H: 0,O: 100 }),room('W1N1',{ H: 10,U: 10 })]);
  source.targets.push({ product: 'UH',amount: 10,priority: 1 }); source.stock = { H: 100000,O: 100000 };
  expect(planEmpireProduction(source,recipe)).toMatchObject([{ home: 'W1N1',product: 'UH',amount: 10 }]);
});
test('scope, shared budget, recipes and stock provenance refuse explicitly without partial output',() => {
  const source = input(); expect(() => planEmpireProduction({ ...source,rooms: [source.rooms[0]!,source.rooms[0]!] },recipe)).toThrow('rooms');
  expect(() => planEmpireProduction({ ...source,maximumNodes: 1 },recipe)).toThrow('budget exhausted');
  expect(() => planEmpireProduction({ ...source,rooms: [],targets: [{ product: 'bad',amount: 10,priority: 0 }] },recipe)).toThrow('Unknown');
  expect(() => planEmpireProduction({ ...source,rooms: [room('W0N1',{ OH: 5 })] },recipe)).toThrow('omits local');
  expect(() => planEmpireProduction({ ...source,commitments: [{ home: 'W0N1',product: 'OH',amount: -1 }] },recipe)).toThrow('commitment');
});

test('each room retains its own tighter search cap within the overall empire budget',() => {
  const source = input(), candidate = source.rooms[1]!; candidate.options.maximumNodes = 1;
  source.targets = [{ product: 'UH2O',amount: 10,priority: 0 }];
  expect(() => planEmpireProduction(source,recipe)).toThrow('budget exhausted');
});
