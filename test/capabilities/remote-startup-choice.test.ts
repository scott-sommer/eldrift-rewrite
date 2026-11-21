import { expect, test } from 'vitest';
import { chooseStartupProject } from '../../src/capabilities/economy/startup/choice';
import { forecastStartupProject } from '../../src/capabilities/economy/startup/project';
import { startupDeliveryInput } from '../fixtures/startup-delivery';
const policy = { minimumRecoveryMargin: 0,minimumDeliveredEnergy: 1,maximumRecoveryTicks: 1000,maximumHouseholdCapital: 1000 };
function alternative(id: string, delayed = false) {
  const input = startupDeliveryInput(); input.project.spawning.cash.horizon = 1000;
  input.project.spawning.cash.homeEnergy = 1000; input.project.spawning.funding.initialEnergy = 1000; input.project.spawning.funding.capacity = 1000;
  input.project.source.energy = 10000; input.project.source.capacity = 10000;
  input.couriers = [{ ...input.couriers[0]!,outboundTicks: 50,returnTicks: 50,...(delayed ? { initialOutboundTicks: 500 } : {}) }];
  if (delayed) input.project.spawning.requests = input.project.spawning.requests.map(request => request.id === 'courier' ? { ...request,body: ['carry','carry','carry','move'] } : request);
  return { id,result: forecastStartupProject(input),requiredBirths: ['miner','courier'] };
}
test('the explicit order chooses final return or earlier payback from real finite forecasts',() => {
  const early = alternative('early'), later = alternative('later',true);
  expect(later.result.projectCash.constructionRecoveryMargin).toBeGreaterThan(early.result.projectCash.constructionRecoveryMargin);
  expect(later.result.projectCash.firstRecoveryAt).toBeGreaterThan(early.result.projectCash.firstRecoveryAt!);
  expect(chooseStartupProject([early,later],1000,policy,'final-return').selected).toBe('later');
  expect(chooseStartupProject([later,early],1000,policy,'payback').selected).toBe('early');
});
test('ties use stable identity and comparisons do not mutate forecasts',() => {
  const a = alternative('a'), b = { ...a,id: 'b' }, before = JSON.stringify([b,a]);
  expect(chooseStartupProject([b,a],1000,policy,'final-return').selected).toBe('a');
  expect(chooseStartupProject([a,b],1000,policy,'payback').selected).toBe('a');
  expect(JSON.stringify([b,a])).toBe(before);
});
test('rejected alternatives stay visible and are never selected to fill an empty choice',() => {
  const a = alternative('a');
  const refused = chooseStartupProject([a],1000,{ ...policy,minimumRecoveryMargin: 100000 },'final-return');
  expect(refused.selected).toBeNull(); expect(refused.assessments[0]?.rejected).toContain('final-return');
  expect(chooseStartupProject([],1000,policy,'payback')).toEqual({ selected: null,assessments: [] });
});
test('comparison refuses ambiguous identity, different horizons and excessive alternatives',() => {
  const a = alternative('a');
  expect(() => chooseStartupProject([a,a],1000,policy,'payback')).toThrow('Duplicate');
  expect(() => chooseStartupProject([a],999,{ ...policy,maximumRecoveryTicks: 999 },'payback')).toThrow('horizon');
  expect(() => chooseStartupProject(Array.from({ length: 129 },(_,i) => ({ ...a,id: String(i) })),1000,policy,'payback')).toThrow('alternatives');
  expect(() => chooseStartupProject([],NaN,policy,'payback')).toThrow('horizon');
});
