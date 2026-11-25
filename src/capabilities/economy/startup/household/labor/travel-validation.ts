import { validWorldPosition } from '../../../../../core/geometry/world-position';
import { laborBody } from './body';
import { natural } from './validation';
import type { Position } from '../../../../movement/step';
import type { LaborTravelPlan, LaborRoute, LaborTravelLeg } from './travel-model';
export function validateLaborTravel(plan: LaborTravelPlan): void {
  validateGeometry(plan);
  if (!['build','repair','upgrade'].includes(plan.kind) || ![plan.load,plan.remainingLoad,plan.workTicks].every(natural)) throw new Error('Invalid labor travel work');
  const body = laborBody(plan.body,plan.kind);
  if (!body.rate || plan.load < 1 || plan.load > body.capacity || plan.remainingLoad > plan.load) throw new Error('Invalid labor travel load');
  validateWindow(plan,body.rate);
}
function validateWindow(plan: LaborTravelPlan, rate: number): void {
  if (plan.workTicks < 1 || plan.workTicks > 1500 || plan.load-plan.remainingLoad > plan.workTicks*rate) throw new Error('Invalid labor travel window');
}
export function validateLaborRoute(route: LaborRoute, leg: LaborTravelLeg): void {
  validateRouteShape(route);
  let previous = leg.origin;
  for (const point of route.path) {
    if (!validWorldPosition(point) || point.room !== leg.origin.room || distance(previous,point) !== 1) throw new Error('Discontinuous labor route');
    previous = point;
  }
  if (previous.x !== leg.destination.x || previous.y !== leg.destination.y) throw new Error('Inexact labor route arrival');
}
function distance(a: Position, b: Position): number { return Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y)); }

function validateGeometry(plan: LaborTravelPlan): void {
  const positions = [plan.spawn.position,plan.spawn.exit,plan.source.position,plan.source.pickup,plan.target.position,plan.target.service];
  if (!positions.every(point => validWorldPosition(point) && point.room === plan.home)) throw new Error('Invalid labor travel position');
  if (distance(plan.spawn.position,plan.spawn.exit) !== 1 || distance(plan.source.position,plan.source.pickup) !== 1 || distance(plan.target.position,plan.target.service) > 3) throw new Error('Invalid labor service geometry');
}
function validateRouteShape(route: LaborRoute): void {
  if (!natural(route.operations) || route.operations > 1000000 || route.path.length > 1500 || route.path.length !== route.terrain.length) throw new Error('Invalid measured labor route');
}
