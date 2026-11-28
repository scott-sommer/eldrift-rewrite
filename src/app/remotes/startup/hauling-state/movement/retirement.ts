import { copyPlain } from '../../../../../core/plain-data';
import { withinRange } from '../../../../../capabilities/movement/path-model';
import { createTransitPlan } from '../../../../../capabilities/movement/transit/plan';
import { observeTransitCursor } from '../../../../../capabilities/movement/transit/observed';
import type { ObservedTransitCursor } from '../../../../../capabilities/movement/transit/observed';
import type { TransitPlan } from '../../../../../capabilities/movement/transit/model';
import type { Position } from '../../../../../capabilities/movement/step';
import type { PlannedMovementCommand } from '../../../../../capabilities/movement/fixed-step';
import type { PaidCourierRouteProgram,PaidCourierRouteObservation } from '../../../../../features/remotes/startup/routes/model';
export interface PaidRetirementRoute {
  name: string; unit: string; expiresAt: number; plan: TransitPlan; cursor: ObservedTransitCursor;
  observedAt: number; readyAt: number; energy: number; fatigue: number;
}
/** Handoff changes policy, never physical pose, fatigue or native identity. */
export function holdPaidRetirement(program: PaidCourierRouteProgram,value: PaidCourierRouteObservation): PaidRetirementRoute {
  const plan = createTransitPlan({ unit: program.unit,order: program.name,owner: program.owner,priority: 0,weight: 0,
    recovery: program.body.filter(part => part === 'move').length*2,origin: value.position,path: [] });
  const route = { name: program.name,unit: program.unit,expiresAt: program.expiresAt,plan,
    cursor: { index: 0,observedAt: value.tick,position: value.position,requestedAt: null },
    observedAt: value.tick,readyAt: value.readyAt,energy: value.energy,fatigue: value.fatigue };
  validatePaidRetirement(route,program,value.tick); return copyPlain(route);
}
export function observePaidRetirement(route: PaidRetirementRoute,value: PaidCourierRouteObservation): PaidRetirementRoute {
  if (value.name !== route.name || value.unit !== route.unit || value.tick >= route.expiresAt || value.phase === 'spawning') throw new Error('Retirement observation binding');
  const cursor = observeTransitCursor(route.plan,route.cursor,value.tick,value.position);
  return { ...copyPlain(route),cursor,observedAt: value.tick,readyAt: Math.max(route.readyAt,value.readyAt),energy: value.energy,fatigue: value.fatigue };
}
export function planPaidRetirement(route: PaidRetirementRoute,command: PlannedMovementCommand,path: readonly Position[]): PaidRetirementRoute {
  const plan = createTransitPlan({ ...route.plan,owner: command.owner,origin: route.cursor.position,path });
  if (JSON.stringify(plan.path) !== JSON.stringify(path) || !withinRange(plan.path.at(-1) ?? plan.origin,command.destination,command.range)) throw new Error('Retirement path binding');
  return { ...copyPlain(route),plan,cursor: { index: 0,position: { ...route.cursor.position },observedAt: route.observedAt,requestedAt: null } };
}
export function paidRetirementTransit(route: PaidRetirementRoute,owner = route.plan.owner) {
  const plan = { ...route.plan,owner,weight: Math.ceil(route.energy/50) },cursor = route.cursor;
  return { plan,state: { unit: route.unit,position: { ...cursor.position },index: cursor.index,fatigue: route.fatigue,readyAt: route.readyAt,
    ...(cursor.index === plan.path.length ? { arrivedAt: Math.max(route.readyAt,route.observedAt) } : {}) } };
}
export function validatePaidRetirement(route: PaidRetirementRoute,program: PaidCourierRouteProgram,clock: number): void {
  validateIdentity(route,program); validateClock(route,program,clock); validateBody(route,program);
  if (route.cursor.observedAt !== route.observedAt) throw new Error('Retirement cursor clock');
  observeTransitCursor(route.plan,route.cursor,route.observedAt,route.cursor.position);
}
function validateIdentity(route: PaidRetirementRoute,program: PaidCourierRouteProgram): void {
  const plan = createTransitPlan(route.plan);
  if (route.name !== program.name || route.unit !== program.unit || route.expiresAt !== program.expiresAt || plan.unit !== program.unit || plan.order !== program.name) throw new Error('Retirement route identity');
  if (plan.recovery !== program.body.filter(part => part === 'move').length*2 || plan.weight !== 0 || JSON.stringify(plan) !== JSON.stringify(route.plan)) throw new Error('Retirement route mobility/path');
}
function validateClock(route: PaidRetirementRoute,program: PaidCourierRouteProgram,clock: number): void {
  if (![route.observedAt,route.readyAt,route.energy,route.fatigue].every(Number.isSafeInteger) || route.observedAt < program.activatedAt || route.observedAt > clock || route.observedAt >= route.expiresAt) throw new Error('Retirement route clock');
}
function validateBody(route: PaidRetirementRoute,program: PaidCourierRouteProgram): void {
  if (route.readyAt < route.observedAt || route.fatigue < 0 || route.energy < 0 || route.energy > program.body.filter(part => part === 'carry').length*50) throw new Error('Retirement route body');
}
