import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { selectLabProduction, clearLabProduction } from '../../src/features/industry/production';
const options = { batch: 100,reactionAmount: 5,inputReserve: 0,maximumNodes: 1024 };
function fixture() {
  let memory = {}; const state = createMemoryPort(() => memory);
  const stock = { total: { H: 40,O: 20,U: 20 } as Record<string,number>,available: { H: 40,O: 20,U: 20 } as Record<string,number>,reserveGap: {} };
  const targets = [{ product: 'UH2O',amount: 10,priority: 0 }];
  const book: Record<string,readonly [string,string]> = { OH: ['H','O'],UH: ['H','U'],UH2O: ['OH','UH'] };
  const recipe = (product: string) => book[product] ?? null;
  const run = (context = 'same') => selectLabProduction(state,'home',context,targets,stock,recipe,options);
  return { state,stock,targets,book,run,reset: () => { memory = JSON.parse(JSON.stringify(memory)); } };
}

test('an in-progress production goal stays absolute across JSON reset and observed partial production',() => {
  const f = fixture(), first = f.run(); expect(first).toMatchObject({ product: 'OH',target: 10 });
  f.stock.total.OH = 5; f.stock.available.OH = 5; f.reset(); expect(f.run()).toEqual(first);
  f.stock.total.OH = 10; f.stock.available.OH = 10;
  expect(f.run()).toMatchObject({ product: 'UH',target: 10 });
});

test('completed root goals, changed policy and changed chemistry release obsolete steps',() => {
  const f = fixture(); f.run(); f.stock.total.UH2O = 10; expect(f.run()).toBeNull();
  delete f.stock.total.UH2O; expect(f.run()).not.toBeNull(); f.targets[0]!.amount = 0;
  expect(f.run('changed')).toBeNull(); f.targets[0]!.amount = 10; f.run('old');
  f.book.OH = ['O','H']; expect(f.run('old')?.reagents).toEqual(['O','H']);
});

test('clearing production is owned and leaves unrelated assignment/request state intact',() => {
  const f = fixture(); f.run(); f.state.write('unrelated/keep',{ owner: 'other',version: 1,data: { retained: true } });
  clearLabProduction(f.state,'home'); clearLabProduction(f.state,'home');
  expect(f.state.read('industry-production/home')).toMatchObject({ data: { context: '',step: null } });
  expect(f.state.read('unrelated/keep')).toMatchObject({ data: { retained: true } });
});

test('future persisted production state is refused',() => {
  const f = fixture(); f.state.write('industry-production/home',{ owner: 'industry',version: 2,data: { context: '',step: null } });
  expect(f.run).toThrow('future');
});
