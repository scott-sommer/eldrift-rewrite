import { expect, test, vi } from 'vitest';
import { createPlanningFeature } from '../../src/app/planning-feature';
import { createRuntime } from '../../src/app/runtime';
import { createEnumerationStore } from '../../src/features/planning/enumeration-store';
import { createPlanningJobStore } from '../../src/features/planning/planning-job-store';
import { createPlanStore } from '../../src/features/planning/plan-store';
import type { Envelope } from '../../src/persistence/versioned-state';
function setup() {
  const records: Record<string, unknown> = {};
  const state = { read: (key: string) => records[key], write: (key: string, value: Envelope) => { records[key] = value; } };
  const clock = { tick: 1, used: 0, bucket: 10000, enabled: true, owned: true };
  const visits: string[] = [];
  const work = { ports: { candidates: createEnumerationStore(state, 'W0N1'),
    jobs: createPlanningJobStore(state, 'W0N1', []), plans: createPlanStore(state, 'W0N1', []), validateCommit: () => true },
    enumeration: { constrained: { controller: { x: 40, y: 40 }, preferred: [{ x: 25, y: 25 }], limit: 1 } },
    input: { observation: 'obs', policy: 'policy', baseRevision: 0,
      weights: { hauling: 1, service: 0, capacityShortfall: 0, swamps: 0, defense: 0, migration: 0 },
      minimumImprovement: 0, validate: () => true,
      step: (candidate: { id: string }) => { visits.push(candidate.id); clock.used = 6; return { status: 'rejected' as const, reason: 'fixture' }; } } };
  const ports = { enabled: () => clock.enabled, prepare: vi.fn(() => work),
    budget: () => ({ cpu: 5, attempts: 8, steps: 8 }), usedCpu: () => clock.used, tickLimit: () => 20, report: vi.fn() };
  const makeRuntime = () => createRuntime([createPlanningFeature(ports)], {
    observations: { visibleRooms: () => ['W0N1'], observeRoom: name => ({ name, owned: clock.owned, units: [], structures: [] }) },
    config: () => ({}), clock: () => ({ tick: clock.tick, tickLimit: 20, bucket: clock.bucket }),
    usedCpu: ports.usedCpu, reportFailure: () => {},
  });
  return { records, clock, work, ports, visits, makeRuntime };
}
test('scheduler admission defers planning on low bucket and only owned enabled rooms prepare', () => {
  const { clock, ports, makeRuntime } = setup(), runtime = makeRuntime();
  clock.bucket = 0; runtime.tick();
  expect(ports.prepare).not.toHaveBeenCalled();
  clock.bucket = 10000; clock.enabled = false; clock.tick++; runtime.tick();
  expect(ports.prepare).not.toHaveBeenCalled();
  clock.enabled = true; clock.owned = false; clock.tick++; runtime.tick();
  expect(ports.prepare).not.toHaveBeenCalled();
  clock.owned = true; clock.tick++; runtime.tick();
  expect(ports.prepare).toHaveBeenCalledOnce();
});
test('cooperative CPU guard yields scoring and durable progress resumes after runtime recreation', () => {
  const { clock, work, visits, ports, makeRuntime } = setup();
  for (let index = 0; index < 8; index++) {
    clock.tick = index + 1; clock.used = 0;
    expect(makeRuntime().tick().failures).toEqual([]);
    expect(visits).toHaveLength(index + 1);
  }
  expect(new Set(visits).size).toBe(8);
  expect(work.ports.jobs.read().receipt?.outcome).toBe('no-valid-candidate');
  clock.tick++; clock.used = 0;
  makeRuntime().tick();
  expect(visits).toHaveLength(8);
  expect(ports.report.mock.calls.at(-1)?.[1]).toMatchObject({ status: 'idle' });
  expect(work.ports.plans.read().revision).toBe(0);
});
test('preparation consuming the allowance prevents enumeration state writes', () => {
  const { clock, ports, records, work, makeRuntime } = setup();
  ports.prepare.mockImplementation(() => { clock.used = 5; return work; });
  makeRuntime().tick();
  expect(records).toEqual({});
  expect(ports.report).not.toHaveBeenCalled();
});
test('invalid budgets become scheduler failures without creating planner state', () => {
  const { ports, records, makeRuntime } = setup();
  ports.budget = () => ({ cpu: Number.NaN, attempts: 8, steps: 8 });
  expect(makeRuntime().tick().failures[0]?.id).toBe('W0N1/planning');
  expect(ports.prepare).not.toHaveBeenCalled();
  expect(records).toEqual({});
});
