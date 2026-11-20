import { expect, test } from 'vitest';
import { bindStartupHauling } from '../../src/features/remotes/startup/hauling';
import { startupTravelPlan } from '../fixtures/startup-travel';
const request = () => ({ id: 'flow',owner: 'remote',source: 'container',sink: 'bank',resource: 'energy',quantity: 50,priority: 0,expiresAt: 100 });
const station = () => ({ source: 'source',id: 'container',position: { room: 'E0N1',x: 5,y: 24 } });
test('startup service binding retains request ownership and snapshots exact quoted service tiles',() => {
  const plan = startupTravelPlan(), result = bindStartupHauling(request(),plan,station());
  expect(result).toMatchObject({ id: 'flow',owner: 'remote',source: 'container',sink: 'bank',service: { collection: { x: 4,y: 24 },deposit: { x: 44,y: 25 } } });
  plan.collection.x = 1; expect(result.service!.collection.x).toBe(4);
});
test('different source/endpoint/resource or station identity cannot borrow a travel plan',() => {
  for (const changed of [{ ...request(),source: 'other' },{ ...request(),sink: 'other' },{ ...request(),resource: 'H' }]) expect(() => bindStartupHauling(changed,startupTravelPlan(),station())).toThrow('endpoint mismatch');
  expect(() => bindStartupHauling(request(),startupTravelPlan(),{ ...station(),source: 'other' })).toThrow('station mismatch');
  expect(() => bindStartupHauling(request(),startupTravelPlan(),{ ...station(),position: { room: 'E0N1',x: 6,y: 24 } })).toThrow('station mismatch');
});
test('a previously bound service cannot be silently moved',() => {
  const bound = bindStartupHauling(request(),startupTravelPlan(),station()); expect(bindStartupHauling(bound,startupTravelPlan(),station())).toEqual(bound);
  bound.service!.deposit.x--; expect(() => bindStartupHauling(bound,startupTravelPlan(),station())).toThrow('already bound');
});
