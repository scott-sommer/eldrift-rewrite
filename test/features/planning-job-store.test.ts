import { expect, test } from 'vitest';
import { createPlanningJobStore } from '../../src/features/planning/planning-job-store';
import type { PlanningJobCheckpoint } from '../../src/features/planning/planning-job-model';
import type { Envelope } from '../../src/persistence/versioned-state';
function setup() {
  const records: Record<string, unknown> = { 'planning/W0N1': { owner: 'planning', version: 3, data: { marker: 'committed' } } };
  const port = { read: (key: string) => records[key],
    write: (key: string, value: Envelope) => { records[key] = value; } };
  return { records, port, store: createPlanningJobStore(port, 'W0N1', ['spawn', 'storage']) };
}
function checkpoint(): PlanningJobCheckpoint {
  return { version: 1, signature: 'job-v1', next: 0, seen: [], rejected: 0,
    pending: { id: 'standard:0', checkpoint: { phase: 'draft', searches: 1 } } };
}
test('progress survives store recreation and is detached from input and reads', () => {
  const { port, store } = setup();
  const input = checkpoint();
  expect(store.read()).toEqual({ room: 'W0N1', revision: 0 });
  expect(store.save(0, input)).toMatchObject({ ok: true, record: { revision: 1 } });
  input.pending!.id = 'mutated';
  const restored = createPlanningJobStore(port, 'W0N1', ['spawn', 'storage']).read();
  expect(restored.checkpoint?.pending?.id).toBe('standard:0');
  restored.checkpoint!.seen.push('mutated');
  expect(store.read().checkpoint?.seen).toEqual([]);
});
test('stale writers cannot overwrite newer progress and clearing preserves the committed plan', () => {
  const { records, store } = setup();
  const baseline = JSON.stringify(records['planning/W0N1']);
  store.save(0, checkpoint());
  expect(store.save(0, checkpoint())).toEqual({ ok: false, reason: 'revision' });
  expect(store.clear(0)).toEqual({ ok: false, reason: 'revision' });
  expect(store.clear(1)).toMatchObject({ ok: true, record: { revision: 2 } });
  expect(store.read()).toEqual({ room: 'W0N1', revision: 2 });
  expect(JSON.stringify(records['planning/W0N1'])).toBe(baseline);
});
test('changed job identity requires an explicit revision-guarded clear', () => {
  const { store } = setup();
  store.save(0, checkpoint());
  const next = { ...checkpoint(), signature: 'new-observation' };
  expect(store.save(1, next)).toEqual({ ok: false, reason: 'identity' });
  expect(store.read().revision).toBe(1);
  store.clear(1);
  expect(store.save(2, next)).toMatchObject({ ok: true, record: { revision: 3 } });
});
test('future, wrong-owner and corrupt stored envelopes are preserved on failed reads', () => {
  const { records, store } = setup();
  for (const bad of [{ owner: 'planning-jobs', version: 9, data: {} },
    { owner: 'foreign', version: 1, data: {} }, { owner: 'planning-jobs', version: 1, data: { room: 'W0N1', revision: -1 } }]) {
    records['planning-jobs/W0N1'] = bad;
    const baseline = JSON.stringify(records);
    expect(() => store.read()).toThrow();
    expect(JSON.stringify(records)).toBe(baseline);
  }
});
test('invalid cursors, pending identities and non-JSON evaluator state never replace saved progress', () => {
  const { records, store } = setup();
  store.save(0, checkpoint());
  const baseline = JSON.stringify(records);
  const bad = [
    { ...checkpoint(), next: 1 },
    { ...checkpoint(), next: 1, seen: ['standard:0'] },
    { ...checkpoint(), pending: { id: '', checkpoint: {} } },
    { ...checkpoint(), pending: { id: 'standard:0', checkpoint: () => true } },
  ];
  for (const value of bad) {
    expect(() => store.save(1, value)).toThrow();
    expect(JSON.stringify(records)).toBe(baseline);
  }
});
test('retained proposals must satisfy the existing plan schema and refer to completed candidates', () => {
  const { store } = setup();
  const value = checkpoint();
  delete value.pending;
  value.next = 1; value.seen = ['standard:0'];
  value.best = { strategy: 'standard', entries: [
    { type: 'spawn', x: 24, y: 25, rcl: 1, priority: -430, source: 'strategy' },
    { type: 'storage', x: 25, y: 25, rcl: 4, priority: -500, source: 'strategy' }],
    provenance: { candidateId: 'standard:0', strategyVersion: '1', observation: 'obs', policy: 'policy',
      generatedAt: 1, anchor: { x: 25, y: 25 }, transform: 0, bootstrap: { spawn: 'spawn:24:25', storage: 'storage:25:25' },
      costs: { hauling: 1, service: 1, capacityShortfall: 0, swamps: 0, defense: 0, migration: 0 } } };
  expect(store.save(0, value).ok).toBe(true);
  value.best.provenance.bootstrap.spawn = 'spawn:1:1';
  expect(() => store.save(1, value)).toThrow('invalid state');
  value.best.provenance.bootstrap.spawn = 'spawn:24:25';
  value.best.provenance.candidateId = 'unseen';
  expect(() => store.save(1, value)).toThrow('invalid state');
});
