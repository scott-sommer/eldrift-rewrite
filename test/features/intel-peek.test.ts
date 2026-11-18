import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createIntelStore } from '../../src/features/intel/store';
import { intelSummary } from '../fixtures/intel-summary';

test('scanning unknown intel creates neither a memory root nor room records', () => {
  const memory: { eldrift?: unknown; unrelated: { sentinel: number } } = { unrelated: { sentinel: 7 } };
  const port = createMemoryPort(() => memory), store = createIntelStore(port);
  const before = JSON.stringify(memory);
  expect(port.read('intel/W1N1')).toBeUndefined();
  for (const room of ['W1N1', 'W2N1', 'E0N0']) {
    expect(store.peek(room, 10)).toMatchObject({ freshness: 'unknown', visible: false,
      record: { lastSeen: null, summary: null, lastVisit: null } });
  }
  expect(JSON.stringify(memory)).toBe(before);
  store.observeSummary(intelSummary());
  const written = JSON.stringify(memory);
  expect(store.peek('W2N1', 10).freshness).toBe('unknown');
  expect(JSON.stringify(memory)).toBe(written);
});

test('peek migrates only its detached view until a writing read explicitly commits', () => {
  const memory = {}, port = createMemoryPort(() => memory), store = createIntelStore(port);
  port.write('intel/W1N1', { owner: 'intel', version: 1, data: { lastSeen: 10, owned: false,
    sourceIds: ['source','source'], structureIds: [], hostileIds: [] } });
  const before = JSON.stringify(memory);
  const view = store.peek('W1N1', 11);
  expect(view).toMatchObject({ freshness: 'unknown', record: { sourceIds: ['source'], summary: null } });
  view.record.sourceIds.push('changed');
  expect(store.peek('W1N1', 11).record.sourceIds).toEqual(['source']);
  expect(JSON.stringify(memory)).toBe(before);
  store.read('W1N1', 11);
  expect(port.read('intel/W1N1')).toMatchObject({ version: 2 });
});

test('peek retains observed facts across expiry and rejects invalid clocks without mutation', () => {
  const memory = {}, port = createMemoryPort(() => memory), store = createIntelStore(port);
  store.observeSummary(intelSummary(), true);
  const before = JSON.stringify(memory);
  const result = store.peek('W1N1', 20, 2);
  expect(result).toMatchObject({ freshness: 'stale', record: { lastSeen: 10, lastVisit: 10 } });
  result.record.summary!.sources[0]!.capacity = 0;
  expect(store.peek('W1N1', 20).record.summary!.sources[0]!.capacity).toBe(3000);
  expect(() => store.peek('W1N1', 9)).toThrow('clock');
  expect(() => store.peek('W2N1', -1)).toThrow('clock');
  expect(JSON.stringify(memory)).toBe(before);
});
