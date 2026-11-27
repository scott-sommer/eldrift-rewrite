import type { StartupInitialCourier } from '../initial-model';
import type { TransitPlan } from '../../../movement/transit/model';
import type { StartupCourierRoutes } from './model';
import { createTransitPlan } from '../../../movement/transit/plan';
import { withinRange } from '../../../movement/path-model';
import type { StartupDeliveryInput } from '../delivery-model';
import type { StartupProjectCourierOpening } from './project-model';
export function prepareCourierOpenings(input: StartupDeliveryInput): readonly StartupProjectCourierOpening[] | undefined {
  const openings = input.motion!.openings,workers = input.initial?.couriers ?? [];
  if ((openings?.length ?? 0) !== workers.length) throw new Error('Physical incumbent opening roster');
  if (!openings) return undefined;
  if (new Set(openings.map(opening => opening.request)).size !== openings.length) throw new Error('Duplicate physical incumbent opening');
  return openings.map(opening => prepareOpening(input,opening));
}
function prepareOpening(input: StartupDeliveryInput,opening: StartupProjectCourierOpening): StartupProjectCourierOpening {
  const worker = input.initial!.couriers.find(worker => worker.id === opening.request),route = input.motion!.routes.find(route => route.request === opening.request);
  if (!worker || !route || typeof opening.owner !== 'string' || !opening.owner) throw new Error('Unknown physical incumbent opening');
  validateTiming(worker,opening);
  const plan = createTransitPlan(opening.plan);
  validateDestination(worker,route,plan);
  validateIdentity(worker,opening,plan);
  return { ...opening,plan };
}
export function physicalCourierIdentity(input: StartupDeliveryInput,request: string) {
  const future = input.project.spawning.requests.find(worker => worker.id === request);
  if (future && input.couriers.some(worker => worker.request === request)) return future;
  const worker = input.initial?.couriers.find(worker => worker.id === request),opening = input.motion!.openings?.find(opening => opening.request === request);
  if (!worker || !opening) throw new Error('Unknown physical courier');
  return { id: worker.id,name: worker.id,owner: opening.owner,body: worker.body };
}

function validateTiming(worker: StartupInitialCourier,opening: StartupProjectCourierOpening): void {
  if (worker.mode !== 'courier') throw new Error('Physical return-only opening requires retirement motion');
  if (worker.remainingSpawnTicks > 0 && opening.fatigue !== 0) throw new Error('Incubating courier cannot have fatigue');
  if (opening.readyAt !== worker.availableAt || !Number.isSafeInteger(opening.fatigue) || opening.fatigue < 0) throw new Error('Invalid physical incumbent timing');
}
function validateDestination(worker: StartupInitialCourier,route: Omit<StartupCourierRoutes,'activeAt' | 'opening'>,plan: TransitPlan): void {
  const target = worker.phase === 'deliver' ? route.empty.origin : route.loaded.origin;
  if (!withinRange(plan.path.at(-1) ?? plan.origin,target,0)) throw new Error('Physical incumbent opening destination');
}
function validateIdentity(worker: StartupInitialCourier,opening: StartupProjectCourierOpening,plan: TransitPlan): void {
  if (plan.unit !== worker.id || (plan.order ?? plan.unit) !== worker.id || plan.owner !== opening.owner) throw new Error('Physical incumbent opening identity');
  if (plan.recovery !== worker.body.filter(part => part === 'move').length*2) throw new Error('Physical incumbent opening body');
}
