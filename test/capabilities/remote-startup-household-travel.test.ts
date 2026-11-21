import { expect, test } from 'vitest';
import { householdTravelPlan } from '../fixtures/household-travel';
import { quoteHouseholdTravel } from '../../src/capabilities/economy/startup/household/travel';
import type { HouseholdTravelLeg, HouseholdTravelMeasure } from '../../src/capabilities/economy/startup/household/travel';
const measure: HouseholdTravelMeasure = leg => ({ status: 'complete',ticks: leg.kind === 'loaded' ? 7 : 3,operations: 10,arrival: { ...leg.destination } });
test('quotes exact empty approach, full-cargo loaded service and empty return as separate legs',() => {
  const plan = householdTravelPlan(), seen: HouseholdTravelLeg[] = [];
  const result = quoteHouseholdTravel(plan,'topology',leg => { seen.push(leg); return measure(leg,() => true); });
  expect(result.status).toBe('complete'); if (result.status !== 'complete') return;
  expect(seen.map(leg => [leg.kind,leg.load,leg.range])).toEqual([['approach',0,0],['loaded',100,0],['return',0,0]]);
  expect(result.operations).toBe(30); expect(result.legs.map(leg => leg.ticks)).toEqual([3,7,3]);
  expect(result.plan.destination.id).toBe('spawn');
});
test('budget exhaustion and incomplete legs never yield a usable travel quote',() => {
  let guards = 0;
  expect(quoteHouseholdTravel(householdTravelPlan(),'topology',measure,() => ++guards <= 1)).toMatchObject({ status: 'deferred',completedLegs: 1 });
  expect(quoteHouseholdTravel(householdTravelPlan(),'topology',() => ({ status: 'deferred',reason: 'path-incomplete' }))).toEqual({ status: 'deferred',reason: 'path-incomplete',completedLegs: 0 });
});
test('inexact arrivals and invalid measured times are refused',() => {
  expect(() => quoteHouseholdTravel(householdTravelPlan(),'topology',leg => ({ status: 'complete',ticks: 1,operations: 1,arrival: { ...leg.destination,x: leg.destination.x+1 } }))).toThrow('arrival');
  expect(() => quoteHouseholdTravel(householdTravelPlan(),'topology',leg => ({ status: 'complete',ticks: NaN,operations: 1,arrival: leg.destination }))).toThrow('measurement');
});
test('service geometry and unsupported bodies cannot create a quote',() => {
  const plan = householdTravelPlan(); plan.source.pickup.x = 20;
  expect(() => quoteHouseholdTravel(plan,'topology',measure)).toThrow('adjacency');
  const other = householdTravelPlan(); other.body = ['work','carry','move']; expect(() => quoteHouseholdTravel(other,'topology',measure)).toThrow('body');
});
test('caller and callback mutations cannot change detached identity or later leg requests',() => {
  const plan = householdTravelPlan(), expected = householdTravelPlan(); let calls = 0;
  const result = quoteHouseholdTravel(plan,'topology',leg => {
    if (++calls === 1) { plan.body = ['move']; plan.source.pickup.x = 20; leg.origin.x = 10; }
    return measure(leg,() => true);
  });
  expect(result.status).toBe('complete'); if (result.status !== 'complete') return;
  expect(result.plan).toEqual(expected); expect(result.legs[1]?.origin).toEqual(expected.source.pickup);
});
