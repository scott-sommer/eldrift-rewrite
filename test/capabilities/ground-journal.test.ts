import { expect, test } from 'vitest';
import { createGroundJournal } from '../../src/features/logistics/ground-journal';
import type { Envelope } from '../../src/persistence/versioned-state';
const attempt = { id: 'drop', unit: 'u', resource: 'energy', tick: 10,
  position: { room: 'E0N1', x: 20, y: 21 }, amount: 50, cargoBefore: 50, hitsBefore: 100, groundBefore: 0 };
function fixture() {
  const records = new Map<string, Envelope>();
  return { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, structuredClone(value)); } };
}
test('persisted drop attempt prevents reconstruction from issuing duplicate drops before acknowledgement', () => {
  const state = fixture();
  expect(createGroundJournal(state, 'u').begin(attempt)).toBe(true);
  const journal = createGroundJournal(state, 'u');
  expect(journal.begin(attempt)).toBe(false);
  expect(journal.settle({ tick: 11, unit: 'u', position: attempt.position, cargo: 0, hits: 100, ground: 50, isolated: true }, 1000)).toEqual({ status: 'released', amount: 50 });
  expect(journal.begin({ ...attempt, tick: 11 })).toBe(false);
  journal.acknowledge('drop');
  expect(journal.begin(attempt)).toBe(false);
  expect(journal.begin({ ...attempt, id: 'next', tick: 11 })).toBe(true);
});
test('ambiguous ground results remain unresolved and cannot fabricate an acknowledged receipt', () => {
  const state = fixture(), journal = createGroundJournal(state, 'u');
  journal.begin(attempt);
  expect(journal.settle({ tick: 12 }, 1000)).toEqual({ status: 'unknown' });
  expect(() => journal.acknowledge('drop')).toThrow();
  expect(createGroundJournal(state, 'u').begin({ ...attempt, tick: 13 })).toBe(false);
  expect(() => createGroundJournal(state, 'other').begin(attempt)).toThrow();
});
