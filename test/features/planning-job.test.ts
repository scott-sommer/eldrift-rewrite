import { expect, test, vi } from 'vitest';
import { advancePlanningJob } from '../../src/features/planning/planning-job';
import type { PlanningJobInput, PlanningCandidate } from '../../src/features/planning/planning-job-model';
import type { PlanProposal } from '../../src/features/planning/plan-store';
const weights = { hauling: 1, service: 0, capacityShortfall: 0, swamps: 0, defense: 0, migration: 0 };
function proposal(candidate: PlanningCandidate, cost: number): PlanProposal {
  return { strategy: candidate.strategy, entries: [], provenance: {
    candidateId: candidate.id, strategyVersion: 'v1', observation: 'obs', policy: 'policy', generatedAt: 1,
    anchor: candidate.anchor, transform: candidate.transform, bootstrap: { spawn: 'spawn', storage: 'storage' },
    costs: { ...weights, hauling: cost } } };
}
function input(): PlanningJobInput {
  const candidates = ['expensive', 'cheap', 'previous'].map(id => ({ id, strategy: 'standard',
    anchor: { x: 25, y: 25 }, transform: 0 as const }));
  return { observation: 'obs', policy: 'policy', baseRevision: 4, weights, minimumImprovement: 0,
    source: { revision: 'candidates-v1', count: candidates.length, at: index => candidates[index]! },
    step: (candidate, checkpoint) => checkpoint === undefined
      ? { status: 'pending', checkpoint: { prepared: true } }
      : { status: 'complete', proposal: proposal(candidate, { expensive: 20, cheap: 5, previous: 7 }[candidate.id]!) },
    validate: () => true };
}
test('waits for every candidate, resumes serialized progress and retains only best plus previous', () => {
  const request = { ...input(), previousId: 'previous' };
  let result = advancePlanningJob(request, undefined, 1);
  for (let step = 1; step < 6; step++) {
    expect(result.done).toBe(false);
    expect(result).not.toHaveProperty('proposal');
    result = advancePlanningJob(request, JSON.parse(JSON.stringify(result.checkpoint)), 1);
  }
  expect(result).toMatchObject({ done: true, proposal: { provenance: { candidateId: 'cheap' } },
    checkpoint: { next: 3, seen: ['expensive', 'cheap', 'previous'], best: { provenance: { candidateId: 'cheap' } },
      previous: { provenance: { candidateId: 'previous' } } } });
  expect(advancePlanningJob(request, result.checkpoint, 1)).toMatchObject({ done: true, steps: 0 });
});
test('hysteresis compares re-evaluated previous proposal against the best', () => {
  const result = advancePlanningJob({ ...input(), previousId: 'previous', minimumImprovement: 2 }, undefined, 6);
  expect(result).toMatchObject({ done: true, proposal: { provenance: { candidateId: 'previous' } } });
});
test('rejected candidates cannot win and all rejected produces no proposal', () => {
  const request = input();
  request.step = candidate => ({ status: 'rejected', reason: 'blocked:' + candidate.id });
  expect(advancePlanningJob(request, undefined, 3)).toMatchObject({
    done: true, reason: 'no-valid-candidate', checkpoint: { rejected: 3 } });
});
test('changed observation, weights, candidate source or plan revision reject restoration', () => {
  const request = input(), first = advancePlanningJob(request, undefined, 1);
  for (const changed of [{ ...request, observation: 'new' }, { ...request, baseRevision: 5 },
    { ...request, weights: { ...weights, hauling: 2 } }, { ...request, source: { ...request.source, revision: 'v2' } }]) {
    expect(() => advancePlanningJob(changed, first.checkpoint, 1)).toThrow('Stale');
  }
});
test('budget guard and throwing evaluators leave stored progress intact', () => {
  const request = input(), first = advancePlanningJob(request, undefined, 1);
  const saved = JSON.stringify(first.checkpoint);
  request.step = vi.fn(() => { throw new Error('CPU exhausted'); });
  expect(advancePlanningJob(request, first.checkpoint, 1, () => false)).toMatchObject({ steps: 0, done: false });
  expect(request.step).not.toHaveBeenCalled();
  expect(() => advancePlanningJob(request, first.checkpoint, 1)).toThrow('CPU exhausted');
  expect(JSON.stringify(first.checkpoint)).toBe(saved);
});
test('hard validation runs before ranking and again before exposing a selection', () => {
  const request = input();
  request.validate = () => false;
  expect(() => advancePlanningJob(request, undefined, 2)).toThrow('invalid proposal');
  request.validate = () => true;
  const completed = advancePlanningJob(request, undefined, 6);
  request.validate = () => false;
  expect(advancePlanningJob(request, completed.checkpoint, 0)).toMatchObject({ reason: 'invalidated-selection' });
});
test('duplicate candidates, mismatched proposals and changed pending identities fail', () => {
  const request = input(), first = advancePlanningJob(request, undefined, 1);
  request.source.at = () => ({ id: 'changed', strategy: 'standard', anchor: { x: 25, y: 25 }, transform: 0 });
  expect(() => advancePlanningJob(request, first.checkpoint, 1)).toThrow('Changed pending');
  request.step = candidate => ({ status: 'complete', proposal: proposal({ ...candidate, id: 'wrong' }, 1) });
  expect(() => advancePlanningJob(request, undefined, 1)).toThrow('does not match');
  request.step = candidate => ({ status: 'complete', proposal: proposal(candidate, 1) });
  expect(() => advancePlanningJob(request, undefined, 2)).toThrow('Duplicate');
});
test('validator mutations cannot change retained proposals or final output', () => {
  const request = input();
  request.validate = value => { value.provenance.costs.hauling = 999; return true; };
  expect(advancePlanningJob(request, undefined, 6)).toMatchObject({
    proposal: { provenance: { candidateId: 'cheap', costs: { hauling: 5 } } } });
});

test('equal scores choose stable candidate identity rather than encounter order', () => {
  const request = input();
  request.step = candidate => ({ status: 'complete', proposal: proposal(candidate, 5) });
  expect(advancePlanningJob(request, undefined, 3)).toMatchObject({
    proposal: { provenance: { candidateId: 'cheap' } } });
});
test('evaluator mutation cannot rewrite the candidate identity used for validation', () => {
  const request = input();
  request.step = candidate => {
    candidate.id = 'injected';
    return { status: 'complete', proposal: proposal(candidate, 1) };
  };
  expect(() => advancePlanningJob(request, undefined, 1)).toThrow('does not match');
  expect(request.source.at(0).id).toBe('expensive');
});
