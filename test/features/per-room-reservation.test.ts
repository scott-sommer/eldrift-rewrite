import { expect, test, vi } from 'vitest';
import { managementFixture } from '../fixtures/remote-management';
import { remoteOffer } from '../fixtures/remote-portfolio';
import { reservationQuote } from '../fixtures/reservation-quote';
import { createRemoteManagement } from '../../src/features/remotes/management/cycle';
import { createRemoteManagementStore } from '../../src/features/remotes/management/store';
import { createRemoteRoomOffer } from '../../src/features/remotes/reservation/room-offer';
import { selectRemotePortfolio } from '../../src/features/remotes/portfolio';
import type { RemoteAssessmentRequest } from '../../src/features/remotes/assessment-model';
function fixture() {
  const f = managementFixture(), quote = reservationQuote(); f.request.policy.candidates[0]!.reservation = quote;
  f.request.policy.portfolio.maximumSlots = 10;
  const assess = vi.fn((input: RemoteAssessmentRequest) => ({ ...structuredClone(f.offer.quotes.find(item => item.assessment.source === input.source)!.assessment),policy: structuredClone(input.economics) }));
  const ports = { ...f.ports,summary: vi.fn((room: string) => room === f.summary.room ? f.summary : undefined),assess,currentReservation: vi.fn(() => true) };
  const manager = () => createRemoteManagement(f.state,'W0N1',ports);
  return { ...f,quote,ports,manager };
}
test('mixed quoted and explicitly unreserved rooms override the global flag without double charging or changing observations',() => {
  const f = fixture(), north = remoteOffer('W0N2',[20]); north.quotes[0]!.assessment.travel.rooms = ['W0N1','W0N2'];
  f.request.policy.candidates.push({ room: 'W0N2',commitment: north.commitment,reservation: null });
  f.ports.summary.mockImplementation(name => name === 'W0N2' ? { ...f.summary,room: 'W0N2',sources: north.quotes.map(item => item.assessment.sourceFacts) } : f.summary);
  f.ports.assess.mockImplementation(input => ({ ...structuredClone([...f.offer.quotes,...north.quotes].find(item => item.assessment.source === input.source)!.assessment),policy: structuredClone(input.economics) }));
  const result = f.manager().advance(f.request,{ rooms: 2,sources: 3 },() => true);
  expect(result.status).toBe('applied');
  expect(f.assignments.owner('E0N1',20)!.plan.reserve).toEqual(f.quote.controller); expect(f.assignments.owner('W0N2',20)!.plan.reserve).toBeNull();
  const offers = f.manager().read().offers;
  expect(offers[0]!.commitment.energyPerTick).toBe(f.quote.economics.energyPerTick);
  expect(offers.every(offer => offer.quotes.every(item => item.assessment.policy.reservation.energyPerTick === 0))).toBe(true);
  expect(offers.flatMap(offer => offer.quotes).every(item => item.assessment.sourceFacts.capacity === 1500)).toBe(true);
  expect(f.ports.currentReservation).toHaveBeenCalled();
});
test('quote persistence survives recreation while missing or revoked live admission cannot publish Reserve authority',() => {
  const f = fixture(); f.manager().advance(f.request,{ rooms: 1,sources: 2 },() => true);
  expect(createRemoteManagementStore(f.state,'W0N1').read().offers[0]!.reservation?.quote).toEqual(f.quote);
  f.request.tick++; f.ports.currentReservation.mockReturnValue(false); f.manager().advance(f.request,{ rooms: 0,sources: 0 },() => true);
  expect(f.assignments.owner('E0N1',21)).toBeUndefined();
  const other = fixture(); const noReservationPort = { summary: other.ports.summary,assess: other.ports.assess,current: other.ports.current };
  createRemoteManagement(other.state,'W0N1',noReservationPort).advance(other.request,{ rooms: 1,sources: 2 },() => true);
  expect(other.assignments.owner('E0N1',20)).toBeUndefined();
});
test('controller changes between scan and commit refuse the cached reservation even if source admission succeeds',() => {
  const f = fixture(); expect(f.manager().advance(f.request,{ rooms: 1,sources: 1 },() => true).status).toBe('scanning');
  f.summary.controller.x = 26; f.request.tick++;
  f.manager().advance(f.request,{ rooms: 0,sources: 1 },() => true);
  expect(f.assignments.owner('E0N1',21)).toBeUndefined(); expect(f.ports.currentReservation).not.toHaveBeenCalled();
});
test('tampered prices, duplicate charges, wrong controllers and expired reservation quotes cannot certify a room',() => {
  const f = fixture(), candidate = f.request.policy.candidates[0]!, offer = createRemoteRoomOffer(candidate,f.offer.sourceIds);
  offer.quotes = structuredClone(f.offer.quotes); for (const item of offer.quotes) item.assessment.policy.reservation = { energyPerTick: 0,spawnLoad: 0,shares: 1 };
  const run = () => selectRemotePortfolio([offer],{ ...f.request.policy.portfolio,home: 'W0N1',tick: 20 });
  expect(run().bundles).toHaveLength(1); offer.commitment.energyPerTick++; expect(run).toThrow('charge'); offer.commitment.energyPerTick--;
  offer.reservation!.quote.economics.energyPerTick++; expect(run).toThrow('quote'); offer.reservation!.quote.economics.energyPerTick--;
  offer.quotes[0]!.assessment.policy.reservation.energyPerTick = 1; expect(run).toThrow(); offer.quotes[0]!.assessment.policy.reservation.energyPerTick = 0;
  offer.reservation!.quote.controller.position.room = 'W0N2'; expect(run).toThrow('quote'); offer.reservation!.quote.controller.position.room = 'E0N1';
  expect(selectRemotePortfolio([offer],{ ...f.request.policy.portfolio,home: 'W0N1',tick: 116,maximumAge: 100 }).bundles).toHaveLength(0);
});

test('an explicit priced reservation can be selected while the legacy global flag remains disabled',() => {
  const f = fixture(); f.request.policy.reserve = false;
  f.manager().advance(f.request,{ rooms: 1,sources: 2 },() => true);
  expect(f.assignments.owner('E0N1',20)!.plan.reserve).toEqual(f.quote.controller);
});
