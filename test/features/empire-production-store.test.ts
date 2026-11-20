import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createEmpireProductionStore } from '../../src/features/industry/empire-production/store';
import { planEmpireProduction } from '../../src/capabilities/industry/production/empire';
const options = { batch: 10,reactionAmount: 5,inputReserve: 0,maximumNodes: 1024 };
const book: Record<string,readonly [string,string]> = { OH: ['H','O'],UH: ['H','U'],UH2O: ['OH','UH'] };
const recipe = (product: string) => book[product] ?? null;
const inventory = (stock: Record<string,number>) => ({ total: { ...stock },available: { ...stock },reserveGap: {} });
function fixture(product = 'UH2O') {
  let memory = {}, settled = false; const state = createMemoryPort(() => memory);
  const store = () => createEmpireProductionStore(state,() => settled), stock = inventory({ H: 40,O: 20,U: 20 });
  const assignments = planEmpireProduction({ targets: [{ product,amount: 10,priority: 0 }],stock: {},rooms: [{ home: 'W0N1',inventory: stock,options }],commitments: [],maximumNodes: 1024 },recipe);
  const admission = { ...assignments[0]!,rootStock: 0 };
  return { state,store,admission,stock,raw: () => JSON.stringify(memory),reset: () => { memory = JSON.parse(JSON.stringify(memory)); },settle: () => { settled = true; } };
}
test('absent reads/empty admission do not initialize; admission and replay are detached across reset',() => {
  const f = fixture(), api = f.store(); expect(api.list()).toEqual([]); expect(api.admit('policy',[])).toBe(false); expect(f.raw()).toBe('{}');
  expect(api.admit('policy',[f.admission])).toBe(true); f.reset(); expect(f.store().admit('policy',[f.admission])).toBe(false);
  const list = api.list(); list[0]!.step!.target = 999; expect(api.list()[0]!.step!.target).toBe(10);
});
test('intermediate chain progress keeps original window/context and advances only after observation',() => {
  const f = fixture(), api = f.store(); api.admit('policy',[f.admission]);
  api.observe('W0N1',inventory({ H: 30,O: 10,U: 20,OH: 5 }),recipe,options); expect(api.list()[0]!.step!.product).toBe('OH');
  api.observe('W0N1',inventory({ H: 30,O: 10,U: 20,OH: 10 }),recipe,options); expect(api.list()[0]!.step!.product).toBe('UH'); f.reset();
  api.observe('W0N1',inventory({ H: 20,O: 10,U: 10,OH: 10,UH: 10 }),recipe,options); expect(api.list()[0]).toMatchObject({ context: 'policy',amount: 10,remaining: 10,rootTarget: 10,step: { product: 'UH2O',target: 10 } });
  expect(api.admit('policy',[f.admission])).toBe(false);
});
test('observed final progress cannot be resurrected by subsequent consumption',() => {
  const f = fixture('OH'), api = f.store(); api.admit('policy',[f.admission]);
  api.observe('W0N1',inventory({ OH: 5,H: 10,O: 10 }),recipe,options); expect(api.list()[0]!.remaining).toBe(5); f.reset();
  api.observe('W0N1',inventory({ H: 10,O: 10 }),recipe,options); expect(api.list()[0]).toMatchObject({ remaining: 5,step: { target: 5 } });
  api.observe('W0N1',inventory({ OH: 5 }),recipe,options); expect(api.list()[0]).toMatchObject({ remaining: 0,retiring: true });
});
test('completed or cancelled windows remain room commitments until the caller proves admitted work settled',() => {
  const f = fixture(), api = f.store(); api.admit('policy',[f.admission]); api.observe('W0N1',inventory({ UH2O: 10 }),recipe,options);
  expect(api.list()[0]).toMatchObject({ retiring: true,remaining: 0 }); expect(api.release('W0N1')).toBe(false);
  api.observe('W0N1',inventory({}),recipe,options); expect(api.list()[0]!.remaining).toBe(0);
  f.settle(); expect(api.release('W0N1')).toBe(true); expect(api.list()).toEqual([]);
  api.admit('next',[f.admission]); api.retire('W0N1'); expect(api.list()[0]!.remaining).toBe(10); expect(api.release('W0N1')).toBe(true);
});
test('conflicting bulk admissions validate before one write and cannot overwrite another window',() => {
  const f = fixture(), api = f.store(); api.admit('policy',[f.admission]); const before = f.raw();
  expect(() => api.admit('changed',[{ ...f.admission,home: 'W1N1' },f.admission])).toThrow('Conflicting'); expect(f.raw()).toBe(before);
  expect(() => api.admit('policy',[{ ...f.admission,home: 'W1N1',rootStock: -1 }])).toThrow('baseline'); expect(f.raw()).toBe(before);
});
test('lost visibility alone makes no state change, and future state refuses rather than being reset',() => {
  const f = fixture(), api = f.store(); api.admit('policy',[f.admission]); const before = f.raw(); f.reset(); expect(api.list()).toHaveLength(1); expect(f.raw()).toBe(before);
  f.state.write('industry-empire-production/empire',{ owner: 'industry',version: 2,data: { windows: [] } }); const future = f.raw();
  expect(() => api.list()).toThrow('future'); expect(() => api.admit('policy',[f.admission])).toThrow('future'); expect(f.raw()).toBe(future);
});

test('unfundable next stages remain blocked and retry when local inventory changes',() => {
  const f = fixture(), api = f.store(); api.admit('policy',[f.admission]);
  api.observe('W0N1',inventory({ OH: 10 }),recipe,options); expect(api.list()[0]).toMatchObject({ step: null,remaining: 10,retiring: false });
  api.observe('W0N1',inventory({ OH: 10,H: 10,U: 10 }),recipe,options); expect(api.list()[0]!.step!.product).toBe('UH');
});
test('union capacity and duplicate scopes refuse the whole admission without writes',() => {
  const f = fixture(), api = f.store(); api.admit('policy',[f.admission]); const before = f.raw();
  expect(() => api.admit('policy',[f.admission,f.admission])).toThrow('scope');
  const extra = Array.from({ length: 50 },(_,i) => ({ ...f.admission,home: 'W'+(i+1)+'N1' }));
  expect(() => api.admit('policy',extra)).toThrow('windows'); expect(f.raw()).toBe(before);
});
