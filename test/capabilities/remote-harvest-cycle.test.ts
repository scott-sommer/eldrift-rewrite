import { expect, test } from 'vitest';
import { harvestCycleRate } from '../../src/capabilities/mining/harvest-cycle';
import { minerStep } from '../../src/capabilities/mining/step';
import { assessRemoteEconomics } from '../../src/capabilities/economy/remote-economics';
/** Exercise the station state machine with finite CARRY and separate native-style harvest/transfer effects. */
function runStation(power: number, capacity: number, ticks: number): number {
  let cargo = 0, delivered = 0;
  const issued = () => ({ status: 'issued' as const,code: 0 });
  for (let tick=0; tick<ticks; tick++) minerStep({ tick,spawning: false,unsafe: false,target: 'visible',assigned: true,
    atStation: true,carried: cargo,energy: cargo,freeCapacity: capacity-cargo,carryCapacity: capacity,establish: false,repair: false },{
    approach: () => { throw new Error('Unexpected travel'); },retreat: () => { throw new Error('Unexpected retreat'); },
    establish: () => { throw new Error('Unexpected build'); },repair: () => { throw new Error('Unexpected repair'); },
    rejected: () => { throw new Error('Unexpected rejection'); },
    handoff: () => { delivered += cargo; cargo = 0; return issued(); },
    harvest: () => { if (capacity === 0) delivered += power; else cargo += Math.min(power,capacity-cargo); return issued(); },
  });
  return delivered;
}
test.each([[8,50,160],[2,50,260],[8,100,140],[8,0,100],[100,50,100]])(
  'forecast matches actual station harvest/handoff decisions for power %i, CARRY %i', (power,capacity,ticks) => {
    expect(runStation(power,capacity,ticks)/ticks).toBeCloseTo(harvestCycleRate(power,capacity));
  });
test('handoff limits required transport and prevents false break-even acceptance',() => {
  const result = assessRemoteEconomics({ capacity: 3000,regenerationTicks: 300,harvestPower: 2,
    miner: { body: ['work','work','work','work','carry','move'],lifetime: 1500,travelTicks: 25,returnTicks: 25 },
    hauler: { body: ['carry','carry','move'],lifetime: 1500,outboundTicks: 10,returnTicks: 10,serviceTicks: 2 },
    reservation: { energyPerTick: 0,spawnLoad: 0,shares: 1 },infrastructurePerTick: 0,riskPerTick: 0,
    limits: { maximumHaulers: 20,maximumSpawnLoad: 1,minimumNetYield: 6 } });
  expect(result).toMatchObject({ status: 'evaluated',harvestRate: 6.25,requiredHaulers: 2,accepted: false,rejected: ['net-yield'] });
});
test('invalid cycle arithmetic cannot certify production',() => {
  expect(() => harvestCycleRate(0,50)).toThrow();
  expect(() => harvestCycleRate(8,-1)).toThrow();
  expect(() => harvestCycleRate(Infinity,50)).toThrow();
});
