import { expect, test } from 'vitest';
import { preparePlanningRequest } from '../../src/features/planning/planning-request';
import { validatePlanningConstraints } from '../../src/capabilities/planning/preservation';
import { planningObservation } from '../fixtures/planning-observation';
import type { PlanState } from '../../src/features/planning/plan-model';
const policy = { strategy: 'auto' as const, preserveExisting: true, valuableTypes: ['spawn', 'storage'], constrainedAnchorLimit: 36 };
function setup() {
  const observation = planningObservation();
  observation.infrastructure = [
    { id: 'storage', type: 'storage', position: { x: 25, y: 25 }, owned: true, walkable: false },
    { id: 'enemy', type: 'spawn', position: { x: 10, y: 20 }, owned: false, walkable: false },
  ];
  const plan: PlanState = { room: 'W0N1', revision: 0, strategy: null, entries: [
    { type: 'road', x: 20, y: 20, rcl: 2, priority: 0, source: 'operator' }] };
  return { observation, plan };
}
test('auto prepares both strategies using owned infrastructure and locks valuable and operator entries', () => {
  const { observation, plan } = setup(), result = preparePlanningRequest(observation, plan, policy);
  if (!result.ok) throw new Error(result.reason);
  expect(result.options.standard?.structures).toEqual([{ type: 'storage', position: { x: 25, y: 25 } }]);
  expect(result.options.constrained).toEqual({ controller: { x: 40, y: 40 }, preferred: [{ x: 25, y: 25 }], limit: 36 });
  expect(validatePlanningConstraints([], result.observation.constraints)).toEqual([
    { id: 'operator:road:20:20', reason: 'missing-lock' }, { id: 'preserve:storage', reason: 'missing-lock' }]);
  result.options.standard!.storage!.x = 0;
  expect(result.observation.infrastructure.find(item => item.id === 'storage')?.position.x).toBe(25);
  result.observation.infrastructure[0]!.position.x = 1;
  expect(observation.infrastructure.find(item => item.id === 'enemy')?.position.x).toBe(10);
  expect(observation.constraints).toEqual([]);
});
test('explicit strategies restrict enumeration and stamps remains explicitly unsupported', () => {
  const { observation, plan } = setup();
  for (const strategy of ['standard', 'constrained'] as const) {
    const result = preparePlanningRequest(observation, plan, { ...policy, strategy });
    if (!result.ok) throw new Error(result.reason);
    expect(Object.keys(result.options)).toEqual([strategy]);
  }
  expect(preparePlanningRequest(observation, plan, { ...policy, strategy: 'stamps' }))
    .toEqual({ ok: false, reason: 'unsupported-strategy' });
});
test('disabling automatic preservation retains explicit observed and operator constraints', () => {
  const { observation, plan } = setup();
  observation.constraints = [{ id: 'manual', kind: 'keep-clear', position: { x: 21, y: 21 } }];
  const result = preparePlanningRequest(observation, plan, { ...policy, preserveExisting: false });
  if (!result.ok) throw new Error(result.reason);
  expect(result.observation.constraints.map(item => item.id)).toEqual(['manual', 'operator:road:20:20']);
});
test('observation ordering does not change the prepared candidate order or identity', () => {
  const { observation, plan } = setup();
  const first = preparePlanningRequest(observation, plan, policy);
  const reordered = { ...observation, objects: [...observation.objects].reverse(), infrastructure: [...observation.infrastructure].reverse() };
  expect(preparePlanningRequest(reordered, plan, policy)).toEqual(first);
});
test('missing controllers and conflicting reserved constraint IDs never create a request', () => {
  const { observation, plan } = setup();
  expect(preparePlanningRequest({ ...observation, objects: [] }, plan, policy)).toEqual({ ok: false, reason: 'missing-controller' });
  observation.constraints = [{ id: 'preserve:storage', kind: 'blocked', position: { x: 1, y: 1 } }];
  expect(() => preparePlanningRequest(observation, plan, policy)).toThrow('constraint IDs');
  expect(() => preparePlanningRequest(observation, plan, { ...policy, constrainedAnchorLimit: 0 })).toThrow('anchor limit');
});

