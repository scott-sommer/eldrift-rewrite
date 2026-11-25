import { bodyCost } from '../../capabilities/spawning/body';
import { validateRequest } from '../../capabilities/spawning/allocate';
import type { SpawnRequest } from '../../capabilities/spawning/request';
import type { StartupScheduledBirth } from '../../capabilities/economy/startup/spawn-model';
export function validateQuotedBirth(request: SpawnRequest, birth: StartupScheduledBirth, observedAt: number, tick: number): void {
  validateRequest(request);
  if (![observedAt,tick,birth.startAt,birth.activeAt,birth.cost].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error('Invalid quoted birth clocks');
  if (birth.request !== request.id || birth.cost !== bodyCost(request.body) || birth.activeAt !== birth.startAt+request.body.length*3) throw new Error('Quoted birth mismatch');
  if (birth.startAt < request.readyAt || birth.startAt >= request.expiresAt || request.placement?.spawn !== birth.spawn) throw new Error('Quoted birth placement/window mismatch');
}
