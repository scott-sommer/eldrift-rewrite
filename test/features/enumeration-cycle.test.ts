import { expect, test, vi } from 'vitest';
import { runEnumerationCycle } from '../../src/features/planning/enumeration-cycle';
import { runEnumeratedPlanningCycle } from '../../src/features/planning/enumerated-planning-cycle';
import { createEnumerationStore } from '../../src/features/planning/enumeration-store';
import { createPlanningJobStore } from '../../src/features/planning/planning-job-store';
import { createPlanStore } from '../../src/features/planning/plan-store';
import type { PlanningJobInput } from '../../src/features/planning/planning-job-model';
import type { Envelope } from '../../src/persistence/versioned-state';
const options = { constrained: { controller: { x: 40, y: 40 }, preferred: [{ x: 25, y: 25 }], limit: 1 } };
function setup() {
  const records: Record<string, unknown> = {};
  const port = { read: (key: string) => records[key], write: (key: string, value: Envelope) => { records[key] = value; } };
  const ports = { candidates: createEnumerationStore(port, 'W0N1'),
    jobs: createPlanningJobStore(port, 'W0N1', ['spawn', 'storage']),
    plans: createPlanStore(port, 'W0N1', ['spawn', 'storage']), validateCommit: () => true };
  const input: Omit<PlanningJobInput, 'source'> = { observation: 'obs', policy: 'policy', baseRevision: 0,
    weights: { hauling: 1, service: 0, capacityShortfall: 0, swamps: 0, defense: 0, migration: 0 },
    minimumImprovement: 0, validate: () => true,
    step: vi.fn(() => ({ status: 'rejected' as const, reason: 'fixture' })) };
  return { records, port, ports, input };
}
test('scoring waits for complete persisted enumeration, resumes, then stays idle', () => {
  const { ports, port, input } = setup(), budgets = { attempts: 4, steps: 3 };
  expect(runEnumeratedPlanningCycle(ports, options, input, 1, budgets)).toMatchObject({ phase: 'enumeration', status: 'pending' });
  expect(input.step).not.toHaveBeenCalled();
  ports.candidates = createEnumerationStore(port, 'W0N1');
  expect(runEnumeratedPlanningCycle(ports, options, input, 2, budgets)).toMatchObject({ phase: 'scoring', status: 'pending', attempts: 4 });
  expect(ports.jobs.read().checkpoint?.next).toBe(3);
  const revision = ports.candidates.read().revision;
  ports.jobs = createPlanningJobStore(port, 'W0N1', ['spawn', 'storage']);
  runEnumeratedPlanningCycle(ports, options, input, 3, budgets);
  expect(runEnumeratedPlanningCycle(ports, options, input, 4, budgets)).toMatchObject({ status: 'finished', outcome: 'no-valid-candidate' });
  expect(runEnumeratedPlanningCycle(ports, options, input, 5, budgets)).toMatchObject({ status: 'idle', attempts: 0 });
  expect(input.step).toHaveBeenCalledTimes(8);
  expect(ports.candidates.read().revision).toBe(revision);
  expect(ports.plans.read().revision).toBe(0);
});
test('changed options restart generation and replace stale scoring progress only after completion', () => {
  const { ports, input } = setup();
  runEnumeratedPlanningCycle(ports, options, input, 1, { attempts: 8, steps: 1 });
  const old = ports.jobs.read().checkpoint!.signature;
  const changed = { constrained: { ...options.constrained, preferred: [{ x: 26, y: 25 }] } };
  expect(runEnumeratedPlanningCycle(ports, changed, input, 2, { attempts: 4, steps: 1 })).toMatchObject({ phase: 'enumeration' });
  expect(ports.jobs.read().checkpoint!.signature).toBe(old);
  runEnumeratedPlanningCycle(ports, changed, input, 3, { attempts: 4, steps: 1 });
  expect(ports.jobs.read().checkpoint!.signature).not.toBe(old);
  expect(ports.jobs.read().checkpoint!.seen).toEqual(['constrained:26:25:0']);
});
test('a failed batch save never exposes candidates to scoring', () => {
  const { ports, input } = setup();
  ports.candidates.save = () => ({ ok: false, reason: 'revision' });
  expect(runEnumeratedPlanningCycle(ports, options, input, 1, { attempts: 8, steps: 8 }))
    .toEqual({ phase: 'enumeration', status: 'conflict' });
  expect(input.step).not.toHaveBeenCalled();
});
test('failed restart clear preserves the old enumeration and halts the handoff', () => {
  const { ports } = setup();
  runEnumerationCycle(ports.candidates, options, 1);
  const old = ports.candidates.read();
  ports.candidates.clear = () => ({ ok: false, reason: 'revision' });
  expect(runEnumerationCycle(ports.candidates, {}, 8)).toEqual({ status: 'conflict' });
  expect(ports.candidates.read()).toEqual(old);
});
test('shared guard can stop scoring immediately after enumeration consumes its allowance', () => {
  const { ports, input } = setup();
  let allowance = 8;
  expect(runEnumeratedPlanningCycle(ports, options, input, 1, { attempts: 8, steps: 8 }, () => allowance-- > 0))
    .toMatchObject({ phase: 'scoring', status: 'pending', steps: 0 });
  expect(input.step).not.toHaveBeenCalled();
  expect(ports.candidates.read().checkpoint?.candidates).toHaveLength(8);
});
test('invalid budgets fail before a changed request can clear persisted work', () => {
  const { ports, input, records } = setup();
  runEnumerationCycle(ports.candidates, options, 1);
  const before = JSON.stringify(records);
  expect(() => runEnumeratedPlanningCycle(ports, {}, input, 2, { attempts: 8, steps: -1 })).toThrow('budget');
  expect(() => runEnumerationCycle(ports.candidates, {}, -1)).toThrow('budget');
  expect(JSON.stringify(records)).toBe(before);
});

test('a viable final candidate commits once after every candidate has been examined', () => {
  const { ports, input } = setup();
  const visited: string[] = [];
  input.step = candidate => {
    visited.push(candidate.id);
    if (candidate.transform !== 7) return { status: 'rejected', reason: 'fixture-obstruction' };
    return { status: 'complete', proposal: { strategy: candidate.strategy, entries: [
      { type: 'spawn', x: 24, y: 25, rcl: 1, priority: -430, source: 'strategy' },
      { type: 'storage', x: 25, y: 25, rcl: 4, priority: -500, source: 'strategy' }],
      provenance: { candidateId: candidate.id, strategyVersion: 'fixture-v1',
        observation: input.observation, policy: input.policy, generatedAt: 1,
        anchor: candidate.anchor, transform: candidate.transform,
        bootstrap: { spawn: 'spawn:24:25', storage: 'storage:25:25' }, costs: input.weights } } };
  };
  const budgets = { attempts: 8, steps: 7 };
  expect(runEnumeratedPlanningCycle(ports, options, input, 1, budgets)).toMatchObject({ status: 'pending' });
  expect(ports.plans.read().revision).toBe(0);
  expect(runEnumeratedPlanningCycle(ports, options, input, 2, budgets)).toMatchObject({ status: 'finished', outcome: 'committed' });
  expect(visited).toEqual(Array.from({ length: 8 }, (_, index) => 'constrained:25:25:' + index));
  expect(ports.plans.read().provenance?.candidateId).toBe('constrained:25:25:7');
  expect(runEnumeratedPlanningCycle(ports, options, input, 3, budgets)).toMatchObject({ status: 'idle' });
  expect(ports.plans.read().revision).toBe(1);
});
