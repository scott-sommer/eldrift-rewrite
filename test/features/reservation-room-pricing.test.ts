import { expect, test } from 'vitest';
import { remoteOffer, portfolioPolicy } from '../fixtures/remote-portfolio';
import { selectRemotePortfolio } from '../../src/features/remotes/portfolio';
import { selectBufferedReservation } from '../../src/features/remotes/reservation/body-policy';
test('one controller commitment prices a two-source room once without changing observed source stock/capacity',() => {
  const offer = remoteOffer();
  for (const quote of offer.quotes) quote.assessment.policy.reservation = { energyPerTick: 0,spawnLoad: 0,shares: 1 };
  const original = structuredClone(offer), policy = portfolioPolicy({ maximumSlots: 10 });
  const baseline = selectRemotePortfolio([offer],policy);
  const reserve = selectBufferedReservation(1300,{ lifetime: 600,outboundTicks: 25,returnTicks: 25,replacementMargin: 25,reservePerClaim: 1,decayPerTick: 1,maximumReservation: 5000,minimumBufferTicks: 100 })!;
  const selected = selectRemotePortfolio([{ ...offer,commitment: reserve.commitment }],policy);
  expect(selected.bundles[0]!.sources).toHaveLength(2); expect(selected.netRate).toBeCloseTo(baseline.netRate-reserve.economics.energyPerTick);
  expect(selected.spawnLoad).toBeCloseTo(baseline.spawnLoad+reserve.economics.spawnLoad); expect(selected.slots).toBe(baseline.slots+1);
  expect(offer).toEqual(original); expect(offer.quotes.every(quote => quote.assessment.sourceFacts.capacity === 1500)).toBe(true);
});
