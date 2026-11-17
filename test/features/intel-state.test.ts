import { expect, test } from 'vitest';
import { createIntelStore } from '../../src/features/intel/store';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import type { Envelope } from '../../src/persistence/versioned-state';
import { intelSummary } from '../fixtures/intel-summary';
function setup() {
  let memory: { eldrift?: unknown; unrelated: unknown } = { unrelated: { plan: 'retained' } };
  const port = createMemoryPort(() => memory), store = createIntelStore(port);
  return { port, store, memory: () => memory, reset: () => { memory = JSON.parse(JSON.stringify(memory)); } };
}
test('v1 facts migrate without inventing detailed knowledge or physical visits and retain unrelated state', () => {
  const { port, store, memory } = setup();
  port.write('intel/W1N1', { owner: 'intel', version: 1, data: { lastSeen: 10, owned: true,
    sourceIds: ['source','source'], structureIds: ['spawn'], hostileIds: ['enemy'], extension: 'retained' } });
  const result = store.read('W1N1', 10);
  expect(result).toMatchObject({ visible: true, age: 0, summaryAge: null, freshness: 'unknown',
    record: { owned: true, sourceIds: ['source'], structureIds: ['spawn'], hostileIds: ['enemy'],
      summary: null, lastVisit: null, lastFailure: null } });
  expect(port.read('intel/W1N1')).toMatchObject({ version: 2, data: { extension: 'retained' } });
  expect(memory().unrelated).toEqual({ plan: 'retained' });
});
test('detailed snapshots survive reset and vision loss with exact freshness boundaries and detached data', () => {
  const fixture = setup(), summary = intelSummary();
  fixture.store.observeSummary(summary, true);
  summary.sources[0]!.capacity = 0;
  fixture.reset();
  const restored = createIntelStore(fixture.port);
  expect(restored.read('W1N1', 12, 2)).toMatchObject({ visible: false, age: 2, summaryAge: 2, freshness: 'fresh',
    record: { lastVisit: 10, sourceIds: ['source'], hostileIds: ['enemy-unit','power-unit','tower'] } });
  expect(restored.read('W1N1', 13, 2).freshness).toBe('stale');
  expect(restored.read('W1N1', 10, 0).freshness).toBe('fresh');
  expect(restored.read('W1N1', 11, 0).freshness).toBe('stale');
  const result = restored.read('W1N1', 13);
  result.record.summary!.sources[0]!.capacity = 1;
  expect(restored.read('W1N1', 13).record.summary!.sources[0]!.capacity).toBe(3000);
});
test('observer capture updates ownership and reservation without claiming a physical visit', () => {
  const { store } = setup();
  store.observeSummary(intelSummary(), true);
  const summary = intelSummary(11);
  summary.controller = { ...summary.controller!, owner: null, owned: false, level: 0,
    reservation: { username: 'new-reserver', ticksToEnd: 400 } };
  summary.units = []; summary.structures = [];
  summary.status = 'novice'; summary.statusTimestamp = 2000000000000;
  store.observeSummary(summary);
  expect(store.read('W1N1', 11)).toMatchObject({ freshness: 'fresh', record: { lastSeen: 11, lastVisit: 10,
    owned: false, hostileIds: [], structureIds: [], summary: { status: 'novice',
      controller: { owner: null, reservation: { username: 'new-reserver', ticksToEnd: 400 } } } } });
});
test('a newer ID-only observation preserves old detail but cannot make it fresh', () => {
  const { store } = setup();
  store.observeSummary(intelSummary());
  store.observe('W1N1', { lastSeen: 11, owned: false, sourceIds: ['new-source'], structureIds: [], hostileIds: [] });
  expect(store.read('W1N1', 11)).toMatchObject({ visible: true, age: 0, summaryAge: 1, freshness: 'stale',
    record: { owned: false, sourceIds: ['new-source'], summary: { observedAt: 10, sources: [{ id: 'source' }] } } });
  store.observeSummary(intelSummary(12));
  expect(store.read('W1N1', 12)).toMatchObject({ freshness: 'fresh', record: { sourceIds: ['source'] } });
});
test('failure updates are independent, idempotent and cannot erase facts or overwrite newer failure context', () => {
  const { store } = setup();
  store.observeSummary(intelSummary());
  const failure = { id: 'route:unit:15', tick: 15, reason: 'no-route' };
  expect(store.recordFailure('W1N1', failure)).toBe(true);
  expect(store.recordFailure('W1N1', failure)).toBe(false);
  expect(store.recordFailure('W1N1', { ...failure, id: 'older', tick: 14 })).toBe(false);
  expect(() => store.recordFailure('W1N1', { ...failure, reason: 'changed' })).toThrow('identity');
  expect(store.read('W1N1', 15)).toMatchObject({ record: { lastSeen: 10, lastVisit: null, lastFailure: failure,
    summary: { sources: [{ id: 'source' }] } } });
  expect(() => store.read('W1N1', 14)).toThrow('clock');
});
test('old/future observations, corrupt migration and foreign-room payloads preserve authoritative state', () => {
  const { store, port, memory } = setup();
  store.observeSummary(intelSummary(10));
  const before = JSON.stringify(memory());
  expect(() => store.observeSummary(intelSummary(9))).toThrow('older');
  expect(() => store.read('W1N1', 9)).toThrow('clock');
  expect(() => store.read('W1N1', -1)).toThrow('clock');
  expect(JSON.stringify(memory())).toBe(before);
  store.observeSummary(intelSummary(10, 'W2N1'));
  const foreign = port.read('intel/W2N1') as Envelope;
  port.write('intel/W1N1', foreign);
  const wrongRoom = JSON.stringify(port.read('intel/W1N1'));
  expect(() => store.read('W1N1', 10)).toThrow('invalid state');
  expect(JSON.stringify(port.read('intel/W1N1'))).toBe(wrongRoom);
  port.write('intel/W1N1', { owner: 'intel', version: 1, data: { lastSeen: 10, owned: 'bad', sourceIds: [], structureIds: [], hostileIds: [] } });
  const corrupt = JSON.stringify(port.read('intel/W1N1'));
  expect(() => store.read('W1N1', 10)).toThrow('legacy');
  expect(JSON.stringify(port.read('intel/W1N1'))).toBe(corrupt);
});
