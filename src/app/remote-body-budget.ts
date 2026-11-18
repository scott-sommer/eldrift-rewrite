import { operatingBody } from '../capabilities/economy/remote-body';
import type { RemoteEconomicPolicy } from '../features/remotes/assessment-model';
/** Maximum spawn capacity, not momentary stored energy, bounds buildable forecasts. */
export function remoteBodiesWithinBudget(policy: Pick<RemoteEconomicPolicy, 'miner' | 'hauler'>, capacity: number): boolean {
  if (!Number.isSafeInteger(capacity) || capacity < 0) throw new Error('Invalid remote home energy capacity');
  return [policy.miner,policy.hauler].every(body => {
    const profile = operatingBody({ body: body.body,lifetime: body.lifetime,travelTicks: 0 });
    return profile !== undefined && profile.cost <= capacity;
  });
}
