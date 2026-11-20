import type { BoostStep } from '../industry/boosts/model';
import type { SpawnRequest } from './request';
export interface SpawnBoost { steps: readonly BoostStep[]; required: boolean; timeout: number }
function validStep(step: BoostStep,request: SpawnRequest): boolean {
  return !!step && typeof step.part === 'string' && step.part.length > 0 && step.part.length <= 20
    && typeof step.resource === 'string' && step.resource.length > 0 && step.resource.length <= 20
    && Number.isSafeInteger(step.count) && step.count > 0 && step.count <= request.body.filter(part => part === step.part).length;
}
function validatePolicy(boost: SpawnBoost): void {
  if (!boost || typeof boost.required !== 'boolean' || !Number.isSafeInteger(boost.timeout) || boost.timeout < 1 || boost.timeout > 1500) throw new Error('Invalid spawn boost policy');
}
function validateSteps(boost: SpawnBoost,request: SpawnRequest): void {
  if (!Array.isArray(boost.steps) || !boost.steps.length || boost.steps.length > 8 || !boost.steps.every(step => validStep(step,request))) throw new Error('Invalid spawn boost steps');
  if (new Set(boost.steps.map(step => step.part)).size !== boost.steps.length) throw new Error('Conflicting spawn boost parts');
}
export function validateSpawnBoost(request: SpawnRequest): void {
  const boost = request.boost;
  if (boost === undefined) return;
  validatePolicy(boost);
  if (![request.id,request.owner,request.name,request.home ?? request.room].every(value => typeof value === 'string' && value.length <= 180)) throw new Error('Invalid spawn boost identity');
  if (spawnBoostIdentity(request).length > 200) throw new Error('Invalid spawn boost scope');
  validateSteps(boost,request);
}
export function copySpawnBoost(boost: SpawnBoost): SpawnBoost {
  return { required: boost.required,timeout: boost.timeout,steps: boost.steps.map(step => ({ ...step })) };
}

export function spawnBoostIdentity(request: Pick<SpawnRequest,'room' | 'id'>): string {
  return 'birth:'+JSON.stringify([request.room,request.id]);
}
