import { bodyPlan } from '../../../capabilities/spawning/body';
import type { RemoteEconomicPolicy } from '../../../features/remotes/assessment-model';
/** Maximum spawn capacity, not momentary stored energy, bounds buildable forecasts. */
export function remoteBodiesWithinBudget(policy: Pick<RemoteEconomicPolicy, 'miner' | 'hauler'>, capacity: number): boolean {
  if (!Number.isSafeInteger(capacity) || capacity < 0) throw new Error('Invalid remote home energy capacity');
  return [policy.miner,policy.hauler].every(body => {
    return bodyPlan(body.body,capacity) !== undefined;
  });
}
