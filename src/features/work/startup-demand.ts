import { bodyPlan, repeatedBody } from '../../capabilities/spawning/body';
import { copySpawnRequest } from '../../capabilities/spawning/placement';
import { validateRequest } from '../../capabilities/spawning/allocate';
import { reconcileDemand } from '../../capabilities/spawning/demand';
import type { PopulationUnit } from '../../capabilities/spawning/demand';
import type { SpawnRequest } from '../../capabilities/spawning/request';
import { workOwner, workModeFor, isWorkOwner, workerModes } from './identity';
import { workerBody } from './body-policy';
import type { StartupLaborDemand } from './startup-demand-model';
/** One missing home worker proposal; current roster/queue clocks are native, output clocks are forecast frames. */
export function proposeStartupLaborDemand(plan: StartupLaborDemand, units: readonly PopulationUnit[], pending: readonly SpawnRequest[]) {
  validatePlan(plan);
  if (!plan.enabled) return deferred('disabled');
  const body = selectBody(plan); if (!body) return deferred('body-budget');
  const owner = workOwner(plan.home,plan.mode), scoped = units.map(unit => workModeFor(unit.owner,plan.home,plan.mode) === plan.mode ? { ...unit,owner } : unit);
  const decision = reconcileDemand({ owner,room: plan.home,desired: 1,replacementParts: body.parts.length,travelTicks: plan.replacementTravel,marginTicks: plan.replacementMargin },scoped,pending.map(item => ({ ...item,room: item.home ?? item.room,owner: workModeFor(item.owner,plan.home,plan.mode) === plan.mode ? owner : item.owner })),plan.observedAt);
  if (!decision.missing) return deferred('covered');
  if (physicalCount(plan,units,pending) >= plan.maximumUnits) return deferred('workforce-limit');
  const request: SpawnRequest = { id: plan.id,name: plan.id,owner,room: plan.home,body: body.parts,priority: 5+workerModes.indexOf(plan.mode),readyAt: 0,expiresAt: plan.horizon+1,placement: plan.placement };
  validateRequest(request);
  if (units.some(unit => unit.name === request.name) || pending.some(item => item.id === request.id || item.name === request.name)) return deferred('identity-conflict');
  return { status: 'proposed' as const,request: copySpawnRequest(request),cost: body.cost,spawnTicks: body.spawnTicks };
}
function selectBody(plan: StartupLaborDemand) {
  const body = plan.recipe === 'balanced' ? bodyPlan(repeatedBody(['work','carry','move'],plan.budget,plan.maximumParts),plan.budget) : workerBody(plan.mode,{ budget: plan.budget,level: plan.level });
  return body && body.parts.length <= plan.maximumParts ? body : undefined;
}
function physicalCount(plan: StartupLaborDemand, units: readonly PopulationUnit[], pending: readonly SpawnRequest[]): number {
  const names = new Set(units.map(unit => unit.name));
  const live = units.filter(unit => unit.room === plan.home && isWorkOwner(unit.owner,plan.home)).length;
  return live+pending.filter(item => (item.home ?? item.room) === plan.home && isWorkOwner(item.owner,plan.home) && item.expiresAt > plan.observedAt && !names.has(item.name)).length;
}
function validatePlan(plan: StartupLaborDemand): void {
  if (!workerModes.includes(plan.mode) || !['standard','balanced'].includes(plan.recipe)) throw new Error('Invalid labor demand strategy');
  if (![plan.maximumParts,plan.maximumUnits,plan.horizon,plan.observedAt,plan.budget].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error('Invalid labor demand bounds');
  if (plan.maximumParts < 1 || plan.maximumParts > 50 || plan.maximumUnits > 200 || plan.horizon > 10000) throw new Error('Invalid labor demand limits');
}
function deferred(reason: string) { return { status: 'deferred' as const,reason }; }
