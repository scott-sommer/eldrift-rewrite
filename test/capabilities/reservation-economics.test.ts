import { plannedMobility } from '../../src/adapters/screeps/travel-estimate';
import { expect, test } from 'vitest';
import { assessReservationEconomics } from '../../src/capabilities/economy/reservation-economics';
import { bufferedReserver } from '../../src/capabilities/spawning/reservation-recipes';
import { selectBufferedReservation } from '../../src/features/remotes/reservation/body-policy';
const policy = { lifetime: 600,outboundTicks: 25,returnTicks: 25,replacementMargin: 25,reservePerClaim: 1,decayPerTick: 1,maximumReservation: 5000,minimumBufferTicks: 100 };
test('balanced buffered bodies price actual service and replacement interval with an explicit recovery reserve',() => {
  const body = bufferedReserver(1300,2)!; const result = assessReservationEconomics({ ...policy,body: body.parts });
  expect(result).toMatchObject({ status: 'evaluated',claims: 2,cost: 1300,spawnTicks: 12,netReservePerTick: 1,usefulBufferTicks: 525,requiredBufferTicks: 162,
    timing: { travelTicks: 25,retireTicks: 50,serviceTicks: 525,replacementTicks: 499 } });
  if (result.status === 'evaluated') { expect(result.energyPerTick).toBeCloseTo(1300/499); expect(result.spawnLoad).toBeCloseTo(12/499); }
});
test('single-CLAIM, unaffordable, immobile and lifetime-exhausted service cannot become buffered population',() => {
  expect(bufferedReserver(1299,2)).toBeUndefined(); expect(() => bufferedReserver(1300,1)).toThrow();
  expect(assessReservationEconomics({ ...policy,body: ['claim','move'] })).toEqual({ status: 'infeasible',reason: 'buffer' });
  expect(assessReservationEconomics({ ...policy,body: ['claim','claim'] })).toEqual({ status: 'infeasible',reason: 'immobile' });
  expect(assessReservationEconomics({ ...policy,body: ['claim','claim','move','move'],outboundTicks: 400,returnTicks: 200 })).toEqual({ status: 'infeasible',reason: 'service' });
});
test('body selection increases CLAIM only when controller distance requires a larger recovery buffer',() => {
  expect(selectBufferedReservation(5200,policy)?.economics.claims).toBe(2);
  const distant = { ...policy,outboundTicks: 200,returnTicks: 200 };
  expect(selectBufferedReservation(1300,distant)).toBeUndefined(); expect(selectBufferedReservation(1950,distant)?.economics.claims).toBe(3);
});
test('controller cap and invalid inputs cannot produce a usable fictional buffer',() => {
  expect(selectBufferedReservation(1300,{ ...policy,maximumReservation: 100 })).toBeUndefined();
  expect(() => assessReservationEconomics({ ...policy,body: ['claim','move'],outboundTicks: NaN })).toThrow();
});

test.each([3,4,8])('balanced %i-CLAIM bodies have the same unloaded mobility class as the measured two-pair body',claims => {
  const profile = { mobile: true,roadCost: 1,plainCost: 1,swampCost: 5 };
  expect(plannedMobility(bufferedReserver(1300,2)!.parts,0)).toMatchObject(profile);
  expect(plannedMobility(bufferedReserver(5200,claims)!.parts,0)).toMatchObject(profile);
});
