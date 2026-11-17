import { expect, test } from 'vitest';
import { createDefenseSearchStore } from '../../src/features/planning/defense-search-store';
import type { Envelope } from '../../src/persistence/versioned-state';
function setup() {
  const records: Record<string, Envelope> = {};
  const port = { read: (key: string) => records[key], write: (key: string, value: Envelope) => { records[key] = value; } };
  return { port, records, store: createDefenseSearchStore(port, 'W0N1') };
}
const checkpoint = { version: 1 as const, identity: 'request', flow: { version: 1 as const, signature: 'graph', augmentations: 18 } };
test('defense search ownership survives recreation and rejects stale saves and clears', () => {
  const { store, port } = setup();
  expect(store.save(0, checkpoint)).toMatchObject({ ok: true, record: { revision: 1 } });
  const restored = createDefenseSearchStore(port, 'W0N1');
  expect(restored.read().checkpoint).toEqual(checkpoint);
  const read = restored.read(); read.checkpoint!.flow!.augmentations = 0;
  expect(restored.read().checkpoint?.flow?.augmentations).toBe(18);
  expect(store.save(0, checkpoint)).toEqual({ ok: false, reason: 'revision' });
  expect(store.clear(0)).toEqual({ ok: false, reason: 'revision' });
  expect(store.clear(1)).toMatchObject({ ok: true, record: { revision: 2 } });
  expect(store.read().checkpoint).toBeUndefined();
});
test('invalid checkpoints and foreign envelopes cannot replace durable search state', () => {
  const { store, records } = setup();
  store.save(0, checkpoint);
  const before = JSON.stringify(records);
  expect(() => store.save(1, { ...checkpoint, identity: '' })).toThrow('invalid state');
  expect(JSON.stringify(records)).toBe(before);
  records['defense-search/W0N1']!.owner = 'foreign';
  expect(() => store.read()).toThrow('owner mismatch');
});
