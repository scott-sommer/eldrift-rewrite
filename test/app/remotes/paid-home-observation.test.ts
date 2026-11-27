import { expect,test,vi } from 'vitest';
import { paidRouteFixture } from '../../fixtures/paid-route';
import { createNativePaidHomeObservation } from '../../../src/app/remotes/startup/home-observation/native';
test('ambiguous source/body scope and budget refusal never read or initialize native owner state',() => {
  const f = paidRouteFixture(),read = vi.fn(() => { throw new Error('Unexpected read'); }),write = vi.fn();
  const observe = createNativePaidHomeObservation({ read,write },{ availableEnergy: (_home,energy) => energy });
  const group = { plan: f.context.plan,cohort: { ...f.context.cohort,observedAt: 100,approvedAt: 33,sinkCapacity: 1000,workers: [f.context.paid] } };
  const request = { home: 'W0N1',endpoint: 'bank',groups: [group],requireActivated: true };
  expect(observe({ ...request,groups: [group,group] }).status).toBe('deferred');
  expect(observe(request,() => false).status).toBe('deferred');
  expect(observe({ ...request,home: 'other' }).status).toBe('deferred'); expect(read).not.toHaveBeenCalled(); expect(write).not.toHaveBeenCalled();
});
