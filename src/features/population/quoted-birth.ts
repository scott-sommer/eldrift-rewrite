import { copySpawnRequest } from '../../capabilities/spawning/placement';
import { validateQuotedBirth } from './quoted-birth-validation';
import type { SpawnRequest } from '../../capabilities/spawning/request';
import type { StartupScheduledBirth } from '../../capabilities/economy/startup/spawn-model';
/** Preserve model identity/order and admit only its exact quoted start frame. No queue or funding authority. */
export function materializeQuotedBirth(request: SpawnRequest, birth: StartupScheduledBirth, observedAt: number, tick: number) {
  validateQuotedBirth(request,birth,observedAt,tick);
  const readyAt = observedAt+birth.startAt, activeAt = observedAt+birth.activeAt;
  if (![readyAt+1,activeAt].every(Number.isSafeInteger)) throw new Error('Quoted birth clock overflow');
  if (tick !== readyAt) return { status: 'deferred' as const,reason: tick < readyAt ? 'not-due' : 'missed-frame' };
  return { status: 'ready' as const,request: copySpawnRequest({ ...request,readyAt,expiresAt: readyAt+1 }),activeAt };
}

