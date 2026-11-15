import { expect, test } from 'vitest';
import { createPlanStore } from '../../src/features/planning/plan-store';
import type { PlanProposal } from '../../src/features/planning/plan-store';
import type { Envelope } from '../../src/persistence/versioned-state';
function setup() {
  const records: Record<string, unknown> = {};
  const port = { read: (key: string) => records[key], write: (key: string, value: Envelope) => { records[key] = value; } };
  return { records, port, store: createPlanStore(port, 'W0N1', ['spawn', 'storage', 'road']) };
}
function proposal(): PlanProposal {
  return { strategy: 'standard', entries: [
    { type: 'spawn', x: 20, y: 20, rcl: 1, priority: -430, source: 'strategy' },
    { type: 'storage', x: 21, y: 20, rcl: 4, priority: -500, source: 'strategy' }],
    provenance: { candidateId: 'standard:21:20:0', strategyVersion: '1', observation: 'obs1', policy: 'policy1',
      generatedAt: 5, anchor: { x: 21, y: 20 }, transform: 0,
      bootstrap: { spawn: 'spawn:20:20', storage: 'storage:21:20' },
      costs: { hauling: 10, service: 20, capacityShortfall: 0, swamps: 0, defense: 2, migration: 50 } } };
}
const context = { tick: 6, observation: 'obs1', policy: 'policy1' };
test('validated commitment persists detached provenance and bootstrap from the actual staged plan', () => {
  const { port, store } = setup(), draft = proposal();
  const result = store.commit(0, draft, context, () => true);
  expect(result).toMatchObject({ ok: true, plan: { revision: 1, provenance: { committedAt: 6 } } });
  draft.entries[0]!.x = 30;
  expect(createPlanStore(port, 'W0N1', ['spawn', 'storage', 'road']).read().entries[0]!.x).toBe(20);
});
test('failed or stale candidates preserve the current plan exactly', () => {
  const { store } = setup();
  store.commit(0, proposal(), context, () => true);
  const before = store.read();
  expect(store.commit(0, proposal(), context, () => true)).toMatchObject({ ok: false, reason: 'revision' });
  expect(store.commit(1, proposal(), { ...context, observation: 'obs2' }, () => true)).toMatchObject({ ok: false, reason: 'stale' });
  expect(store.commit(1, proposal(), context, () => false)).toMatchObject({ ok: false, reason: 'validation' });
  expect(store.read()).toEqual(before);
});
test('bootstrap outside the final plan and missing operator placements prevent commitment', () => {
  const { store } = setup(), draft = proposal();
  draft.entries.push({ type: 'road', x: 22, y: 20, rcl: 3, priority: 0, source: 'operator' });
  expect(store.commit(0, draft, context, () => true).ok).toBe(true);
  expect(store.commit(1, proposal(), context, () => true)).toMatchObject({ reason: 'operator-entry' });
  expect(store.commit(1, { ...proposal(), strategy: '' }, context, () => true)).toMatchObject({ reason: 'schema' });
  const bad = proposal(); bad.provenance.bootstrap.spawn = 'spawn:1:1';
  expect(store.commit(1, bad, context, () => true)).toMatchObject({ reason: 'schema' });
});
test('legacy v2 state migrates without fabricating provenance or altering entries', () => {
  const { records, store } = setup();
  const legacy = { room: 'W0N1', revision: 3, strategy: 'legacy', entries: proposal().entries };
  records['planning/W0N1'] = { owner: 'planning', version: 2, data: legacy };
  expect(store.read()).toEqual(legacy);
  expect(records['planning/W0N1']).toMatchObject({ version: 3, data: legacy });
});
test('validator mutations cannot alter the committed proposal', () => {
  const { store } = setup();
  store.commit(0, proposal(), context, candidate => { candidate.entries.length = 0; return true; });
  expect(store.read().entries).toHaveLength(2);
});

test('a competing commit during validation prevents overwriting the newer revision', () => {
  const { store } = setup();
  const result = store.commit(0, proposal(), context, () => {
    const competing = proposal(); competing.strategy = 'constrained';
    expect(store.commit(0, competing, context, () => true).ok).toBe(true);
    return true;
  });
  expect(result).toMatchObject({ ok: false, reason: 'revision' });
  expect(store.read().strategy).toBe('constrained');
});
