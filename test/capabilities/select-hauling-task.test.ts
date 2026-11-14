import { expect, test } from 'vitest';
import { selectHaulingTask } from '../../src/app/select-hauling-task';
import { validHaulingPayload } from '../../src/app/hauling-task';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
import type { Envelope } from '../../src/persistence/versioned-state';
const definitions = { haul: { phases: ['work'], validPayload: validHaulingPayload } };
const request = { id: 'fill', owner: 'room', source: 'source', sink: 'sink', resource: 'energy', quantity: 100, priority: 0, expiresAt: 100 };
const unit = { home: 'home', name: 'one', unitId: 'id-one', tick: 1, cargoTotal: 0 };
const view = { tick: 1, cargo: 0, freeCargo: 50, sourceStock: 80, sinkFree: 100, sinkPool: 'sink' };
function fixture() {
  const records = new Map<string, Envelope>();
  const state = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, structuredClone(value)); } };
  const queue = createLogisticsRequests(state, 'home');
  queue.submit(request, 1);
  return { state, queue, records };
}
test('couriers reserve shared stock before competing admission and keep their assigned work', () => {
  const { state, records } = fixture();
  expect(selectHaulingTask(state, definitions, unit, () => view)).toBe(true);
  const original = structuredClone(records.get('tasks/one'));
  expect(selectHaulingTask(state, definitions, unit, () => { throw new Error('Already assigned'); })).toBe(false);
  expect(records.get('tasks/one')).toEqual(original);
  expect(selectHaulingTask(state, definitions, { ...unit, name: 'two', unitId: 'id-two' }, () => view)).toBe(true);
  expect(selectHaulingTask(state, definitions, { ...unit, name: 'three', unitId: 'id-three' }, () => view)).toBe(false);
  const amounts = createQuantityReservations(state).list(1).map(claim => claim.allocations[0]!.amount);
  expect(amounts).toEqual([50, 30]);
});
test('priority order skips unavailable work and does not attach unrelated carried resources', () => {
  const { state, queue, records } = fixture();
  queue.submit({ ...request, id: 'urgent', priority: -1, source: 'empty' }, 1);
  const seen: string[] = [];
  expect(selectHaulingTask(state, definitions, unit, candidate => {
    seen.push(candidate.id);
    return { ...view, sourceStock: candidate.source === 'empty' ? 0 : 80 };
  })).toBe(true);
  expect(seen).toEqual(['urgent', 'fill']);
  expect(records.get('tasks/one')?.data).toMatchObject({ queue: [{ payload: { request: { id: 'fill' } } }] });
  expect(selectHaulingTask(state, definitions, { ...unit, name: 'loaded', cargoTotal: 10 }, () => view)).toBe(false);
});
test('a failed task write releases its admission reservation', () => {
  const { state } = fixture();
  const fault = { ...state, write: (key: string, value: Envelope) => {
    if (key === 'tasks/one' && (value.data as { queue: unknown[] }).queue.length) throw new Error('write failed');
    state.write(key, value);
  } };
  expect(() => selectHaulingTask(fault, definitions, unit, () => view)).toThrow('write failed');
  expect(createQuantityReservations(state).list(1)).toEqual([]);
});

test('indivisible pickups skip partial capacity without reserving or blocking other work', () => {
  const { state, queue, records } = fixture();
  queue.submit({ ...request, id: 'drop', priority: -1, source: 'drop' }, 1);
  expect(selectHaulingTask(state, definitions, unit, candidate => ({ ...view,
    minimumCollection: candidate.id === 'drop' ? 50 : 0, sinkFree: candidate.id === 'drop' ? 30 : 100,
  }))).toBe(true);
  expect(records.get('tasks/one')?.data).toMatchObject({ queue: [{ payload: { request: { id: 'fill' } } }] });
  expect(createQuantityReservations(state).list(1)).toHaveLength(1);
});

test('competing couriers cannot partially reserve an indivisible pickup', () => {
  const { state } = fixture();
  expect(selectHaulingTask(state, definitions, unit, () => ({ ...view, minimumCollection: 50 }))).toBe(true);
  expect(selectHaulingTask(state, definitions, { ...unit, name: 'two', unitId: 'id-two' }, () => ({ ...view, minimumCollection: 50 }))).toBe(false);
  expect(createQuantityReservations(state).list(1)).toHaveLength(1);
});

test('a large courier leaves a small indivisible request for a courier that fits', () => {
  const { state, queue } = fixture();
  queue.cancel(request.owner, request.id);
  queue.submit({ ...request, id: 'small-batch', quantity: 50 }, 1);
  expect(selectHaulingTask(state, definitions, unit, () => ({ ...view, sourceStock: 1000, freeCargo: 250, minimumCollection: 250 }))).toBe(false);
  expect(createQuantityReservations(state).list(1)).toEqual([]);
  expect(selectHaulingTask(state, definitions, { ...unit, name: 'small', unitId: 'small-id' },
    () => ({ ...view, sourceStock: 1000, minimumCollection: 50 }))).toBe(true);
  expect(createQuantityReservations(state).list(1)[0]?.allocations[0]?.amount).toBe(50);
});

test('an injected admission policy defers urgent minerals without observing or reserving them', () => {
  const { state, queue, records } = fixture();
  queue.submit({ ...request, id: 'mineral', resource: 'H', priority: -1 }, 1);
  const seen: string[] = [];
  expect(selectHaulingTask(state, definitions, unit, candidate => {
    seen.push(candidate.id);
    return view;
  }, candidate => candidate.resource === 'energy')).toBe(true);
  expect(seen).toEqual(['fill']);
  expect(records.get('tasks/one')?.data).toMatchObject({ queue: [{ payload: { request: { id: 'fill' } } }] });
  expect(createQuantityReservations(state).list(1)).toHaveLength(1);
  expect(queue.pending(1).map(candidate => candidate.id)).toContain('mineral');
  expect(selectHaulingTask(state, definitions, { ...unit, name: 'normal', unitId: 'normal-id' }, () => view)).toBe(true);
  expect(records.get('tasks/normal')?.data).toMatchObject({ queue: [{ payload: { request: { id: 'mineral' } } }] });
});
