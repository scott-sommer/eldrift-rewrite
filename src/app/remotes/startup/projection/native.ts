import { sharedSinkCapacity } from '../../../../capabilities/economy/startup/shared-validation';
import { observeStartupIncumbents } from './incumbents';
import { createStartupProject } from '../../../../capabilities/economy/startup/project';
import { snapshotStartupProject } from '../../../../capabilities/economy/startup/snapshot';
import { copyPlain } from '../../../../core/plain-data';
import { peekState } from '../../../../persistence/versioned-state';
import { stateKey } from '../../../../persistence/state-key';
import { spawnQueueSchema } from '../../../../features/population/spawn-schema';
import type { StatePort } from '../../../../persistence/versioned-state';
import { startupProjectionRefusal } from './eligibility';
import { startupProjectionSchedule } from './schedule';
import { startupProjectionInput } from './input';
import type { NativeStartupQuote, NativeStartupProjection, NativeStartupProjectionOptions, NativeCohortProjection } from './model';
/** Initial prospective cohort strategy; refuses current labor/stock it cannot yet represent honestly. */
export function createNativeStartupProjection(state: StatePort, cohorts?: NativeCohortProjection) {
  return (quote: NativeStartupQuote, options: NativeStartupProjectionOptions, guard: () => boolean = () => true): NativeStartupProjection => {
    if (!guard()) return { status: 'deferred',reason: 'budget' };
    quote = copyPlain(quote); options = copyPlain(options);
    const reason = startupProjectionRefusal(quote,options); if (reason) return { status: 'deferred',reason };
    const obligations = cohorts?.(quote,options,guard); if (obligations?.status === 'deferred') return obligations;
    const observed = obligations ? { ...quote,facts: { ...quote.facts,workers: [...obligations.workers] } } : quote;
    const incumbents = observeStartupIncumbents(state,observed,options); if (incumbents.status === 'deferred') return incumbents;
    const queued = peekState(state,stateKey('spawning',quote.plan.home),spawnQueueSchema(quote.plan.home))?.requests ?? [];
    const schedule = startupProjectionSchedule(quote,options,queued);
    if (schedule.status === 'deferred') return schedule;
    if (!guard()) return { status: 'deferred',reason: 'budget' };
    const input = snapshotStartupProject(startupProjectionInput(quote,options,schedule.requests,incumbents.initial));
    if (obligations?.shared) { input.shared = copyPlain(obligations.shared); input.homeSink.freeCapacity -= sharedSinkCapacity(input.shared); }
    createStartupProject(input);
    return { status: 'ready',observedAt: Game.time,quoteIdentity: quote.identity,costScope: 'prospective',input };
  };
}
