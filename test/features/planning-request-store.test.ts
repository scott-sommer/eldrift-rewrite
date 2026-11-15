import { expect, test } from 'vitest';
import { createPlanningRequestStore } from '../../src/features/planning/planning-request-store';
import type { PlanState } from '../../src/features/planning/plan-model';
import type { Envelope } from '../../src/persistence/versioned-state';
function setup() {
  const records: Record<string, unknown> = {};
  const port = { read: (key: string) => records[key], write: (key: string, value: Envelope) => { records[key] = value; } };
  const plan: PlanState = { room: 'W0N1', revision: 0, strategy: null, entries: [] };
  return { records, port, plan, store: createPlanningRequestStore(port, 'W0N1', ['spawn']) };
}
test('same identity retains its original base across recreation and later plan revisions', () => {
  const { store, port, plan } = setup();
  expect(store.capture(0, 'request-1', plan)).toMatchObject({ ok: true, reused: false });
  plan.revision = 1;
  const restored = createPlanningRequestStore(port, 'W0N1', ['spawn']);
  expect(restored.capture(1, 'request-1', plan)).toMatchObject({ ok: true, reused: true, record: { revision: 1,
    request: { basePlan: { revision: 0 } } } });
  const read = restored.read(); read.request!.basePlan.revision = 99;
  expect(store.read().request!.basePlan.revision).toBe(0);
  expect(restored.capture(1, 'request-2', plan)).toMatchObject({ ok: true, reused: false, record: { revision: 2,
    request: { basePlan: { revision: 1 } } } });
});
test('stale capture and clear cannot replace newer request snapshots', () => {
  const { store, plan } = setup();
  store.capture(0, 'one', plan);
  expect(store.capture(0, 'two', plan)).toEqual({ ok: false, reason: 'revision' });
  expect(store.clear(0)).toEqual({ ok: false, reason: 'revision' });
  expect(store.clear(1)).toMatchObject({ ok: true, record: { revision: 2 } });
  expect(store.read()).not.toHaveProperty('request');
});
test('invalid replacement base plans leave saved request unchanged', () => {
  const { store, plan, records } = setup();
  store.capture(0, 'one', plan);
  const before = JSON.stringify(records);
  expect(() => store.capture(1, 'two', { ...plan, room: 'other' })).toThrow('invalid state');
  expect(() => store.capture(1, '', plan)).toThrow('identity');
  expect(JSON.stringify(records)).toBe(before);
});
test('foreign, future and corrupt persisted request envelopes are preserved', () => {
  const { store, records } = setup();
  for (const record of [{ owner: 'foreign', version: 1, data: {} },
    { owner: 'planning-requests', version: 2, data: {} },
    { owner: 'planning-requests', version: 1, data: { room: 'W0N1', revision: 1, request: { identity: 'x', basePlan: {} } } }]) {
    records['planning-requests/W0N1'] = record;
    const before = JSON.stringify(records);
    expect(() => store.read()).toThrow();
    expect(JSON.stringify(records)).toBe(before);
  }
});
