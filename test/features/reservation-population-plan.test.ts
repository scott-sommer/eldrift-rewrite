import { expect, test } from 'vitest';
import { managementFixture } from '../fixtures/remote-management';
import { reservationQuote } from '../fixtures/reservation-quote';
import { createRemoteManagement } from '../../src/features/remotes/management/cycle';
import { reservationPlan } from '../../src/features/remotes/reservation/plan';
import { reservationIdentity, reservationOwner } from '../../src/features/remotes/reservation/identity';
function fixture() {
  const f = managementFixture(); f.request.policy.candidates[0]!.reservation = reservationQuote();
  f.request.policy.portfolio.maximumSlots = 10;
  for (const quote of f.offer.quotes) quote.assessment.policy.reservation = { energyPerTick: 0,spawnLoad: 0,shares: 1 };
  const manager = createRemoteManagement(f.state,'W0N1',{ ...f.ports,currentReservation: () => true });
  manager.advance(f.request,{ rooms: 1,sources: 2 },() => true);
  return { lease: f.assignments.owner('E0N1',20)!,record: manager.read() };
}
test('reservation population belongs to one managed generation and its priced controller',() => {
  const f = fixture(), plan = reservationPlan(f.lease,f.record,20,100)!;
  expect(reservationIdentity(plan.owner)).toEqual({ home: 'W0N1',room: 'E0N1',generation: f.lease.generation });
  expect(plan.demand.controller).toEqual(plan.quote.controller);
  expect(plan.quote.body.cost).toBe(1300);
  f.lease.generation++;
  expect(reservationPlan(f.lease,f.record,20,100)).toBeUndefined();
});
test('unmanaged, expired, unreserved and changed-controller leases cannot recruit from another cached offer',() => {
  const f = fixture();
  for (const mutate of [
    (g: typeof f) => { g.record.managed = []; },
    (g: typeof f) => { g.lease.renewedAt = 19; g.lease.expiresAt = 20; },
    (g: typeof f) => { g.lease.plan.reserve = null; },
    (g: typeof f) => { g.lease.plan.reserve!.position.x++; },
    (g: typeof f) => { g.record.offers[0]!.reservation = null; },
    (g: typeof f) => { g.record.offers[0]!.reservation!.quote.body.cost++; },
    (g: typeof f) => { g.record.home = 'W1N1'; },
  ]) {
    const g = structuredClone(f); mutate(g);
    expect(reservationPlan(g.lease,g.record,20,100)).toBeUndefined();
  }
  expect(reservationPlan(f.lease,f.record,20,4)).toBeUndefined();
  expect(reservationPlan(f.lease,f.record,20,5)).toBeDefined();
});
test('reservation owner identities reject malformed scopes and retain generation boundaries',() => {
  const owner = reservationOwner({ home: 'W0N1',room: 'E0N1',generation: 1 });
  expect(reservationIdentity(owner)).toEqual({ home: 'W0N1',room: 'E0N1',generation: 1 });
  for (const invalid of ['remote-fleet:[]','remote-reservation:null','remote-reservation:["W0N1","W0N1",1]','remote-reservation:["W0N1","E0N1",0]','remote-reservation:["W0N1","E0N1",1,"extra"]']) expect(reservationIdentity(invalid)).toBeUndefined();
  expect(() => reservationOwner({ home: 'W0N1',room: 'E0N1',generation: 0 })).toThrow();
});
