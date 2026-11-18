import { expect, test } from 'vitest';
import { selectRemotePortfolio } from '../../src/features/remotes/portfolio';
import { priceRemoteBundle } from '../../src/features/remotes/portfolio-pricing';
import { portfolioPolicy, remoteOffer } from '../fixtures/remote-portfolio';

test('complete room quotes are recomputed and charge exactly one room reservation', () => {
  const room = remoteOffer(), policy = portfolioPolicy(), before = JSON.stringify(room);
  const result = selectRemotePortfolio([room],policy), bundle = result.bundles[0]!;
  expect(bundle.complete).toBe(true); expect(result.slots).toBe(2);
  expect(bundle.sources.map(source => source.economics.reservationShares)).toEqual([2,2]);
  expect(bundle.sources.reduce((sum,source) => sum + source.economics.energy.reservation,0)).toBe(1);
  expect(bundle.sources.reduce((sum,source) => sum + source.economics.spawn.reservation,0)).toBe(0.01);
  expect(bundle.rank).toBeCloseTo(bundle.netRate * 1.15);
  bundle.sources[0]!.economics.energy.reservation = 100;
  expect(JSON.stringify(room)).toBe(before);
});

test('a capacity-limited fragment pays all reservation expense rather than the quoted shares', () => {
  const room = remoteOffer(), result = selectRemotePortfolio([room],portfolioPolicy({ maximumSlots: 1 }));
  const source = result.bundles[0]!.sources[0]!;
  expect(result.bundles[0]!.complete).toBe(false);
  expect(source.source).toBe(room.sourceIds[0]);
  expect(source.economics.energy.reservation).toBe(1);
  expect(source.economics.spawn.reservation).toBe(0.01);
});

test('an affordable full room can be profitable when no single source can carry its room overhead', () => {
  const room = remoteOffer(); room.quotes.forEach(quote => { quote.policy.reservation.energyPerTick = 6; });
  expect(selectRemotePortfolio([room],portfolioPolicy()).bundles).toHaveLength(1);
  expect(selectRemotePortfolio([room],portfolioPolicy({ maximumSlots: 1 })).bundles).toHaveLength(0);
});

test('global hauler and spawn budgets are charged across rooms, not just per quote', () => {
  const a = remoteOffer(), b = remoteOffer('E0N2',[25]);
  const both = selectRemotePortfolio([a,b],portfolioPolicy());
  expect(both.bundles).toHaveLength(2);
  const first = both.bundles[0]!;
  const hauling = selectRemotePortfolio([a,b],portfolioPolicy({ maximumHaulers: first.haulers }));
  expect(hauling.bundles.map(bundle => bundle.room)).toEqual([a.room]);
  const spawn = selectRemotePortfolio([a,b],portfolioPolicy({ maximumSpawnLoad: first.spawnLoad }));
  expect(spawn.bundles.map(bundle => bundle.room)).toEqual([a.room]);
});

test('configurable order trades nearest complete room against net yield deterministically', () => {
  const a = remoteOffer('E0N1',[10]), b = remoteOffer('E0N2',[30]);
  a.quotes[0]!.policy.riskPerTick = 2;
  expect(selectRemotePortfolio([b,a],portfolioPolicy({ maximumSlots: 1 })).bundles[0]!.room).toBe(a.room);
  expect(selectRemotePortfolio([a,b],portfolioPolicy({ maximumSlots: 1,order: 'net-yield' })).bundles[0]!.room).toBe(b.room);
});

test('missing assessments retain inventory incompleteness and atomic commitments cannot fragment', () => {
  const room = remoteOffer(); room.quotes.pop();
  expect(selectRemotePortfolio([room],portfolioPolicy()).bundles[0]!.complete).toBe(false);
  room.commitment.atomic = true;
  expect(selectRemotePortfolio([room],portfolioPolicy()).bundles).toEqual([]);
});

test('atomic room overhead consumes real capacity, energy and spawn load', () => {
  const room = remoteOffer(); room.commitment = { atomic: true,slots: 1,energyPerTick: 0.75,spawnLoad: 0.2 };
  const policy = portfolioPolicy(), result = selectRemotePortfolio([room],policy);
  expect(result.slots).toBe(3);
  expect(selectRemotePortfolio([room],portfolioPolicy({ maximumSlots: 2 })).bundles).toEqual([]);
  const baseline = priceRemoteBundle({ ...room,commitment: { ...room.commitment,energyPerTick: 0,spawnLoad: 0 } },room.quotes,policy)!;
  expect(result.netRate).toBeCloseTo(baseline.netRate - 0.75);
  expect(result.spawnLoad).toBeCloseTo(baseline.spawnLoad + 0.2);
});