test('previous plan anchors seed both strategies while orientation seeds only its standard strategy', () => {
  const { observation, plan } = setup();
  plan.strategy = 'standard';
  plan.provenance = { candidateId: 'old', strategyVersion: 'v1', observation: 'obs', policy: 'policy',
    generatedAt: 1, committedAt: 2, anchor: { x: 24, y: 24 }, transform: 3,
    bootstrap: { spawn: 'spawn:24:25', storage: 'storage:24:24' },
    costs: { hauling: 0, service: 0, capacityShortfall: 0, swamps: 0, defense: 0, migration: 0 } };
  const result = preparePlanningRequest(observation, plan, policy);
  if (!result.ok) throw new Error(result.reason);
  expect(result.options.standard?.previous).toEqual({ anchor: { x: 24, y: 24 }, transform: 3 });
  expect(result.options.constrained?.preferred).toEqual([{ x: 24, y: 24 }, { x: 25, y: 25 }]);
  result.options.standard!.previous!.anchor.x = 0;
  expect(plan.provenance.anchor.x).toBe(24);
  plan.strategy = 'constrained';
  const changed = preparePlanningRequest(observation, plan, policy);
  if (!changed.ok) throw new Error(changed.reason);
  expect(changed.options.standard).not.toHaveProperty('previous');
  plan.provenance.transform = 8;
  expect(() => preparePlanningRequest(observation, plan, policy)).toThrow('previous transform');
});

test('prepared manual policy is detached and binds metadata and preservation settings', () => {
  const { observation, plan } = setup();
  const first = preparePlanningRequest(observation, plan, policy);
  if (!first.ok) throw new Error(first.reason);
  first.operatorEntries[0]!.priority = 999;
  expect(plan.entries[0]!.priority).toBe(0);
  for (const edited of [{ ...plan.entries[0]!, priority: 1 }, { ...plan.entries[0]!, rcl: 3 },
    { ...plan.entries[0]!, dependencies: ['storage:25:25'] }]) {
    const next = preparePlanningRequest(observation, { ...plan, entries: [edited] }, policy);
    if (!next.ok) throw new Error(next.reason);
    expect(next.policyIdentity).not.toBe(first.policyIdentity);
  }
  const changed = preparePlanningRequest(observation, plan, { ...policy, preserveExisting: false });
  if (!changed.ok) throw new Error(changed.reason);
  expect(changed.policyIdentity).not.toBe(first.policyIdentity);
});

test('equivalent policy and operator serialization order retain the same identity', () => {
  const { observation, plan } = setup();
  const entry = { ...plan.entries[0]!, tag: 'manual', dependencies: ['road:21:20', 'road:22:20'] };
  const first = preparePlanningRequest(observation, { ...plan, entries: [entry] }, policy);
  const reordered = { dependencies: [...entry.dependencies].reverse(), tag: entry.tag, source: entry.source,
    priority: entry.priority, rcl: entry.rcl, y: entry.y, x: entry.x, type: entry.type };
  const next = preparePlanningRequest(observation, { ...plan, entries: [reordered] }, {
    refreshRevision: 0, constrainedAnchorLimit: 36, valuableTypes: ['storage', 'spawn', 'spawn'],
    preserveExisting: true, strategy: 'auto',
  });
  if (!first.ok || !next.ok) throw new Error('Expected available request');
  expect(next.policyIdentity).toBe(first.policyIdentity);
  expect(next.operatorEntries[0]!.dependencies).toEqual(['road:22:20', 'road:21:20']);
  expect(entry.dependencies).toEqual(['road:21:20', 'road:22:20']);
});

test('identity binds every policy setting and optional operator metadata', () => {
  const { observation, plan } = setup();
  const first = preparePlanningRequest(observation, plan, policy);
  if (!first.ok) throw new Error(first.reason);
  for (const changed of [{ ...policy, strategy: 'standard' as const }, { ...policy, valuableTypes: ['spawn'] },
    { ...policy, constrainedAnchorLimit: 12 }, { ...policy, refreshRevision: 1 }]) {
    const result = preparePlanningRequest(observation, plan, changed);
    if (!result.ok) throw new Error(result.reason);
    expect(result.policyIdentity).not.toBe(first.policyIdentity);
  }
  for (const edited of [{ ...plan.entries[0]!, tag: 'manual' }, { ...plan.entries[0]!, objectId: 'road-id' }]) {
    const result = preparePlanningRequest(observation, { ...plan, entries: [edited] }, policy);
    if (!result.ok) throw new Error(result.reason);
    expect(result.policyIdentity).not.toBe(first.policyIdentity);
  }
});
