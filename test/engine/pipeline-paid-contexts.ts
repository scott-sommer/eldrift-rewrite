import { observeStartupWorkers } from '../../src/app/remotes/startup/worker-facts';
import { createPaidCohortEvidence } from '../../src/app/remotes/startup/economic/paid-evidence';
import { qualifyPaidCohorts } from '../../src/features/remotes/startup/paid-cohorts';
import { createStartupApprovals } from '../../src/features/remotes/startup/approvals/catalog';
import type { StatePort } from '../../src/persistence/versioned-state';
import type { RuntimeConfig } from '../../src/config/model';
/** Fully qualify actual paid crews; no unselected source income is borrowed. */
export function pipelinePaidContexts(state: StatePort,config: Readonly<RuntimeConfig>,guard: () => boolean) {
  const approvals = createStartupApprovals(state,'W0N1').read().approvals,first = approvals[0],storage = Game.rooms.W0N1?.storage;
  if (!first || !storage || !guard()) return undefined;
  const workers = observeStartupWorkers('W0N1',undefined,guard); if (!workers) return undefined;
  const scope = { home: 'W0N1',room: first.job.room,source: 'probe-only-unselected',endpoint: first.quote.plan.endpoint.id,observedAt: Game.time,horizon: 1,freeCapacity: storage.store.getFreeCapacity(RESOURCE_ENERGY) };
  const shared = qualifyPaidCohorts(scope,workers,createPaidCohortEvidence(state,'W0N1',config),Game.time); if (!shared) return undefined;
  return shared.cohorts.map(cohort => ({ cohort,plan: approvals.find(approval => approval.job.room === cohort.room && approval.job.source === cohort.source)!.quote.plan }));
}
