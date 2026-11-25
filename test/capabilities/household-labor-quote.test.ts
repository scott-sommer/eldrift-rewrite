import { expect, test } from 'vitest';
import { quoteHouseholdLaborJob } from '../../src/capabilities/economy/startup/household/labor/quote';
import type { HouseholdLaborQuoteInput } from '../../src/capabilities/economy/startup/household/labor/quote';
function fixture(): HouseholdLaborQuoteInput {
  return { job: { id: 'work',request: 'worker',kind: 'build',pickupAt: 9,outboundTicks: 0,returnTicks: 0 },body: ['work','carry','move'],horizon: 24,maximumLoad: 10,maximumWorkTicks: 2,remainingWork: 3 };
}
test.each([['build',3,3,1],['repair',101,2,2],['upgrade',100,2,2]] as const)('task-bounded %s quote caps carried energy and opportunities to the workload', (kind,remainingWork,energy,workTicks) => {
  const input = fixture(); input.job.kind = kind; input.remainingWork = remainingWork; const before = JSON.stringify(input), result = quoteHouseholdLaborJob(input);
  expect(result).toMatchObject({ status: 'ready',strategy: 'task-bounded',job: { energy,workTicks } }); expect(JSON.stringify(input)).toBe(before);
});
test('capacity, configured load and finite return horizon bound the same job',() => {
  const input = fixture(); input.maximumLoad = 2500; input.maximumWorkTicks = 100; input.remainingWork = 100000;
  expect(quoteHouseholdLaborJob(input)).toMatchObject({ job: { energy: 50,workTicks: 10 } });
  input.horizon = 12; expect(quoteHouseholdLaborJob(input)).toMatchObject({ job: { energy: 10,workTicks: 2 } });
  input.maximumLoad = 7; expect(quoteHouseholdLaborJob(input)).toMatchObject({ job: { energy: 7,workTicks: 2 } });
});
test('completed targets, missing capabilities and jobs unable to return within the horizon defer',() => {
  const input = fixture(); input.remainingWork = 0; expect(quoteHouseholdLaborJob(input)).toMatchObject({ reason: 'complete' });
  input.remainingWork = 3; input.body = ['carry','move']; expect(quoteHouseholdLaborJob(input)).toMatchObject({ reason: 'body' });
  input.body = ['work','carry','move']; input.horizon = 10; expect(quoteHouseholdLaborJob(input)).toMatchObject({ reason: 'horizon' });
});
test('invalid workload and limits refuse instead of silently rounding configuration',() => {
  const input = fixture(); input.remainingWork = -1; expect(() => quoteHouseholdLaborJob(input)).toThrow('workload');
  input.remainingWork = 3; input.maximumLoad = 1.5; expect(() => quoteHouseholdLaborJob(input)).toThrow('load limit');
});
