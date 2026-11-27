import { keys,record,integer } from '../../../../capabilities/economy/startup/checkpoints/validation';
import { createTransitPlan } from '../../../../capabilities/movement/transit/plan';
import { withinRange } from '../../../../capabilities/movement/path-model';
import type { TransitPlan } from '../../../../capabilities/movement/transit/model';
import type { PaidCourierRouteProgram } from './model';
export function validPaidCourierRouteProgram(value: unknown,home: string): value is PaidCourierRouteProgram {
  if (!validIdentity(value,home)) return false;
  const program = value as unknown as PaidCourierRouteProgram;
  if (!['generation','activeAt','retireAt','expiresAt','activatedAt'].every(key => integer(value[key]))) return false;
  if (!(program.activeAt < program.retireAt && program.activatedAt < program.retireAt && program.retireAt < program.expiresAt)) return false;
  return validBody(program) && validOpening(program) && validPlans(program);
}
function validIdentity(value: unknown,home: string): value is Record<string,unknown> {
  if (!record(value) || !keys(value,['home','room','source','generation','endpoint','name','unit','owner','body','activeAt','retireAt','expiresAt','activatedAt','routeVersion','topologyVersion','opening','empty','loaded'])) return false;
  return value.home === home && ['home','room','source','endpoint','name','unit','owner','routeVersion','topologyVersion'].every(key => typeof value[key] === 'string' && (value[key] as string).length > 0);
}
function validBody(program: PaidCourierRouteProgram): boolean {
  return Array.isArray(program.body) && program.body.length <= 50 && program.body.includes('carry') && program.body.includes('move') && program.body.every(part => ['carry','move'].includes(part));
}
function validOpening(program: PaidCourierRouteProgram): boolean {
  const seed = program.opening;
  if (!record(seed) || !keys(seed,['plan','phase','readyAt','energy','fatigue','spawning']) || !['collect','deliver'].includes(seed.phase) || typeof seed.spawning !== 'boolean') return false;
  if (!integer(seed.readyAt,program.activatedAt,program.retireAt-1) || !validOpeningCargo(program)) return false;
  return validSpawnOpening(program);
}
function validOpeningCargo(program: PaidCourierRouteProgram): boolean {
  const seed = program.opening;
  return integer(seed.energy,0,program.body.filter(part => part === 'carry').length*50) && integer(seed.fatigue) && (seed.phase === 'deliver') === (seed.energy > 0);
}
function validSpawnOpening(program: PaidCourierRouteProgram): boolean {
  const seed = program.opening;
  if (!seed.spawning) return program.activeAt <= program.activatedAt;
  return program.activatedAt < program.activeAt && seed.energy === 0 && seed.fatigue === 0 && seed.readyAt >= program.activeAt;
}
function validPlans(program: PaidCourierRouteProgram): boolean {
  const recovery = program.body.filter(part => part === 'move').length*2;
  for (const plan of [program.opening.plan,program.empty,program.loaded]) {
    createTransitPlan(plan);
    if (!validPlanIdentity(plan,program,recovery)) return false;
  }
  return validEndpoints(program);
}
function validPlanIdentity(plan: TransitPlan,program: PaidCourierRouteProgram,recovery: number): boolean {
  return plan.unit === program.name && (plan.order ?? plan.unit) === program.name && plan.owner === program.owner && plan.recovery === recovery;
}
function validEndpoints(program: PaidCourierRouteProgram): boolean {
  if (!program.empty.path.length || !program.loaded.path.length) return false;
  const end = program.opening.phase === 'deliver' ? program.empty.origin : program.loaded.origin;
  return withinRange(program.empty.path.at(-1)!,program.loaded.origin,0) && withinRange(program.loaded.path.at(-1)!,program.empty.origin,0) && withinRange(program.opening.plan.path.at(-1) ?? program.opening.plan.origin,end,0);
}
