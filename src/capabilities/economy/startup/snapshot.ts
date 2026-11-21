import { copyPlain } from '../../../core/plain-data';
import { normalizeStartupOpening } from './initial';
import { copySpawnRequest } from '../../spawning/placement';
import type { StartupSpawnInput } from './spawn-model';
import type { StartupDeliveryInput } from './delivery-model';
export function snapshotStartupSpawns(input: StartupSpawnInput): StartupSpawnInput {
  return { ...input,requests: input.requests.map(copySpawnRequest),spawns: input.spawns.map(spawn => ({ ...spawn })),liveNames: new Set(input.liveNames),
    cash: { ...input.cash,flows: input.cash.flows.map(flow => ({ ...flow })) },funding: { ...input.funding,...(input.funding.energyLayout ? { energyLayout: copyPlain(input.funding.energyLayout) } : {}),refills: input.funding.refills.map(flow => ({ ...flow })) } };
}
export function snapshotStartupProject(input: StartupDeliveryInput): StartupDeliveryInput {
  input = normalizeStartupOpening(input);
  const initial = input.initial;
  return { ...input,...(input.household ? { household: copyPlain(input.household) } : {}),...(initial ? { initial: { ...initial,miner: initial.miner && { ...initial.miner,body: [...initial.miner.body] },couriers: initial.couriers.map(worker => ({ ...worker,body: [...worker.body] })) } } : {}),couriers: input.couriers.map(worker => ({ ...worker })),
    project: { ...input.project,source: { ...input.project.source },workers: input.project.workers.map(worker => ({ ...worker })),spawning: snapshotStartupSpawns(input.project.spawning) },
    homeSink: { ...input.homeSink,changes: input.homeSink.changes.map(flow => ({ ...flow })) },
    container: { ...input.container,repairPolicy: input.container.repairPolicy && { ...input.container.repairPolicy } } };
}
