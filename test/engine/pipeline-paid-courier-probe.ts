import { probePaidRouteActivation } from './pipeline-paid-route-probe';
import { createNativePaidCourierContinuation } from '../../src/app/remotes/startup/projection/motion/continuation';
import { createNativePaidCourierOpening } from '../../src/app/remotes/startup/motion-observation/native-opening';
import { createNativePaidSourceObservation } from '../../src/app/remotes/startup/motion-observation/source';
import { createNativePaidMinerObservation } from '../../src/app/remotes/startup/motion-observation/miner';
import { observeStartupWorkers } from '../../src/app/remotes/startup/worker-facts';
import { createPaidCohortEvidence } from '../../src/app/remotes/startup/economic/paid-evidence';
import { qualifyPaidCohorts } from '../../src/features/remotes/startup/paid-cohorts';
import { createStartupApprovals } from '../../src/features/remotes/startup/approvals/catalog';
import { createNativePaidCourierObservation } from '../../src/app/remotes/startup/motion-observation/native';
import { configurationFor } from '../../src/config/provider';
import { resolveConfig } from '../../src/config/resolve';
import { operatorSchema } from '../../src/features/operator/state';
import { peekState } from '../../src/persistence/versioned-state';
import type { StatePort } from '../../src/persistence/versioned-state';
import type { ConfiguredPipelineMemory } from './pipeline-configured';
/** Six passive samples of fully qualified actually paid crews; no writes through any observed owner. */
export function observePipelinePaidOpening(state: StatePort,beforeDispatch = false) {
  const memory = Memory as ConfiguredPipelineMemory;
  if (!memory.pipelineConfiguredMode || memory.pipelineConfiguredVariant !== undefined || (Game.time !== 97 && (Game.time < 150 || Game.time > 155))) return undefined;
  if (Game.time === 97 && !beforeDispatch) return undefined;
  const readOnly: StatePort = { read: key => state.read(key),write() { throw new Error('Paid courier observation wrote state'); } };
  const config = resolveConfig(configurationFor(peekState(readOnly,'operator/config',operatorSchema) ?? {},'W0N1'),Game.time).values;
  const approvals = createStartupApprovals(readOnly,'W0N1').read().approvals;
  const first = approvals[0]; if (!first) throw new Error('Missing paid approval at observation sample');
  const workers = observeStartupWorkers('W0N1',undefined,() => true)!;
  const scope = { home: 'W0N1',room: first.job.room,source: 'probe-only-unselected',endpoint: first.quote.plan.endpoint.id,observedAt: Game.time,horizon: 1,freeCapacity: Game.rooms.W0N1!.storage!.store.getFreeCapacity(RESOURCE_ENERGY) };
  const shared = qualifyPaidCohorts(scope,workers,createPaidCohortEvidence(readOnly,'W0N1',config),Game.time);
  if (!shared) throw new Error('Actual paid crews failed full qualification');
  const courier = createNativePaidCourierObservation(readOnly),miner = createNativePaidMinerObservation(readOnly),source = createNativePaidSourceObservation(readOnly);
  const opening = createNativePaidCourierOpening(readOnly);
  const contexts = shared.cohorts.map(cohort => ({ cohort,plan: approvals.find(approval => approval.job.room === cohort.room && approval.job.source === cohort.source)!.quote.plan }));
  const compile = createNativePaidCourierContinuation(readOnly);
  return {
    continuations: beforeDispatch ? contexts.flatMap(context => context.cohort.workers.filter(paid => !paid.body.includes('work')).map(paid => { const scoped = { ...context,paid },result = compile(scoped,config,{ blocked: [] }); return { source: context.cohort.source,result,...(result.status === 'ready' ? { activation: probePaidRouteActivation(readOnly,config,scoped,result.compilation) } : {}) }; })) : [],
    openings: beforeDispatch ? contexts.flatMap(context => context.cohort.workers.filter(paid => !paid.body.includes('work')).map(paid => ({ source: context.cohort.source,result: opening({ ...context,paid }) }))) : [],
    couriers: contexts.flatMap(context => context.cohort.workers.filter(paid => !paid.body.includes('work')).map(paid => ({ source: context.cohort.source,result: courier({ ...context,paid }) }))),
    miners: contexts.flatMap(context => context.cohort.workers.filter(paid => paid.body.includes('work')).map(paid => ({ source: context.cohort.source,result: miner({ ...context,paid }) }))),
    sources: contexts.map(context => ({ source: context.cohort.source,result: source(context) })),
  };
}
