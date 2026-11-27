import { qualifyPaidCohorts } from '../../../../features/remotes/startup/paid-cohorts';
import { sharedSinkCapacity,sharedCohortIdentity } from '../../../../capabilities/economy/startup/shared-validation';
import { observeStartupWorkers } from '../worker-facts';
import { createPaidCohortEvidence } from './paid-evidence';
import type { StartupSharedCommitments } from '../../../../capabilities/economy/startup/shared-model';
import type { PaidCohortScope } from '../../../../features/remotes/startup/paid-cohorts';
import type { NativeCohortProjection } from '../projection/model';
import type { StatePort } from '../../../../persistence/versioned-state';
import type { RuntimeConfig } from '../../../../config/model';
function read(state: StatePort, scope: PaidCohortScope, config: Readonly<RuntimeConfig>, guard: () => boolean) {
  const workers = observeStartupWorkers(scope.home,undefined,guard); if (!workers || !guard()) return undefined;
  const result = qualifyPaidCohorts(scope,workers,createPaidCohortEvidence(state,scope.home,config),Game.time);
  if (!result || sharedSinkCapacity(result) > scope.freeCapacity) return undefined;
  return result;
}
export function createPaidHomeProjection(state: StatePort, config: Readonly<RuntimeConfig>): NativeCohortProjection {
  return (quote,options,guard) => {
    const scope = { home: quote.plan.home,room: quote.plan.room,source: quote.plan.source,endpoint: quote.plan.endpoint.id,observedAt: quote.observedAt,horizon: options.horizon,freeCapacity: quote.facts.endpoint.availableCapacity };
    const shared = read(state,scope,config,guard);
    if (!shared) return { status: 'deferred',reason: 'shared-cohort-liability' };
    if (!shared.cohorts.length) return { status: 'ready',workers: quote.facts.workers };
    const paid = new Set(shared.cohorts.flatMap(cohort => cohort.workers.map(worker => worker.request)));
    return { status: 'ready',workers: quote.facts.workers.filter(worker => !paid.has(worker.name)),shared };
  };
}
/** Re-read obligations before publication/payment; old paid proofs never grant new financial authority. */
export function paidHomeCurrent(state: StatePort, shared: StartupSharedCommitments | undefined, config: Readonly<RuntimeConfig>): boolean {
  if (!shared) return true;
  const current = read(state,shared,config,() => true);
  return !!current && sharedCohortIdentity(current.cohorts) === sharedCohortIdentity(shared.cohorts);
}
