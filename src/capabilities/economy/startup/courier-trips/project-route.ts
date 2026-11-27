import type { StartupDeliveryInput } from '../delivery-model';
import type { StartupScheduledBirth } from '../spawn-model';
import type { StartupCourierRoutes } from './model';
import type { StartupProjectCourierOpening } from './project-model';
export function projectCourierRoute(input: StartupDeliveryInput,route: Omit<StartupCourierRoutes,'activeAt' | 'opening'>,openings: readonly StartupProjectCourierOpening[] | undefined,births: readonly StartupScheduledBirth[]): StartupCourierRoutes[] {
  const worker = input.initial?.couriers.find(worker => worker.id === route.request);
  if (worker) {
    const opening = openings!.find(opening => opening.request === worker.id)!;
    return [{ ...route,activeAt: worker.remainingSpawnTicks,opening: { plan: opening.plan,phase: worker.phase,cargo: worker.energy,readyAt: opening.readyAt,fatigue: opening.fatigue } }];
  }
  const birth = births.find(birth => birth.request === route.request);
  return birth ? [{ ...route,activeAt: birth.activeAt }] : [];
}
