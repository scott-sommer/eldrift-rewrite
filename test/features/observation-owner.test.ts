import { expect, test, vi } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createObservationStore } from '../../src/features/intel/observation/store';
import { prepareObservation } from '../../src/features/intel/observation/transitions';
import { dispatchObservations, settleObservations } from '../../src/features/intel/observation/cycle';
import type { ObservationRequest } from '../../src/features/intel/observation/model';
const budget = { captures: 4, issues: 4, scans: 32 };
function fixture() {
  const root = {}, port = createMemoryPort(() => root), store = createObservationStore(port);
  const issue = vi.fn<(_observer: string, _request: ObservationRequest) => number>(() => 0), capture = vi.fn(() => true), failure = vi.fn();
  const ports = { store, issue, capture, failure };
  const request = (id: string, home = 'W0N1', priority = 0): ObservationRequest => ({
    id, owner: 'specialist', home, room: 'E0N1', priority, requestedAt: 1, expiresAt: 20 });
  const units = [{ id: 'observer-a', home: 'W0N1' }, { id: 'observer-b', home: 'W1N1' }];
  return { root, port, store, ports, request, units };
}
test('one durable observer intent survives same-tick recreation and captures only next-tick visibility', () => {
  const f = fixture();
  f.store.submit(f.request('low'), 1); f.store.submit(f.request('high', 'W0N1', 10), 1);
  expect(dispatchObservations(1, budget, f.units, f.ports, () => true, () => true).issues).toBe(1);
  expect(f.ports.issue.mock.calls[0]![1].id).toBe('high');
  const resumed = { ...f.ports, store: createObservationStore(f.port) };
  dispatchObservations(1, budget, f.units, resumed, () => true, () => true);
  settleObservations(1, budget, resumed, () => true);
  expect(f.ports.issue).toHaveBeenCalledTimes(1); expect(f.ports.capture).not.toHaveBeenCalled();
  settleObservations(2, budget, resumed, () => true);
  expect(f.store.read().receipts[0]).toMatchObject({ outcome: 'observed', completedAt: 2, issuedAt: 1 });
  dispatchObservations(2, budget, f.units, resumed, () => true, () => true);
  expect(f.ports.issue).toHaveBeenCalledTimes(2);
});
test('missed vision and capture admission do not fabricate observations; expiration is bounded', () => {
  const f = fixture(); f.store.submit(f.request('first'), 1);
  dispatchObservations(1, budget, f.units, f.ports, () => true, () => true);
  settleObservations(2, { ...budget, captures: 0 }, f.ports, () => true);
  expect(f.store.read().flights).toHaveLength(1);
  settleObservations(3, budget, f.ports, () => true);
  expect(f.ports.capture).not.toHaveBeenCalled(); expect(f.store.read().receipts[0]!.outcome).toBe('missed');
  f.store.submit({ ...f.request('short'), expiresAt: 4 }, 3);
  dispatchObservations(3, budget, f.units, f.ports, () => true, () => true);
  expect(f.store.read().requests).toHaveLength(1);
  dispatchObservations(4, budget, f.units, f.ports, () => true, () => true);
  expect(f.store.read().receipts.at(-1)!.outcome).toBe('expired');
});
test('a reset between durable preparation and native acknowledgement cannot repeat the effect', () => {
  const f = fixture(); f.store.submit(f.request('interrupted'), 1);
  expect(prepareObservation(f.store, 'interrupted', 'observer-a', 1)).toBeDefined();
  const ports = { ...f.ports, store: createObservationStore(f.port) };
  dispatchObservations(1, budget, f.units, ports, () => true, () => true);
  expect(f.ports.issue).not.toHaveBeenCalled();
  f.ports.capture.mockReturnValue(false); settleObservations(2, budget, ports, () => true);
  expect(f.store.read().receipts[0]).toMatchObject({ outcome: 'missed', code: null });
});
test('a throwing observer and broken error sink do not prevent another home from issuing', () => {
  const f = fixture(); f.store.submit(f.request('a'), 1); f.store.submit(f.request('b', 'W1N1'), 1);
  f.ports.issue.mockImplementationOnce(() => { throw new Error('native interrupted'); });
  f.ports.failure.mockImplementation(() => { throw new Error('sink failed'); });
  expect(dispatchObservations(1, budget, f.units, f.ports, () => true, () => true).issues).toBe(2);
  expect(f.store.read().receipts[0]!.outcome).toBe('exception'); expect(f.store.read().flights).toHaveLength(1);
  settleObservations(2, budget, f.ports, () => true);
  expect(f.store.read().receipts.at(-1)!.outcome).toBe('observed');
});
test('a small scan budget rotates past disabled requests rather than starving another home', () => {
  const f = fixture();
  for (const id of ['a','b']) f.store.submit(f.request(id), 1);
  f.store.submit(f.request('c', 'W1N1'), 1);
  for (const tick of [1,2,3]) dispatchObservations(tick, { ...budget, scans: 1 }, f.units, f.ports,
    home => home === 'W1N1', () => true);
  expect(f.ports.issue).toHaveBeenCalledTimes(1);
  expect(f.store.read().flights[0]!.request.id).toBe('c');
});
test('missing state reads are inert and duplicate identities, future clocks and queue overflow are checked', () => {
  const f = fixture(); expect(f.store.read().requests).toEqual([]); expect(f.root).toEqual({});
  expect(() => f.store.submit({ ...f.request('future'), requestedAt: 2 }, 1)).toThrow('clock');
  expect(f.root).toEqual({});
  const req = f.request('same'); expect(f.store.submit(req, 1)).toBe(true);
  expect(f.store.submit({ ...req }, 1)).toBe(true);
  expect(() => f.store.submit({ ...req, room: 'W2N1' }, 1)).toThrow('identity');
  req.room = 'W9N9'; expect(f.store.read().requests[0]!.room).toBe('E0N1');
  for (let index = 1; index < 128; index++) expect(f.store.submit(f.request(`q${index}`), 1)).toBe(true);
  expect(f.store.submit(f.request('overflow'), 1)).toBe(false); expect(f.store.read().requests).toHaveLength(128);
});

test('a fully scanned queue preserves request priority after a disabled tick', () => {
  const f = fixture(); f.store.submit(f.request('manual', 'W0N1', 100), 1);
  dispatchObservations(1, budget, f.units, f.ports, () => false, () => true);
  f.store.submit(f.request('automatic', 'W0N1', -100), 2);
  dispatchObservations(2, { ...budget, issues: 1 }, f.units, f.ports, () => true, () => true);
  expect(f.ports.issue.mock.calls[0]![1].id).toBe('manual');
});

test('a mutable native port cannot change persisted observation ownership or target', () => {
  const f = fixture(); f.store.submit(f.request('stable'), 1);
  f.ports.issue.mockImplementation((_id, request) => { request.room = 'W9N9'; request.owner = 'intruder'; return 0; });
  dispatchObservations(1, budget, f.units, f.ports, () => true, () => true);
  settleObservations(2, budget, f.ports, () => true);
  expect(f.store.read().receipts[0]!.request).toMatchObject({ room: 'E0N1', owner: 'specialist' });
});
