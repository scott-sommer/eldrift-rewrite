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
