import { keys,record,integer } from '../../../../capabilities/economy/startup/checkpoints/validation';
import { observeTransitCursor } from '../../../../capabilities/movement/transit/observed';
import { paidCourierRoutePlan } from './progress';
import { validPaidCourierRouteProgram } from './program-validation';
import type { PaidCourierActiveRoute,PaidCourierRouteRecord } from './model';
export function validPaidCourierRouteRecord(value: unknown,home: string): value is PaidCourierRouteRecord {
  if (!validHeader(value,home)) return false;
  try { return value.routes.every(route => validActive(route,home,value.clock)) && new Set(value.routes.map(route => route.program.name)).size === value.routes.length; } catch { return false; }
}
function validHeader(value: unknown,home: string): value is PaidCourierRouteRecord {
  if (!record(value) || !keys(value,['home','revision','clock','routes']) || value.home !== home || !integer(value.revision) || !integer(value.clock)) return false;
  return Array.isArray(value.routes) && value.routes.length <= 16 && JSON.stringify(value).length <= 262144;
}
function validActive(value: unknown,home: string,clock: number): boolean {
  if (!record(value) || !keys(value,['program','observedAt','leg','phase','readyAt','energy','fatigue','cursor']) || !validPaidCourierRouteProgram(value.program,home)) return false;
  const route = value as unknown as PaidCourierActiveRoute;
  if (!validState(route,clock) || !validPhase(route)) return false;
  if (!route.cursor) return route.leg === 'opening' && route.program.opening.spawning;
  observeTransitCursor(paidCourierRoutePlan(route),route.cursor,route.cursor.observedAt,route.cursor.position);
  return route.cursor.observedAt === route.observedAt;
}
function validState(route: PaidCourierActiveRoute,clock: number): boolean {
  if (!['opening','empty','loaded'].includes(route.leg) || !['collect','deliver'].includes(route.phase) || !integer(route.readyAt,route.program.activatedAt) || !integer(route.fatigue)) return false;
  if (!integer(route.observedAt,route.program.activatedAt,clock)) return false;
  return integer(route.energy,0,route.program.body.filter(part => part === 'carry').length*50) && (route.phase === 'deliver') === (route.energy > 0) && route.program.activatedAt <= clock;
}
function validPhase(route: PaidCourierActiveRoute): boolean {
  return route.leg === 'opening' ? route.phase === route.program.opening.phase : (route.leg === 'loaded') === (route.phase === 'deliver');
}
