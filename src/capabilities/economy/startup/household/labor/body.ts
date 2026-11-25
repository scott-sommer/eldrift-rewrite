import { spawnedActiveTicks } from '../../../../spawning/lifetime';
import type { BodyPart } from '../../../../spawning/body';
import type { HouseholdLaborJob } from './model';
/** Intact unboosted body capacities shared by forecasting and workload quoting. */
export function laborBody(body: readonly BodyPart[], kind: HouseholdLaborJob['kind']) {
  const life = spawnedActiveTicks(body), work = body.filter(part => part === 'work').length;
  return { life,capacity: body.filter(part => part === 'carry').length*50,rate: work*(kind === 'build' ? 5 : 1),mobile: body.includes('move') };
}
