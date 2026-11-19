import type { ReservationQuoteResult } from '../../src/features/remotes/reservation/model';
import { expect, test, vi } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createReservationSelection } from '../../src/features/remotes/reservation/selection/cycle';
import { createReservationSelectionStore } from '../../src/features/remotes/reservation/selection/store';
import { reservationQuote } from '../fixtures/reservation-quote';
function fixture() {
  const root = {}, state = createMemoryPort(() => root);
  const request = { tick: 20,identity: 'two-room-policy',rooms: ['E0N1','W0N2'],reads: 1,refreshInterval: 10,maximumAge: 100 };
  const quote = vi.fn((room: string) => reservationQuote('W0N1',room,request.tick));
  const run = () => createReservationSelection(state,'W0N1',quote)(request,() => true);
  return { root,state,request,quote,run,store: createReservationSelectionStore(state,'W0N1') };
}
test('bounded sweeps publish together and survive recreation with stable quote timestamps',() => {
  const f = fixture(); expect(f.run()).toEqual([]); expect(f.quote).toHaveBeenCalledTimes(1);
  f.request.tick++; const published = f.run(); expect(published).toHaveLength(2);
  expect(f.store.read().next).toBe(0);
  f.request.tick = 30; expect(f.run()).toEqual(published); expect(f.quote).toHaveBeenCalledTimes(3);
  f.request.tick++; expect(f.run().map(entry => entry.quote!.observedAt)).toEqual([20,21]);
  expect(f.quote).toHaveBeenCalledTimes(4);
});
test('age refresh advances prices only after a full sweep and expired prices are never returned',() => {
  const f = fixture(); f.request.reads = 2; f.run(); f.request.reads = 1;
  f.request.tick = 80; expect(f.run().map(entry => entry.quote!.observedAt)).toEqual([20,20]);
  f.request.tick++; expect(f.run().map(entry => entry.quote!.observedAt)).toEqual([80,81]);
  f.request.tick = 200; f.request.reads = 0; expect(f.run()).toEqual([]);
});
test('infeasible or observation-deferred rooms do not starve the rest of the bounded sweep',() => {
  const f = fixture();
  const quote = vi.fn((room: string): ReservationQuoteResult => room === 'E0N1' ? { status: 'deferred' as const,reason: 'controller-unknown' } : reservationQuote('W0N1',room,20));
  const run = () => createReservationSelection(f.state,'W0N1',quote)(f.request,() => true);
  run(); expect(run().map(entry => entry.room)).toEqual(['W0N2']);
  quote.mockImplementation(room => room === 'E0N1' ? { status: 'infeasible' as const,reason: 'body-budget' } : reservationQuote('W0N1',room,20));
  run(); run(); expect(f.store.read().entries[0]!.checkedAt).toBe(20);
});
test('changed policy refuses stale published prices while CPU admission is withheld',() => {
  const f = fixture(); f.request.reads = 2; f.run();
  const before = structuredClone(f.root); f.request.identity = 'new-policy';
  expect(createReservationSelection(f.state,'W0N1',f.quote)(f.request,() => false)).toEqual([]);
  expect(f.root).toEqual(before); expect(f.quote).toHaveBeenCalledTimes(2);
  expect(f.run()).toHaveLength(2);
});
test('invalid bounds, omitted candidate identity and corrupt quotes cannot enter selection state',() => {
  const f = fixture(); f.request.reads = 2; f.run();
  f.request.rooms.reverse(); expect(f.run).toThrow('identity omits candidates'); f.request.rooms.reverse();
  f.request.tick = 10; expect(f.run).toThrow('clock regressed'); f.request.tick = 40;
  f.quote.mockImplementation(room => ({ ...reservationQuote('W0N1',room,40),body: { parts: ['move'],cost: 50,spawnTicks: 3 } }));
  expect(f.run).toThrow('Invalid reservation quotation');
  f.request.reads = 65; expect(f.run).toThrow('bounds');
});
test('selection store fences stale writers and validates detached persisted quotes',() => {
  const f = fixture(); f.request.reads = 2; f.run(); const record = f.store.read();
  expect(f.store.save(record.revision-1,record)).toBe(false);
  expect(f.store.save(record.revision,{ ...record,clock: 19 })).toBe(false);
  record.entries[0]!.quote!.body.cost++;
  expect(() => f.store.save(record.revision,record)).toThrow('Invalid reservation selection');
  expect(f.store.read().entries[0]!.quote!.body.cost).toBe(1300);
});

test('persisted selection rejects an invalid cursor or a published sweep from different candidates',() => {
  const f = fixture(); f.request.reads = 2; f.run();
  const record = f.store.read(); record.next = 2;
  expect(() => f.store.save(record.revision,record)).toThrow('Invalid reservation selection');
  record.next = 0; record.published.reverse();
  expect(() => f.store.save(record.revision,record)).toThrow('Invalid reservation selection');
});
