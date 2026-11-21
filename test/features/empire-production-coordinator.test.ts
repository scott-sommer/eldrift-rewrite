import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createEmpireProductionStore } from '../../src/features/industry/empire-production/store';
import { coordinateEmpireProduction } from '../../src/features/industry/empire-production/coordinator';
const recipe = (product: string) => product === 'OH' ? ['H','O'] as const : null;
function fixture() {
  let memory = {}; const state = createMemoryPort(() => memory), settled = new Set<string>();
  const store = createEmpireProductionStore(state,home => settled.has(home));
  const rooms = ['W0N1','W1N1'].map(home => ({ home,inventory: { total: { H: 100,O: 100 } as Record<string,number>,available: { H: 100,O: 100 },reserveGap: {} },ready: true,options: { batch: 10,reactionAmount: 5,inputReserve: 0,maximumNodes: 1024 } }));
  const input = { context: 'policy',targets: [{ product: 'OH',amount: 15,priority: 0 }],stock: {} as Record<string,number>,rooms,visible: new Set(rooms.map(room => room.home)),maximumNodes: 10000 };
  return { store,input,settled,run: () => coordinateEmpireProduction(store,input,recipe),reset: () => { memory = JSON.parse(JSON.stringify(memory)); } };
}
test('repeated scheduling/reset keeps one shared15window split10/5 and observed progress creates no duplicate',() => {
  const f = fixture(); expect(f.run().map(item => item.amount)).toEqual([10,5]); f.reset(); expect(f.run().map(item => item.amount)).toEqual([10,5]);
  f.input.rooms[0]!.inventory.total.OH = 5; f.input.stock.OH = 5;
  expect(f.run().map(item => item.remaining)).toEqual([5,5]); expect(f.run().map(item => item.remaining)).toEqual([5,5]);
  f.input.rooms[0]!.inventory.total.OH = 10; f.input.rooms[1]!.inventory.total.OH = 5; f.input.stock.OH = 15;
  expect(f.run().every(item => item.retiring)).toBe(true); f.settled.add('W0N1'); f.settled.add('W1N1'); expect(f.run()).toEqual([]);
});
test('changed context retires existing work and replacement waits for settlement',() => {
  const f = fixture(); f.run(); f.input.context = 'new'; expect(f.run().every(item => item.retiring && item.context === 'policy')).toBe(true);
  f.settled.add('W0N1'); const next = f.run(); expect(next.find(item => item.home === 'W0N1')!.context).toBe('new'); expect(next.find(item => item.home === 'W1N1')!.retiring).toBe(true);
});
test('external global stock closes obsolete windows without manufacturing another batch',() => {
  const f = fixture(); f.run(); f.input.stock.OH = 15; expect(f.run().every(item => item.retiring)).toBe(true);
  f.settled.add('W0N1'); f.settled.add('W1N1'); expect(f.run()).toEqual([]);
});
test('unseen commitments are preserved and freeze new admissions even if policy changes',() => {
  const f = fixture(); f.run(); f.input.visible.delete('W1N1'); f.input.rooms = f.input.rooms.filter(room => room.home !== 'W1N1'); f.input.context = 'new'; f.settled.add('W0N1');
  const remaining = f.run(); expect(remaining).toHaveLength(1); expect(remaining[0]).toMatchObject({ home: 'W1N1',context: 'policy',retiring: true,remaining: 5 });
});

test('a visible nonparticipant with confirmed settlement retires/releases rather than freezing admission as unseen',() => {
  const f = fixture(); f.run(); f.input.rooms = f.input.rooms.filter(room => room.home !== 'W1N1'); f.settled.add('W1N1');
  expect(f.run().map(window => window.home)).toEqual(['W0N1']);
  f.input.rooms[0]!.inventory.total.OH = 10; f.input.stock.OH = 10; f.settled.add('W0N1');
  const next = f.run(); expect(next).toHaveLength(1); expect(next[0]).toMatchObject({ home: 'W0N1',amount: 5,remaining: 5,retiring: false });
});
