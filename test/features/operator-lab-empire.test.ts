import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createEmpireLabOperator } from '../../src/features/operator/lab-empire';
function fixture() {
  let memory = {}, writes = 0; const port = createMemoryPort(() => memory);
  const state = { read: port.read,write: (...args: Parameters<typeof port.write>) => { writes++; port.write(...args); } };
  const api = createEmpireLabOperator(state,{ clock: () => 10,homes: () => ['W0N1','W1N1'],productSupported: product => ['OH','UH'].includes(product) });
  return { port,api,raw: () => JSON.stringify(memory),writes: () => writes,reset: () => { memory = JSON.parse(JSON.stringify(memory)); } };
}
const policy = { labReactionsEnabled: true,labProductionScope: 'empire' as const,labProductionTargets: [{ product: 'OH',amount: 15,priority: 0 }] };
test('shared inspection/preview/absent clears do not initialize any namespace',() => {
  const f = fixture(); expect(f.api.inspectEmpire()).toMatchObject({ ok: true,windows: [],values: { labProductionScope: 'room' } });
  expect(f.api.previewEmpire(policy)).toMatchObject({ ok: true,values: policy }); expect(f.api.clearEmpire().changed).toBe(false);
  expect(f.raw()).toBe('{}'); expect(f.writes()).toBe(0);
});
test('one shared policy write preserves other layers, unrelated keys, room overrides and reset/replay identity',() => {
  const f = fixture(); f.port.write('operator/config',{ owner: 'operator',version: 1,data: { environment: { labReagentReserve: 7 },empire: { workersEnabled: true },profiles: { local: { labProductionScope: 'room' } },rooms: { W1N1: { profile: 'local',override: { workerBuilderTarget: 2 } } } } });
  const before = f.raw(); expect(f.api.previewEmpire(policy).ok).toBe(true); expect(f.raw()).toBe(before);
  const result = f.api.configureEmpire(policy); expect(result.changed).toBe(true); expect(f.writes()).toBe(1); f.reset(); expect(f.api.configureEmpire(policy).changed).toBe(false);
  expect(f.port.read('operator/config')).toMatchObject({ data: { environment: { labReagentReserve: 7 },empire: { workersEnabled: true,...policy },profiles: { local: { labProductionScope: 'room' } },rooms: { W1N1: { profile: 'local',override: { workerBuilderTarget: 2 } } } } });
  expect(f.api.inspectEmpire().sources.labProductionScope).toBe('empire'); expect(f.api.inspectEmpire().sources.labReagentReserve).toBe('environment');
});
test('conflicting current owned-room target overrides are previewed and refuse the entire write',() => {
  const f = fixture(); f.port.write('operator/config',{ owner: 'operator',version: 1,data: { empire: policy,rooms: { W0N1: { override: { labProductionTargets: [{ product: 'OH',amount: 5,priority: 0 }] } } } } });
  const before = f.raw(); expect(f.api.previewEmpire({ labProductionBatch: 50 })).toMatchObject({ ok: false,conflicts: ['W0N1'] });
  expect(() => f.api.configureEmpire({ labProductionBatch: 50 })).toThrow('W0N1'); expect(f.raw()).toBe(before); expect(f.writes()).toBe(0);
});
test('shared clearing removes only selected lab keys and retains unrelated policy and environment fallback',() => {
  const f = fixture(); f.port.write('operator/config',{ owner: 'operator',version: 1,data: { environment: { labProductionBatch: 30 },empire: { workersEnabled: true,labProductionBatch: 20 } } });
  expect(f.api.clearEmpire(['labProductionBatch'])).toMatchObject({ changed: true,values: { labProductionBatch: 30 } });
  expect(f.port.read('operator/config')).toMatchObject({ data: { empire: { workersEnabled: true } } }); expect(f.api.clearEmpire(['labProductionBatch']).changed).toBe(false);
});
test('invalid products, amounts, unrelated settings and room-specific identities refuse without a partial policy write',() => {
  const f = fixture();
  for (const input of [{ labReactionProduct: 'bad' },{ labReactionTarget: -1 },{ labReservedIds: [] },{ labBoostRoles: [] },{ workersEnabled: true }]) expect(() => f.api.configureEmpire(input)).toThrow();
  expect(f.raw()).toBe('{}'); expect(f.writes()).toBe(0);
});
test('future operator state refuses unchanged; caller edits of inspected targets cannot mutate policy',() => {
  const f = fixture(); f.api.configureEmpire(policy); const view = f.api.inspectEmpire(); (view.values.labProductionTargets as unknown as { amount: number }[])[0]!.amount = 1000;
  expect(f.api.inspectEmpire().values.labProductionTargets).toEqual(policy.labProductionTargets);
  f.port.write('operator/config',{ owner: 'operator',version: 2,data: {} }); const before = f.raw();
  expect(() => f.api.configureEmpire(policy)).toThrow('future'); expect(f.raw()).toBe(before);
});

test('shared threshold policy rejects participating room intermediate-policy conflicts before a write',() => {
  const f = fixture(); f.port.write('operator/config',{ owner: 'operator',version: 1,data: { empire: { labReactionsEnabled: true,labProductionScope: 'empire',labProductionPolicy: 'thresholds',labProductionThresholds: [{ product: 'OH',amount: 15,priority: 0 }] },rooms: { W0N1: { override: { labIntermediateBase: 5 } } } } });
  const before = f.raw(); expect(f.api.previewEmpire({ labProductionBatch: 50 })).toMatchObject({ ok: false,conflicts: ['W0N1'] });
  expect(() => f.api.configureEmpire({ labProductionBatch: 50 })).toThrow('W0N1'); expect(f.raw()).toBe(before);
});
