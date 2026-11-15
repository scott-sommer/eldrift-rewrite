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
  expect(admitPlanningRequest(store, observation, plan, { ...config, layoutStrategy: 'stamps' }, [], 'v1'))
    .toEqual({ status: 'unavailable', reason: 'unsupported-strategy' });
  expect(records).toEqual({});
  store.capture = () => ({ ok: false, reason: 'revision' });
  expect(admitPlanningRequest(store, observation, plan, config, [], 'v1')).toEqual({ status: 'conflict' });
});
