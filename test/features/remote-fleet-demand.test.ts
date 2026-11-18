import { expect, test } from 'vitest';
import { remoteFleetDemand } from '../../src/features/remotes/fleet/demand';
import { reconcileDemand } from '../../src/capabilities/spawning/demand';
import type { RemoteFleetProfile } from '../../src/features/remotes/fleet/model';
function profile(kind: 'miner' | 'courier'): RemoteFleetProfile {
  return { owner: 'remote-owner',home: 'W0N1',room: 'E0N1',source: 'source',kind,generation: 1,
    body: ['work','carry','move'],desired: 1,travelTicks: 20,marginTicks: 10,retireTicks: kind === 'miner' ? 30 : 55,priority: 20 };
}
test.each(['miner','courier'] as const)('%s recruitment leaves time to arrive before old service retires',kind => {
  const actor = profile(kind), plan = remoteFleetDemand(actor,1,100), tick = 100;
  const threshold = actor.retireTicks+actor.body.length*3+actor.travelTicks+actor.marginTicks;
  const unit = { name: 'old',owner: actor.owner,room: actor.home,spawning: false,ticksToLive: threshold+1 };
  expect(reconcileDemand(plan,[unit],[],tick).missing).toBe(0);
  unit.ticksToLive--;
  expect(reconcileDemand(plan,[unit],[],tick).missing).toBe(1);
  const retirementTick = tick+unit.ticksToLive-actor.retireTicks;
  const arrivalTick = tick+actor.body.length*3+actor.travelTicks;
  expect(arrivalTick+actor.marginTicks).toBe(retirementTick);
  // The prior lead would start after the protected handoff window had already closed.
  const previousStart = tick+actor.retireTicks;
  expect(previousStart+actor.body.length*3+actor.travelTicks).toBeGreaterThan(retirementTick);
});
test('an overlapping spawning successor suppresses extra recruits while the retiring actor remains alive',() => {
  const actor = profile('miner'), plan = remoteFleetDemand(actor,1,100);
  const old = { name: 'old',owner: actor.owner,room: actor.home,spawning: false,ticksToLive: actor.retireTicks+1 };
  const successor = { ...old,name: 'new',spawning: true,ticksToLive: 1500 };
  expect(reconcileDemand(plan,[old,successor],[],100)).toMatchObject({ effective: 1,missing: 0,cancel: [] });
  successor.spawning = false;
  expect(reconcileDemand(plan,[old,successor],[],101).missing).toBe(0);
});
