import { expect, test } from 'vitest';
import { createIntelStore } from '../../src/persistence/intel/store';
import type { Envelope } from '../../src/persistence/versioned-state';

test('vision loss retains intel and unrelated namespaces; reconstruction restores freshness', () => {
  const state: Record<string, unknown> = { 'plan/W1N1': { layout: 'standard' } };
  const port = { read: (key: string) => state[key], write: (key: string, value: Envelope) => { state[key] = value; } };
  const intel = createIntelStore(port);
  intel.observe('W1N1', { lastSeen: 10, owned: true, sourceIds: ['source'], structureIds: ['lab'], hostileIds: ['enemy'] });
  expect(intel.read('W1N1', 10).visible).toBe(true);
  const restored = createIntelStore(port).read('W1N1', 15);
  expect(restored.visible).toBe(false);
  expect(restored.age).toBe(5);
  expect(restored.record.structureIds).toEqual(['lab']);
  expect(restored.record.sourceIds).toEqual(['source']);
  expect(state['plan/W1N1']).toEqual({ layout: 'standard' });
  intel.observe('W1N1', { ...restored.record, lastSeen: 16, structureIds: [], hostileIds: [] });
  expect(intel.read('W1N1', 16).record.structureIds).toEqual([]);
});

test('older observations cannot erase newer intelligence', () => {
  const state: Record<string, unknown> = {};
  const intel = createIntelStore({ read: key => state[key], write: (key, value) => { state[key] = value; } });
  const record = { lastSeen: 10, owned: false, sourceIds: ['source'], structureIds: [], hostileIds: [] };
  intel.observe('W1N1', record);
  expect(() => intel.observe('W1N1', { ...record, lastSeen: 9, sourceIds: [] })).toThrow('older');
  expect(intel.read('W1N1', 11).record.sourceIds).toEqual(['source']);
});
