import { expect, test } from 'vitest';
import { fleetServicePlan, fleetServiceOptions } from '../../../src/app/remotes/fleet/service-policy';
import { startupTravelPlan } from '../../fixtures/startup-travel';
import type { RemoteFleetProfile } from '../../../src/features/remotes/fleet/model';
function fixture() {
  const plan = startupTravelPlan(), profile: RemoteFleetProfile = { home: plan.home,room: plan.room,source: plan.source,kind: 'courier',owner: 'owner',generation: 1,body: [...plan.courier],desired: 1,travelTicks: 10,marginTicks: 5,retireTicks: 20,priority: 0 };
  return { plan,profile };
}
test('selected geometry is detached, matches the current cohort body and leaves ordinary strategy explicit',() => {
  const { plan,profile } = fixture(); expect(fleetServicePlan(profile,undefined)).toBeUndefined(); expect(fleetServicePlan(profile,null)).toBeNull();
  const selected = fleetServicePlan(profile,plan)!; selected.collection.x = 1; expect(plan.collection.x).toBe(4);
  expect(fleetServiceOptions(plan)).toMatchObject({ mining: { station: plan.station },transport: { service: { collection: plan.collection,endpoint: plan.endpoint.id,deposit: plan.endpoint.deposit } } });
});
test('changed body/source/home or invalid service adjacency refuses without ordinary fallback',() => {
  const { plan,profile } = fixture();
  expect(fleetServicePlan({ ...profile,source: 'other' },plan)).toBeNull();
  expect(fleetServicePlan({ ...profile,home: 'W1N1' },plan)).toBeNull();
  expect(fleetServicePlan({ ...profile,body: ['carry','move'] },plan)).toBeNull();
  plan.collection.x = 1; expect(fleetServicePlan(profile,plan)).toBeNull();
});
