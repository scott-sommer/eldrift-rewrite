import { copyPlain } from '../../../../../core/plain-data';
import { paidRouteContextMatches } from '../../route-control/program';
import type { PaidCourierActiveRoute } from '../../../../../features/remotes/startup/routes/model';
import type { HomeHaulingInput,HomeHaulingFrame } from './model';
export function homeWorldInput(input: HomeHaulingInput): HomeHaulingInput {
  return copyPlain({ home: input.home,observedAt: input.observedAt,endpoint: input.endpoint,inventories: input.inventories,bodies: input.bodies,workers: input.workers,
    ...(input.control ? { control: input.control } : {}),...(input.ecology ? { ecology: input.ecology } : {}),sources: input.sources.map(({ plan,demand,miners,couriers }) => ({ plan,demand,miners,couriers })),claims: input.claims });
}
export function homeWorldRoutes(home: HomeHaulingInput): PaidCourierActiveRoute[] {
  return home.sources.flatMap(source => source.couriers.map(courier => {
    const route = courier.route, scope = source.demand;
    if (!route || !paidRouteContextMatches(route.program,{ plan: source.plan,paid: courier.paid,
      cohort: { home: home.home,room: scope.room,source: scope.source,generation: scope.generation,endpoint: source.plan.endpoint.id } })) throw new Error('Home world route scope mismatch');
    if (route.program.unit !== courier.opening.observed.unit || route.energy !== courier.opening.observed.energy || route.fatigue !== courier.opening.observed.fatigue) throw new Error('Home world route body mismatch');
    return route;
  }));
}
export function validateHomeWorldFrame(frame: HomeHaulingFrame,tick: number,names: ReadonlySet<string>): void {
  if (frame.tick !== tick || !Number.isSafeInteger(frame.tick) || frame.operations.length > 512) throw new Error('Invalid home world frame');
  const settlement = frame.operations.findIndex(operation => operation.kind === 'settle');
  if (settlement < 0) throw new Error('Missing world settlement');
  if (frame.operations.filter(operation => operation.kind === 'settle').length !== 1) throw new Error('Duplicate world settlement');
  validatePaidVisits(frame,settlement,names); validateExternalVisits(frame);
}
function validatePaidVisits(frame: HomeHaulingFrame,settlement: number,names: ReadonlySet<string>): void {
  const paid = new Set<string>();
  frame.operations.forEach((operation,index) => {
    if (operation.kind !== 'paid') return;
    if (index < settlement || !names.has(operation.name) || paid.has(operation.name) || typeof operation.work !== 'boolean') throw new Error('Invalid world paid visit');
    paid.add(operation.name);
  });
}
function validateExternalVisits(frame: HomeHaulingFrame): void {
  const external = new Set<string>();
  for (const operation of frame.operations) {
    if (operation.kind === 'settle' || operation.kind === 'paid') continue;
    if (operation.kind !== 'external' || !operation.id || external.has(operation.id) || typeof operation.run !== 'function') throw new Error('Invalid outside world operation');
    external.add(operation.id);
  }
}
