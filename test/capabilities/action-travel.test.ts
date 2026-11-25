import { expect, test } from 'vitest';
import { quoteActionTravel } from '../../src/capabilities/movement/action-travel';
import { mobilityCosts } from '../../src/capabilities/movement/mobility';
const body = [{ kind: 'other' as const,active: true,movePower: 0,carryCapacity: 0 },{ kind: 'carry' as const,active: true,movePower: 0,carryCapacity: 50 },{ kind: 'move' as const,active: true,movePower: 1,carryCapacity: 0 }];
test('finite loaded travel excludes final fatigue clearance before a work action',() => {
  const mobility = mobilityCosts(body,10); expect(quoteActionTravel(mobility,[2,2,2])).toEqual({ status: 'complete',ticks: 5,arrivalFatigue: 2 });
  expect(quoteActionTravel(mobility,[1,1,1])).toEqual({ status: 'complete',ticks: 3,arrivalFatigue: 0 });
  expect(quoteActionTravel(mobilityCosts(body,0),[2,2,2])).toEqual({ status: 'complete',ticks: 3,arrivalFatigue: 0 });
});
test('mixed terrain and starting fatigue are carried through movement opportunities',() => {
  const mobility = mobilityCosts(body,8); expect(quoteActionTravel(mobility,[10,2])).toEqual({ status: 'complete',ticks: 11,arrivalFatigue: 2 });
  expect(quoteActionTravel(mobility,[2],3)).toEqual({ status: 'complete',ticks: 3,arrivalFatigue: 2 });
  expect(quoteActionTravel({ mobile: false },[],3)).toEqual({ status: 'complete',ticks: 0,arrivalFatigue: 3 });
});
test('immobile routes and excessive travel defer; malformed terrain and fatigue refuse',() => {
  expect(quoteActionTravel({ mobile: false },[2])).toMatchObject({ reason: 'immobile' });
  expect(quoteActionTravel(mobilityCosts(body,10),Array(200).fill(10))).toMatchObject({ reason: 'travel-limit' });
  expect(() => quoteActionTravel(mobilityCosts(body,10),[3 as 2])).toThrow('input');
  expect(() => quoteActionTravel(mobilityCosts(body,10),[2],-1)).toThrow('input');
});
