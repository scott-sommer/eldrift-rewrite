import { expect, test } from 'vitest';
import { admitPlanningRequest } from '../../src/features/planning/planning-admission';
import { createPlanningRequestStore } from '../../src/features/planning/planning-request-store';
import { planningObservation } from '../fixtures/planning-observation';
import { resolveConfig } from '../../src/config/resolve';
import type { PlanState } from '../../src/features/planning/plan-model';
import type { Envelope } from '../../src/persistence/versioned-state';
function setup() {
  const records: Record<string, unknown> = {};
  const port = { read: (key: string) => records[key], write: (key: string, value: Envelope) => { records[key] = value; } };
  const store = createPlanningRequestStore(port, 'W0N1', ['spawn', 'storage']);
  const plan: PlanState = { room: 'W0N1', revision: 0, strategy: null, entries: [] };
  const config = resolveConfig({}, 1).values;
  return { records, port, store, plan, config };
}
test('completed plan revision cannot change the captured base or candidate seeds for the same request', () => {
  const { store, port, plan, config } = setup(), observation = planningObservation();
  const first = admitPlanningRequest(store, observation, plan, config, ['storage'], 'v1');
  const current: PlanState = { ...plan, revision: 1, strategy: 'standard', entries: [
    { type: 'spawn', x: 24, y: 25, rcl: 1, priority: -430, source: 'strategy' },
    { type: 'storage', x: 25, y: 25, rcl: 4, priority: -500, source: 'strategy' }],
    provenance: { candidateId: 'standard:25:25:0', strategyVersion: 'v1', observation: 'obs', policy: 'policy',
      generatedAt: 1, committedAt: 2, anchor: { x: 25, y: 25 }, transform: 0,
      bootstrap: { spawn: 'spawn:24:25', storage: 'storage:25:25' },
      costs: { hauling: 0, service: 0, capacityShortfall: 0, swamps: 0, defense: 0, migration: 0 } } };
  const reopened = admitPlanningRequest(createPlanningRequestStore(port, 'W0N1', ['spawn', 'storage']),
    observation, current, config, ['storage'], 'v1');
  expect(first.status).toBe('ready');
  expect(reopened).toMatchObject({ status: 'ready', baseRevision: 0, reused: true });
  if (first.status !== 'ready' || reopened.status !== 'ready') throw new Error('Missing request');
  expect(reopened.identity).toBe(first.identity);
  expect(reopened.request.options).toEqual(first.request.options);
  expect(store.read().revision).toBe(1);
});
test('world, explicit refresh and implementation changes capture a new baseline', () => {
  for (const kind of ['world', 'refresh', 'implementation']) {
    const { store, plan, config } = setup(), observation = planningObservation();
    const first = admitPlanningRequest(store, observation, plan, config, [], 'v1');
    if (kind === 'world') observation.terrain = [...observation.terrain].map((cell, index) => index === 0 ? 'wall' : cell);
    const next = admitPlanningRequest(store, observation, { ...plan, revision: 1 },
      { ...config, planningRefreshRevision: kind === 'refresh' ? 1 : 0 }, [], kind === 'implementation' ? 'v2' : 'v1');
    expect(next).toMatchObject({ status: 'ready', baseRevision: 1, reused: false });
    if (first.status !== 'ready' || next.status !== 'ready') throw new Error('Missing request');
    expect(next.identity).not.toBe(first.identity);
  }
});
test('budget changes and observation collection order preserve request identity', () => {
  const { store, plan, config } = setup(), observation = planningObservation();
  const first = admitPlanningRequest(store, observation, plan, config, [], 'v1');
  const next = admitPlanningRequest(store, { ...observation, objects: [...observation.objects].reverse() },
    plan, { ...config, planningSearches: 4 }, [], 'v1');
  expect(next).toMatchObject({ status: 'ready', reused: true });
  if (first.status !== 'ready' || next.status !== 'ready') throw new Error('Missing request');
  expect(next.identity).toBe(first.identity);
});
test('unavailable planning and capture conflicts never expose ready work', () => {
  const { store, plan, config, records } = setup(), observation = planningObservation();
  expect(admitPlanningRequest(store, { ...observation, objects: [] }, plan, config, [], 'v1'))
    .toEqual({ status: 'unavailable', reason: 'missing-controller' });
  expect(records).toEqual({});
  store.capture = () => ({ ok: false, reason: 'revision' });
  expect(admitPlanningRequest(store, observation, plan, config, [], 'v1')).toEqual({ status: 'conflict' });
});

test('completed matching policy stays idle during construction but explicit refresh admits new work', () => {
  const { store, plan, config } = setup(), observation = planningObservation();
  const admitted = admitPlanningRequest(store, observation, plan, config, [], 'v1');
  if (admitted.status !== 'ready') throw new Error('Missing request');
  const current: PlanState = { room: 'W0N1', revision: 1, strategy: 'standard', entries: [
    { type: 'spawn', x: 24, y: 25, rcl: 1, priority: -430, source: 'strategy' },
    { type: 'storage', x: 25, y: 25, rcl: 4, priority: -500, source: 'strategy' }],
    provenance: { candidateId: 'standard:25:25:0', strategyVersion: 'v1', observation: admitted.observationIdentity,
      policy: admitted.policyIdentity, generatedAt: 1, committedAt: 2, anchor: { x: 25, y: 25 }, transform: 0,
      bootstrap: { spawn: 'spawn:24:25', storage: 'storage:25:25' },
      costs: { hauling: 0, service: 0, capacityShortfall: 0, swamps: 0, defense: 0, migration: 0 } } };
  const completion = { signature: 'completed-job', planRevision: 1, completedAt: 2, outcome: 'committed' as const };
  observation.infrastructure = [{ id: 'new-road', type: 'road', position: { x: 26, y: 25 }, owned: true, walkable: true }];
  const before = store.read();
  expect(admitPlanningRequest(store, observation, current, config, [], 'v1', completion))
    .toEqual({ status: 'idle', planRevision: 1 });
  expect(store.read()).toEqual(before);
  for (const unsettled of [undefined, { ...completion, planRevision: 0 },
    { ...completion, outcome: 'no-valid-candidate' as const }]) {
    expect(admitPlanningRequest(store, observation, current, config, [], 'v1', unsettled))
      .toMatchObject({ status: 'ready' });
  }
  expect(admitPlanningRequest(store, observation, current, { ...config, planningRefreshRevision: 1 }, [], 'v1', completion))
    .toMatchObject({ status: 'ready', baseRevision: 1, reused: false });
});
test('failed completion receipts do not suppress observation-driven retries', () => {
  const { store, plan, config } = setup(), observation = planningObservation();
  const completion = { signature: 'failed-job', planRevision: 0, completedAt: 2, outcome: 'no-valid-candidate' as const };
  expect(admitPlanningRequest(store, observation, plan, config, [], 'v1', completion)).toMatchObject({ status: 'ready' });
  const changed = { ...observation, margin: 3 };
  expect(admitPlanningRequest(store, changed, plan, config, [], 'v1', completion)).toMatchObject({ status: 'ready', reused: false });
});

test('explicit stamp policy captures a ready request with only stamp hub candidates', () => {
  const { store, plan, config } = setup();
  const result = admitPlanningRequest(store, planningObservation(), plan, { ...config, layoutStrategy: 'stamps' }, [], 'v1');
  expect(result.status).toBe('ready');
  if (result.status !== 'ready') throw new Error('Expected stamp admission');
  expect(Object.keys(result.request.options)).toEqual(['stamps']);
});
