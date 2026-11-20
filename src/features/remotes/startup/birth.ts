import { copySpawnRequest, sameSpawnPlacement } from '../../../capabilities/spawning/placement';
import { validateRequest } from '../../../capabilities/spawning/allocate';
import type { SpawnRequest } from '../../../capabilities/spawning/request';
import type { StartupTravelPlan } from './travel-model';
import { startupTravelLegs } from './travel-plan';
/** Bind geometry/body only; current feature authority and funding still govern final dispatch. */
export function bindStartupBirth(request: SpawnRequest, plan: StartupTravelPlan, kind: 'miner' | 'courier'): SpawnRequest {
  validateRequest(request); startupTravelLegs(plan);
  if (request.room !== plan.home || JSON.stringify(request.body) !== JSON.stringify(plan[kind])) throw new Error('Startup birth quote mismatch');
  const placement = { spawn: plan.spawn.id,exit: { ...plan.spawn.exit } };
  if (request.placement && !sameSpawnPlacement(request.placement,placement)) throw new Error('Startup birth already bound');
  return copySpawnRequest({ ...request,placement });
}
