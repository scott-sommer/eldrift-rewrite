import { expect, test } from 'vitest';
import { assessRemoteEconomics } from '../../src/capabilities/economy/remote-economics';
import type { RemoteEconomicsInput, RemoteEconomics } from '../../src/capabilities/economy/remote-model';
function input(): RemoteEconomicsInput {
  return { capacity: 3000, regenerationTicks: 300, harvestPower: 2,
    miner: { body: ['work','work','work','work','work','move','move','move'], lifetime: 1500, travelTicks: 25,returnTicks: 25 },
    hauler: { body: ['carry','carry','move'], lifetime: 1500, outboundTicks: 25, returnTicks: 50, serviceTicks: 2 },
    reservation: { energyPerTick: 2, spawnLoad: 0.1, shares: 2 }, infrastructurePerTick: 0.1, riskPerTick: 0.2,
    limits: { maximumHaulers: 20, maximumSpawnLoad: 1, minimumNetYield: 0.1 } };
}
function evaluated(value: RemoteEconomicsInput): RemoteEconomics {
  const result = assessRemoteEconomics(value);
  if (result.status !== 'evaluated') throw new Error(result.reason);
  return result;
}
test('explicit per-source costs, loaded/empty transport and reservation allocation produce auditable net yield', () => {
  const value = input(), before = structuredClone(value), result = evaluated(value);
  expect(result).toMatchObject({ sourceRate: 10, harvestRate: 10, deliveredRate: 10, tripTicks: 77,
    requiredHaulers: 8, haulers: 8, reservationShares: 2, accepted: true });
  expect(result.energy.mining).toBeCloseTo(650 / 1449);
  expect(result.energy.hauling).toBeCloseTo(8 * 150 / 1397);
  expect(result.energy.reservation).toBe(1); expect(result.spawn.reservation).toBe(0.05);
  expect(result.spawn.mining).toBeCloseTo(24 / 1449); expect(result.spawn.hauling).toBeCloseTo(72 / 1397);
  expect(result.netRate).toBeCloseTo(10 - 650 / 1449 - 1200 / 1397 - 1 - 0.1 - 0.2);
  expect(value).toEqual(before);
});
test('distant routes cost more and transport caps reduce delivered output instead of assuming all harvested energy arrives', () => {
  const near = input(), far = input();
  far.miner.travelTicks = 200; far.miner.returnTicks = 300; far.hauler.outboundTicks = 200; far.hauler.returnTicks = 400;
  const first = evaluated(near), second = evaluated(far);
  expect(second.energy.hauling).toBeGreaterThan(first.energy.hauling); expect(second.netRate).toBeLessThan(first.netRate);
  near.limits.maximumHaulers = 1;
  const capped = evaluated(near);
  expect(capped.requiredHaulers).toBe(8); expect(capped.haulers).toBe(1);
  expect(capped.deliveredRate).toBeCloseTo(100 / 77); expect(capped.accepted).toBe(false);
  expect(capped.rejected).toContain('net-yield');
});
test('source regeneration and miner output are independent limits; reservation is charged once across a committed bundle', () => {
  const value = input(); value.capacity = 1500;
  expect(evaluated(value).harvestRate).toBe(5);
  value.miner.body = ['work','move']; expect(evaluated(value).harvestRate).toBe(2);
  const one = evaluated(value), two = evaluated(value);
  expect(one.energy.reservation + two.energy.reservation).toBe(value.reservation.energyPerTick);
  value.reservation.shares = 1; expect(evaluated(value).energy.reservation).toBe(2);
});
test('spawn capacity, break-even policy and zero transport budget remain explicit rejection decisions', () => {
  const value = input(); value.limits.maximumSpawnLoad = 0;
  expect(evaluated(value).rejected).toContain('spawn-load');
  value.limits.maximumHaulers = 0;
  expect(evaluated(value)).toMatchObject({ deliveredRate: 0, haulers: 0, accepted: false });
  value.limits.minimumNetYield = 0;
  expect(evaluated(value).netRate).toBeLessThan(0);
});
test.each(['miner','hauler'] as const)('travel consuming the entire %s lifetime is infeasible, never a zero-cost remote', role => {
  const value = input();
  if (role === 'miner') value.miner.travelTicks = 1500; else value.hauler.outboundTicks = 1500;
  expect(assessRemoteEconomics(value)).toEqual({ status: 'infeasible', reason: `${role}-service` });
});
test('immobile travel, no WORK and no CARRY cannot produce a profitable score', () => {
  const value = input(); value.miner.body = ['work'];
  expect(assessRemoteEconomics(value)).toMatchObject({ status: 'infeasible', reason: 'miner-service' });
  value.miner.body = ['move']; expect(assessRemoteEconomics(value)).toMatchObject({ reason: 'no-harvest' });
  value.miner.body = ['work','move']; value.hauler.body = ['move'];
  expect(assessRemoteEconomics(value)).toMatchObject({ reason: 'no-carry' });
});
test('malformed policy and non-finite arithmetic fail instead of certifying candidates', () => {
  const value = input(); value.reservation.shares = 0;
  expect(() => assessRemoteEconomics(value)).toThrow('allocation');
  value.reservation.shares = 1; value.hauler.serviceTicks = 0;
  expect(() => assessRemoteEconomics(value)).toThrow('duration');
  value.hauler.serviceTicks = 2; value.riskPerTick = -1;
  expect(() => assessRemoteEconomics(value)).toThrow('rate');
  value.riskPerTick = 1e308; value.infrastructurePerTick = 1e308;
  expect(() => assessRemoteEconomics(value)).toThrow('Non-finite');
});

test('replacement handoff margin increases ongoing body and spawn cost without subtracting spawn time twice', () => {
  const value = input(), original = evaluated(value);
  value.miner.replacementMargin = 25; value.hauler.replacementMargin = 25;
  const result = evaluated(value);
  expect(result.energy.mining).toBeCloseTo(650 / 1399);
  expect(result.energy.hauling).toBeCloseTo(1200 / 1347);
  expect(result.spawn.mining).toBeCloseTo(24 / 1399);
  expect(result.netRate).toBeLessThan(original.netRate);
  value.miner.replacementMargin = 1475;
  expect(assessRemoteEconomics(value)).toMatchObject({ status: 'infeasible',reason: 'miner-service' });
  value.miner.replacementMargin = -1;
  expect(() => assessRemoteEconomics(value)).toThrow('margin');
});

test('a hauler must finish a loaded delivery within its lifetime and handoff margin', () => {
  const value = input(); value.hauler.outboundTicks = 25; value.hauler.returnTicks = 1474;
  expect(assessRemoteEconomics(value)).toMatchObject({ status: 'infeasible',reason: 'hauler-service' });
  value.hauler.replacementMargin = 25; value.hauler.returnTicks = 711;
  expect(assessRemoteEconomics(value)).toMatchObject({ status: 'infeasible',reason: 'hauler-service' });
  value.hauler.returnTicks = 710;
  expect(assessRemoteEconomics(value).status).toBe('evaluated');
  value.hauler.body = ['carry']; value.hauler.outboundTicks = 0; value.hauler.returnTicks = 1;
  expect(assessRemoteEconomics(value)).toMatchObject({ status: 'infeasible',reason: 'hauler-service' });
});
