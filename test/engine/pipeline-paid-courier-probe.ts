import { pipelinePaidContexts } from './pipeline-paid-contexts';
import { probePaidRouteActivation } from './pipeline-paid-route-probe';
import { createNativePaidCourierContinuation } from '../../src/app/remotes/startup/projection/motion/continuation';
import { createNativePaidCourierOpening } from '../../src/app/remotes/startup/motion-observation/native-opening';
import { createNativePaidSourceObservation } from '../../src/app/remotes/startup/motion-observation/source';
import { createNativePaidMinerObservation } from '../../src/app/remotes/startup/motion-observation/miner';
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
  const contexts = pipelinePaidContexts(readOnly,config,() => true); if (!contexts) throw new Error('Actual paid crews failed full qualification');
  const courier = createNativePaidCourierObservation(readOnly),miner = createNativePaidMinerObservation(readOnly),source = createNativePaidSourceObservation(readOnly);
  const opening = createNativePaidCourierOpening(readOnly);
  const compile = createNativePaidCourierContinuation(readOnly);
  return {
    continuations: beforeDispatch ? contexts.flatMap(context => context.cohort.workers.filter(paid => !paid.body.includes('work')).map(paid => { const scoped = { ...context,paid },result = compile(scoped,config,{ blocked: [] }); return { source: context.cohort.source,result,...(result.status === 'ready' ? { activation: probePaidRouteActivation(readOnly,config,scoped,result.compilation) } : {}) }; })) : [],
    openings: beforeDispatch ? contexts.flatMap(context => context.cohort.workers.filter(paid => !paid.body.includes('work')).map(paid => ({ source: context.cohort.source,result: opening({ ...context,paid }) }))) : [],
    couriers: contexts.flatMap(context => context.cohort.workers.filter(paid => !paid.body.includes('work')).map(paid => ({ source: context.cohort.source,result: courier({ ...context,paid }) }))),
    miners: contexts.flatMap(context => context.cohort.workers.filter(paid => paid.body.includes('work')).map(paid => ({ source: context.cohort.source,result: miner({ ...context,paid }) }))),
    sources: contexts.map(context => ({ source: context.cohort.source,result: source(context) })),
  };
}
