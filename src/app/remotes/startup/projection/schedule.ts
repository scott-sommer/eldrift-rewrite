import { sameSpawnPlacement } from '../../../../capabilities/spawning/placement';
import { bindStartupBirth } from '../../../../features/remotes/startup/birth';
import { remotePopulationIdentity } from '../../reachability/identity';
import type { SpawnRequest } from '../../../../capabilities/spawning/request';
import type { NativeStartupQuote, NativeStartupProjectionOptions } from './model';
export function startupProjectionSchedule(quote: NativeStartupQuote, options: NativeStartupProjectionOptions, queued: readonly SpawnRequest[]) {
  validateRetirement(quote,options);
  const requests = options.births.map(proposal => bindStartupBirth(proposal.request,quote.plan,proposal.kind));
  const pending = queued.filter(request => request.expiresAt > Game.time && request.readyAt-Game.time <= options.horizon);
  const competing: SpawnRequest[] = [];
  for (const request of pending) {
    const supplied = requests.find(item => item.id === request.id);
    if (supplied) {
      if (!sameBirth(supplied,request)) return { status: 'deferred' as const,reason: 'queue-collision' };
      continue;
    }
    const identity = remotePopulationIdentity(request.owner);
    if (identity?.home === quote.plan.home && identity.room === quote.plan.room) return { status: 'deferred' as const,reason: 'queued-workforce' };
    competing.push({ ...request,readyAt: Math.max(0,request.readyAt-Game.time),expiresAt: request.expiresAt-Game.time });
  }
  if (requests.length+competing.length > 64) return { status: 'deferred' as const,reason: 'schedule-capacity' };
  return { status: 'ready' as const,requests: [...requests,...competing] };
}
function sameBirth(a: SpawnRequest, b: SpawnRequest): boolean {
  return sameIdentity(a,b) && JSON.stringify(a.body) === JSON.stringify(b.body)
    && a.readyAt === Math.max(0,b.readyAt-Game.time) && a.expiresAt === b.expiresAt-Game.time
    && (!b.placement || sameSpawnPlacement(a.placement,b.placement));
}
function sameIdentity(a: SpawnRequest, b: SpawnRequest): boolean {
  return a.name === b.name && a.owner === b.owner && a.room === b.room && a.home === b.home && a.priority === b.priority;
}
function validateRetirement(quote: NativeStartupQuote, options: NativeStartupProjectionOptions): void {
  for (const proposal of options.births) {
    const kind = proposal.kind === 'miner' ? 'miner-return' : 'courier-loaded';
    const minimum = quote.legs.find(leg => leg.kind === kind)!.ticks+1;
    if (!Number.isSafeInteger(proposal.retireTicks) || proposal.retireTicks < minimum || proposal.retireTicks > 1500) throw new Error('Startup retirement must cover quoted return and deposit');
  }
}
