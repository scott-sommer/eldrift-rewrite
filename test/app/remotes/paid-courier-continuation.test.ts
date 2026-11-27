import { expect,test } from 'vitest';
import { paidCourierContinuationInput } from '../../../src/app/remotes/startup/projection/motion/continuation-input';
import { continuationRequests } from '../../../src/app/remotes/startup/projection/motion/continuation-requests';
import type { PaidUnitContext } from '../../../src/app/remotes/startup/motion-observation/model';
import type { PaidCourierOpening } from '../../../src/app/remotes/startup/motion-observation/opening-model';
function fixture() {
  const point = (x: number) => ({ room: 'W0N1',x,y: 25 });
  const paid: PaidUnitContext['paid'] = { request: 'paid',owner: 'fleet',body: ['carry','move'],startAt: 1,activeAt: 7,expiresAt: 1507,retireAt: 1477,capacity: 50 };
  const context: PaidUnitContext = { paid,cohort: { home: 'W0N1',room: 'W0N1',source: 'source',generation: 1,endpoint: 'bank' },
    plan: { home: 'W0N1',room: 'W0N1',source: 'source',spawn: { id: 'spawn',position: point(9),exit: point(10) },station: point(13),collection: point(12),endpoint: { id: 'bank',position: point(9),deposit: point(10) },miner: ['work','move'],courier: paid.body } };
  const basis: PaidCourierOpening = { observed: { observedAt: 100,name: 'paid',unit: 'native',owner: 'fleet',position: point(11),energy: 32,fatigue: 4,activeAt: 7,expiresAt: 1507,retireAt: 1477,stage: 'deliver' },continuation: { stage: 'deliver',readyAt: 102,requestRemaining: 32 } };
  const requests = continuationRequests(context,basis,{ blocked: [] })!;
  const legs = requests.map(request => ({ ticks: 2,operations: 1,arrival: request.destination,path: request.origin.x < request.destination.x ? [point(11),point(12)] : [point(11),point(10)] }));
  legs[3]!.path = [point(10)];
  return { context,basis,requests,legs,origins: requests.map(request => request.origin) };
}
test('paid continuation retains current cargo, fatigue, owner and remaining life without scheduling a birth',() => {
  const f = fixture(),result = paidCourierContinuationInput(f.context,f.basis,f.legs,f.origins,20)!;
  expect(result.initial).toMatchObject({ id: 'paid',energy: 32,availableAt: 2,remainingSpawnTicks: 0,expiresAt: 1407,retireTicks: 30,phase: 'deliver' });
  expect(result.opening).toMatchObject({ readyAt: 2,fatigue: 4,owner: 'fleet',plan: { unit: 'paid',order: 'paid',origin: f.basis.observed.position } });
  expect(Object.keys(result).sort()).toEqual(['initial','opening','route']);
  expect(f.requests.map(request => request.load)).toEqual([0,0,50,32]);
});
test('incubating paid body starts from its reserved exit and retains only remaining spawn time',() => {
  const f = fixture(); f.basis.continuation.stage = 'spawning'; f.basis.continuation.readyAt = 108;
  f.basis.observed.activeAt = 108; f.basis.observed.energy = 0; f.basis.observed.fatigue = 0;
  const requests = continuationRequests(f.context,f.basis,{ blocked: [] })!;
  expect(requests[3]!.origin).toEqual(f.context.plan.spawn.exit);
  f.legs[3]!.path = [f.origins[3]!];
  const result = paidCourierContinuationInput(f.context,f.basis,f.legs,f.origins,20)!;
  expect(result.initial).toMatchObject({ remainingSpawnTicks: 8,availableAt: 8,energy: 0,phase: 'collect' });
});
test('new return route cannot silently extend a paid retirement policy or revive an expired opening',() => {
  const f = fixture(); f.legs[2]!.ticks = 30;
  expect(paidCourierContinuationInput(f.context,f.basis,f.legs,f.origins,20)).toBeUndefined();
  f.legs[2]!.ticks = 2; f.basis.continuation.readyAt = 1477;
  expect(paidCourierContinuationInput(f.context,f.basis,f.legs,f.origins,20)).toBeUndefined();
});
