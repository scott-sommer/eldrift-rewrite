import { expect, test } from 'vitest';
import { selectRemotePortfolio } from '../../src/features/remotes/portfolio';
import { portfolioPolicy, remoteOffer } from '../fixtures/remote-portfolio';
test('room commitments consume workforce slots without consuming supported source capacity',() => {
  const room = remoteOffer(); room.commitment = { atomic: true,slots: 1,energyPerTick: .75,spawnLoad: .2 };
  const policy = portfolioPolicy({ maximumSources: 2,maximumSlots: 3 });
  const result = selectRemotePortfolio([room],policy);
  expect(result.slots).toBe(3); expect(result.bundles[0]?.sources).toHaveLength(2);
  expect(selectRemotePortfolio([room],{ ...policy,maximumSources: 1 }).bundles).toEqual([]);
  expect(selectRemotePortfolio([room],{ ...policy,maximumSlots: 2 }).bundles).toEqual([]);
  expect(selectRemotePortfolio([room],{ ...policy,maximumUnits: 3 }).bundles).toEqual([]);
});
test('a non-atomic room can fragment within the source budget and still pays all overhead',() => {
  const room = remoteOffer(), policy = portfolioPolicy({ maximumSources: 1 });
  const result = selectRemotePortfolio([room],policy);
  expect(result.bundles[0]?.sources).toHaveLength(1);
  expect(result.bundles[0]?.sources[0]?.economics.energy.reservation).toBe(1);
  expect(selectRemotePortfolio([room],{ ...policy,maximumSources: 0 }).bundles).toEqual([]);
});
test('source admission is shared across rooms',() => {
  const result = selectRemotePortfolio([remoteOffer(),remoteOffer('E0N2',[30])],portfolioPolicy({ maximumSources: 2 }));
  expect(result.bundles.flatMap(bundle => bundle.sources)).toHaveLength(2);
});
test.each([-1,.5,129,NaN,Infinity])('invalid source cap %s is refused',(maximumSources) => {
  expect(() => selectRemotePortfolio([],portfolioPolicy({ maximumSources }))).toThrow('source budget');
});
