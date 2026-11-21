import { startupTravelPlan } from './startup-travel';
import type { HouseholdTravelPlan } from '../../src/capabilities/economy/startup/household/travel';
export function householdTravelPlan(): HouseholdTravelPlan {
  const plan = startupTravelPlan();
  return { home: plan.home,body: [...plan.courier],spawn: { ...plan.spawn },source: { id: plan.endpoint.id,position: plan.endpoint.position,pickup: plan.endpoint.deposit },
    destination: { id: plan.spawn.id,position: plan.spawn.position,deposit: plan.spawn.exit } };
}