test('stale quotes and expired or foreign reservations cannot enter the portfolio', () => {
  const room = remoteOffer();
  room.quotes[0]!.assessment.observedAt = 9;
  room.quotes[1]!.assessment.reservation = { state: 'ours',username: 'bot',remainingTicks: 5,observedAt: 15 };
  expect(selectRemotePortfolio([room],portfolioPolicy()).bundles).toEqual([]);
  room.quotes[0]!.assessment.observedAt = 15;
  room.quotes[0]!.assessment.reservation.state = 'foreign';
  expect(selectRemotePortfolio([room],portfolioPolicy()).bundles).toEqual([]);
});

test('duplicate identities, conflicting reservation charges and wrong-home quotes fail before selection', () => {
  const room = remoteOffer(), policy = portfolioPolicy();
  expect(() => selectRemotePortfolio([room,room],policy)).toThrow('Duplicate remote room');
  room.quotes[1]!.policy.reservation.energyPerTick = 2;
  expect(() => selectRemotePortfolio([room],policy)).toThrow('Inconsistent room reservation');
  room.quotes[1]!.policy.reservation.energyPerTick = 1;
  room.quotes[0]!.assessment.home = 'W1N1';
  expect(() => selectRemotePortfolio([room],policy)).toThrow('ownership mismatch');
});

test('invalid routes, future observations, nonfinite limits and oversized inputs are refused', () => {
  const room = remoteOffer(), policy = portfolioPolicy();
  room.quotes[0]!.assessment.travel.rooms = ['W0N1','E0N2','E0N1'];
  expect(() => selectRemotePortfolio([room],policy)).toThrow('route crossing');
  room.quotes[0]!.assessment.travel.rooms = ['W0N1','E0N1'];
  room.quotes[0]!.assessment.observedAt = 21;
  expect(() => selectRemotePortfolio([room],policy)).toThrow('quote clock');
  expect(() => selectRemotePortfolio([], { ...policy,maximumSpawnLoad: NaN })).toThrow('rates');
  expect(() => selectRemotePortfolio(Array(65).fill(room),policy)).toThrow('input limit');
});

test('fragment ordering follows the selected strategy and input order cannot change ties', () => {
  const a = remoteOffer('E0N1',[10,20]), b = remoteOffer('E0N2',[30,40]);
  a.quotes.forEach(quote => { quote.policy.riskPerTick = 2; });
  const nearest = portfolioPolicy({ maximumSlots: 1 }), net = { ...nearest,order: 'net-yield' as const };
  expect(selectRemotePortfolio([b,a],nearest).bundles[0]!.room).toBe(a.room);
  expect(selectRemotePortfolio([a,b],net).bundles[0]!.room).toBe(b.room);
  expect(selectRemotePortfolio([b,a],net)).toEqual(selectRemotePortfolio([a,b],net));
});

test('admitting another fragment reprices every source and charges room overhead only once', () => {
  const room = remoteOffer(); room.sourceIds.push('missing-third-source');
  const result = selectRemotePortfolio([room],portfolioPolicy({ maximumSlots: 2 }));
  const selected = result.bundles[0]!;
  expect(selected.complete).toBe(false); expect(selected.sources).toHaveLength(2);
  expect(selected.sources.map(source => source.economics.reservationShares)).toEqual([2,2]);
  expect(selected.sources.reduce((sum,source) => sum + source.economics.energy.reservation,0)).toBe(1);
});

test('zero capacity and net budget refuse selection, and bundle ranking cannot overflow', () => {
  const room = remoteOffer();
  expect(selectRemotePortfolio([room],portfolioPolicy({ maximumSlots: 0 })).bundles).toEqual([]);
  expect(selectRemotePortfolio([room],portfolioPolicy({ minimumNetYield: 100 })).bundles).toEqual([]);
  expect(() => selectRemotePortfolio([room],portfolioPolicy({ completionBonus: Number.MAX_VALUE }))).toThrow('overflow');
});

test('the home net threshold applies after accumulation, not to each room independently', () => {
  const a = remoteOffer('E0N1',[10]), b = remoteOffer('E0N2',[30]), policy = portfolioPolicy();
  const first = selectRemotePortfolio([a],policy).netRate, second = selectRemotePortfolio([b],policy).netRate;
  const threshold = Math.max(first,second) + 0.1;
  const result = selectRemotePortfolio([a,b],{ ...policy,minimumNetYield: threshold });
  expect(result.bundles).toHaveLength(2);
  expect(result.netRate).toBeCloseTo(first + second);
});
