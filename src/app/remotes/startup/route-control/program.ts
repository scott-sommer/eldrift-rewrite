import { copyPlain } from '../../../../core/plain-data';
import { withinRange } from '../../../../capabilities/movement/path-model';
import type { PaidUnitContext } from '../motion-observation/model';
import type { PaidCourierOpening } from '../motion-observation/opening-model';
import type { PaidCourierContinuation } from '../projection/motion/continuation-model';
import type { PaidCourierRouteProgram } from '../../../../features/remotes/startup/routes/model';
export function paidRouteProgram(context: PaidUnitContext,compiled: PaidCourierContinuation,current: PaidCourierOpening,tick: number): PaidCourierRouteProgram | undefined {
  if (!validOpening(compiled,current,tick) || !validBody(context,compiled,current) || !validGeometry(context,compiled,current)) return undefined;
  const scope = context.cohort,paid = context.paid;
  return copyPlain({ home: scope.home,room: scope.room,source: scope.source,generation: scope.generation,endpoint: scope.endpoint,name: paid.request,unit: current.observed.unit,owner: paid.owner,body: [...paid.body],
    activeAt: paid.activeAt,retireAt: paid.retireAt,expiresAt: paid.expiresAt,activatedAt: tick,routeVersion: compiled.routeVersion,topologyVersion: compiled.topologyVersion,
    opening: { plan: compiled.opening.plan,phase: compiled.initial.phase,readyAt: current.continuation.readyAt,energy: current.observed.energy,fatigue: current.observed.fatigue,spawning: current.continuation.stage === 'spawning' },empty: compiled.route.empty,loaded: compiled.route.loaded });
}
export function paidRouteContextMatches(program: PaidCourierRouteProgram,context: PaidUnitContext): boolean {
  const scope = context.cohort,paid = context.paid;
  return program.home === scope.home && program.room === scope.room && program.source === scope.source && program.generation === scope.generation && program.endpoint === scope.endpoint
    && paidRouteBodyMatches(program,paid);
}
function paidRouteBodyMatches(program: PaidCourierRouteProgram,paid: PaidUnitContext['paid']): boolean {
  return program.name === paid.request && program.owner === paid.owner && JSON.stringify(program.body) === JSON.stringify(paid.body)
    && program.activeAt === paid.activeAt && program.retireAt === paid.retireAt && program.expiresAt === paid.expiresAt;
}
function validOpening(compiled: PaidCourierContinuation,current: PaidCourierOpening,tick: number): boolean {
  return compiled.observedAt === tick && current.observed.observedAt === tick && JSON.stringify(compiled.basis) === JSON.stringify(current)
    && compiled.opening.readyAt+tick === current.continuation.readyAt && compiled.opening.fatigue === current.observed.fatigue;
}
function validBody(context: PaidUnitContext,compiled: PaidCourierContinuation,current: PaidCourierOpening): boolean {
  const paid = context.paid,observed = current.observed;
  if (compiled.source !== context.cohort.source || compiled.unit !== observed.unit || compiled.initial.id !== paid.request || compiled.route.request !== paid.request) return false;
  if (compiled.opening.request !== paid.request || compiled.opening.owner !== paid.owner || JSON.stringify(compiled.initial.body) !== JSON.stringify(paid.body)) return false;
  return compiled.initial.energy === observed.energy && compiled.initial.phase === (current.continuation.stage === 'deliver' ? 'deliver' : 'collect');
}
function validGeometry(context: PaidUnitContext,compiled: PaidCourierContinuation,current: PaidCourierOpening): boolean {
  const origin = current.continuation.stage === 'spawning' ? context.plan.spawn.exit : current.observed.position;
  return withinRange(compiled.opening.plan.origin,origin,0) && withinRange(compiled.route.empty.origin,context.plan.endpoint.deposit,0) && withinRange(compiled.route.loaded.origin,context.plan.collection,0);
}
