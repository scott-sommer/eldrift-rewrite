import { expect, test } from 'vitest';
import { runHauling } from '../../src/app/hauling-cycle';
import { createTransferJournal } from '../../src/features/logistics/transfer-journal';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
import type { Envelope } from '../../src/persistence/versioned-state';
const request = { id: 'fill', owner: 'economy', source: 'source', sink: 'sink', resource: 'energy', quantity: 50, priority: 0, expiresAt: 100 };
const binding = { home: 'room', unit: 'unit-id', holder: 'hauler', scope: 'task:hauler', request };
function fixture() {
  const records = new Map<string, Envelope>();
  const state = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, JSON.parse(JSON.stringify(value)) as Envelope); } };
  createLogisticsRequests(state, 'room').submit(request, 1);
  return state;
}
test('assigned hauling request collects and delivers in bounded batches across reconstruction and a full sink', () => {
  const state = fixture();
  const issued: string[] = [];
  const samples = [[1, 0, 100, 30], [2, 30, 70, 30], [3, 0, 70, 0], [4, 0, 70, 20], [5, 20, 50, 20], [6, 0, 50, 0]];
  const outcomes = samples.map(([tick, cargo, sourceStock, sinkFree]) => runHauling(state, binding,
    { tick: tick!, cargo: cargo!, freeCargo: 50 - cargo!, sourceStock: sourceStock!, sinkFree: sinkFree!, sinkPool: 'sink-capacity' }, {
      observe: attempt => ({ tick: tick!, cargo: cargo!, events: [{ source: attempt.kind === 'withdraw' ? 'source' : 'unit-id',
        target: attempt.kind === 'withdraw' ? 'unit-id' : 'sink', resource: 'energy', amount: attempt.amount }] }),
      execute: (_request, phase, amount, id, requestKey) => {
        const kind = phase === 'collect' ? 'withdraw' : 'transfer';
        expect(createTransferJournal(state, 'unit-id').begin({ id, requestKey, unit: 'unit-id', target: phase === 'collect' ? 'source' : 'sink',
          resource: 'energy', room: 'room', kind, tick: tick!, amount, cargoBefore: cargo! })).toBe(true);
        issued.push(phase + ':' + amount);
        return { status: 'running' };
      },
    }));
  expect(issued).toEqual(['collect:30', 'deliver:30', 'collect:20', 'deliver:20']);
  expect(outcomes[2]).toMatchObject({ status: 'blocked', reason: 'logistics-capacity-unavailable' });
  expect(outcomes.at(-1)).toEqual({ status: 'done' });
  expect(createLogisticsRequests(state, 'room').pending(6)).toEqual([]);
  expect(createQuantityReservations(state).list(6)).toEqual([]);
});
test('cancelled requests with cargo fail their assignment for recovery rather than falsely completing delivery', () => {
  const state = fixture();
  createLogisticsRequests(state, 'room').cancel('economy', 'fill');
  const outcome = runHauling(state, binding, { tick: 2, cargo: 20, freeCargo: 30, sourceStock: 0, sinkFree: 100, sinkPool: 'sink-capacity' }, {
    observe: () => ({ tick: 2 }), execute: () => { throw new Error('Must not issue'); },
  });
  expect(outcome).toMatchObject({ status: 'failed', reason: 'orphaned-hauling-cargo' });
});


test('an empty courier releases a depleted source assignment without completing the request', () => {
  const state = fixture();
  const view = { tick: 1, cargo: 0, freeCargo: 50, sourceStock: 50, sinkFree: 100, sinkPool: 'sink-capacity' };
  runHauling(state, binding, view, { observe: () => ({ tick: 1 }), execute: () => ({ status: 'running' }) });
  expect(createQuantityReservations(state).list(1)).toHaveLength(1);
  const outcome = runHauling(state, binding, { ...view, tick: 2, sourceStock: 0 }, {
    observe: () => ({ tick: 2 }), execute: () => { throw new Error('Empty source must not issue'); },
  });
  expect(outcome).toEqual({ status: 'done' });
  expect(createQuantityReservations(state).list(2)).toEqual([]);
  expect(createLogisticsRequests(state, 'room').pending(2)[0]?.quantity).toBe(50);
});

test('a loaded courier still delivers after the source is depleted', () => {
  const state = fixture();
  const issued: string[] = [];
  const outcome = runHauling(state, binding, { tick: 2, cargo: 20, freeCargo: 30, sourceStock: 0, sinkFree: 100, sinkPool: 'sink-capacity' }, {
    observe: () => ({ tick: 2 }), execute: (_request, phase, amount) => { issued.push(phase + ':' + amount); return { status: 'running' }; },
  });
  expect(outcome).toEqual({ status: 'running' });
  expect(issued).toEqual(['deliver:20']);
});

