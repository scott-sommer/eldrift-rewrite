import { assessRemoteEconomics } from '../../src/capabilities/economy/remote-economics';
import { expect, test } from 'vitest';
import { remoteMinerTiming, remoteHaulerTiming } from '../../src/capabilities/economy/remote-timing';
import { remoteFleetDemand } from '../../src/features/remotes/fleet/demand';
import { reconcileDemand } from '../../src/capabilities/spawning/demand';
import type { RemoteFleetProfile } from '../../src/features/remotes/fleet/model';
test('loaded return controls miner retirement while pricing includes scheduling overlap and native admission',() => {
  const timing = remoteMinerTiming({ body: ['work','carry','move'],lifetime: 1500,travelTicks: 10,returnTicks: 40,replacementMargin: 5 });
  expect(timing).toEqual({ travelTicks: 10,retireTicks: 45,marginTicks: 5,serviceTicks: 1445,replacementTicks: 1439 });
  const actor: RemoteFleetProfile = { home: 'W0N1',room: 'E0N1',source: 'source',kind: 'miner',owner: 'timing',generation: 1,
    body: ['work','carry','move'],desired: 1,priority: 20,...timing };
  const plan = remoteFleetDemand(actor,1,100), lead = actor.body.length*3+plan.travelTicks+plan.marginTicks;
  const unit = { name: 'old',owner: actor.owner,room: actor.home,spawning: false,ticksToLive: lead };
  expect(reconcileDemand(plan,[unit],[],1).missing).toBe(1);
  expect(1500-lead+actor.body.length*3-1).toBe(timing.replacementTicks);
});
test('couriers retain a full-trip retirement reserve and conservative fractional travel rounding',() => {
  const timing = remoteHaulerTiming({ body: ['carry','move'],lifetime: 1500,outboundTicks: 10.2,returnTicks: 30.4,serviceTicks: 2,replacementMargin: 5 });
  expect(timing).toEqual({ travelTicks: 11,retireTicks: 48,marginTicks: 5,serviceTicks: 1441,replacementTicks: 1435 });
});

test('an immobile miner cannot price a positive loaded return as viable service',() => {
  expect(assessRemoteEconomics({ capacity: 1500,regenerationTicks: 300,harvestPower: 2,
    miner: { body: ['work','carry'],lifetime: 1500,travelTicks: 0,returnTicks: 10 },
    hauler: { body: ['carry','move'],lifetime: 1500,outboundTicks: 1,returnTicks: 1,serviceTicks: 2 },
    reservation: { energyPerTick: 0,spawnLoad: 0,shares: 1 },infrastructurePerTick: 0,riskPerTick: 0,
    limits: { maximumHaulers: 10,maximumSpawnLoad: 1,minimumNetYield: 0 } })).toMatchObject({ status: 'infeasible',reason: 'miner-service' });
});
