import { expect, test, vi } from 'vitest';
import { runPlanningCycle } from '../../src/features/planning/planning-cycle';
import { createPlanningJobStore } from '../../src/features/planning/planning-job-store';
import { createPlanStore } from '../../src/features/planning/plan-store';
import type { PlanningJobInput } from '../../src/features/planning/planning-job-model';
import type { PlanProposal } from '../../src/features/planning/plan-store';
import type { Envelope } from '../../src/persistence/versioned-state';
function setup() {
  const records: Record<string, unknown> = {};
  const port = { read: (key: string) => records[key], write: (key: string, value: Envelope) => { records[key] = value; } };
  const types = ['spawn', 'storage'];
  const ports = { jobs: createPlanningJobStore(port, 'W0N1', types), plans: createPlanStore(port, 'W0N1', types), validateCommit: () => true };
  const costs = { hauling: 1, service: 0, capacityShortfall: 0, swamps: 0, defense: 0, migration: 0 };
  const proposal: PlanProposal = { strategy: 'standard', entries: [
    { type: 'spawn', x: 24, y: 25, rcl: 1, priority: -430, source: 'strategy' },
    { type: 'storage', x: 25, y: 25, rcl: 4, priority: -500, source: 'strategy' }],
    provenance: { candidateId: 'standard:0', strategyVersion: '1', observation: 'obs', policy: 'policy',
      generatedAt: 1, anchor: { x: 25, y: 25 }, transform: 0, bootstrap: { spawn: 'spawn:24:25', storage: 'storage:25:25' }, costs } };
  const input: PlanningJobInput = { observation: 'obs', policy: 'policy', baseRevision: 0, weights: costs, minimumImprovement: 0,
    source: { revision: 'source', count: 1, at: () => ({ id: 'standard:0', strategy: 'standard', anchor: { x: 25, y: 25 }, transform: 0 }) },
    validate: () => true, step: vi.fn(() => ({ status: 'complete' as const, proposal })) };
  return { ports, input, port, proposal };
}
test('finished request retires full checkpoints and remains idle across store recreation', () => {
  const { ports, input, port } = setup();
  expect(runPlanningCycle(ports, input, 2, 1)).toMatchObject({ status: 'finished', outcome: 'committed', recovered: false });
  expect(ports.jobs.read()).not.toHaveProperty('checkpoint');
  const revision = ports.jobs.read().revision;
  ports.jobs = createPlanningJobStore(port, 'W0N1', ['spawn', 'storage']);
  expect(runPlanningCycle(ports, input, 3, 1)).toMatchObject({ status: 'idle' });
  expect(ports.jobs.read().revision).toBe(revision);
  expect(ports.plans.read().revision).toBe(1);
  expect(input.step).toHaveBeenCalledTimes(1);
});
test('lost acknowledgement recovers committed plan then retires progress', () => {
  const { ports, input } = setup();
  const finish = ports.jobs.finish;
  ports.jobs.finish = () => ({ ok: false, reason: 'revision' });
  expect(runPlanningCycle(ports, input, 2, 1)).toMatchObject({ status: 'conflict' });
  expect(ports.plans.read().revision).toBe(1);
  expect(ports.jobs.read().checkpoint?.next).toBe(1);
  ports.jobs.finish = finish;
  expect(runPlanningCycle(ports, input, 3, 1)).toMatchObject({ status: 'finished', recovered: true });
  expect(ports.plans.read().provenance?.committedAt).toBe(2);
});
test('changed input restarts unfinished work without altering the committed plan', () => {
  const { ports, input } = setup();
  input.step = () => ({ status: 'pending', checkpoint: { phase: 'draft' } });
  runPlanningCycle(ports, input, 1, 1);
  const original = ports.jobs.read().checkpoint!.signature;
  const plan = ports.plans.read();
  expect(runPlanningCycle(ports, { ...input, observation: 'changed' }, 2, 1)).toMatchObject({ status: 'pending' });
  expect(ports.jobs.read().checkpoint!.signature).not.toBe(original);
  expect(ports.plans.read()).toEqual(plan);
});
test('no valid candidate records a receipt and suppresses repeated failed evaluation', () => {
  const { ports, input } = setup();
  input.step = vi.fn(() => ({ status: 'rejected' as const, reason: 'blocked' }));
  expect(runPlanningCycle(ports, input, 1, 1)).toMatchObject({ status: 'finished', outcome: 'no-valid-candidate' });
  expect(runPlanningCycle(ports, input, 2, 1)).toMatchObject({ status: 'idle' });
  expect(input.step).toHaveBeenCalledTimes(1);
  expect(ports.plans.read().revision).toBe(0);
});
test('a newer plan supersedes an unstarted request without evaluating candidates', () => {
  const { ports, input, proposal } = setup();
  ports.plans.commit(0, proposal, { tick: 1, observation: 'obs', policy: 'policy' }, () => true);
  expect(runPlanningCycle(ports, input, 2, 1)).toMatchObject({ status: 'superseded' });
  expect(input.step).not.toHaveBeenCalled();
});
