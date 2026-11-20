import type { StartupSpawnInput } from './spawn-model';
import type { StartupDeliveryInput } from './delivery-model';
export function snapshotStartupSpawns(input: StartupSpawnInput): StartupSpawnInput {
  return { ...input,requests: input.requests.map(request => ({ ...request,body: [...request.body] })),spawns: input.spawns.map(spawn => ({ ...spawn })),liveNames: new Set(input.liveNames),
    cash: { ...input.cash,flows: input.cash.flows.map(flow => ({ ...flow })) },funding: { ...input.funding,refills: input.funding.refills.map(flow => ({ ...flow })) } };
}
export function snapshotStartupProject(input: StartupDeliveryInput): StartupDeliveryInput {
  return { ...input,couriers: input.couriers.map(worker => ({ ...worker })),
    project: { ...input.project,source: { ...input.project.source },workers: input.project.workers.map(worker => ({ ...worker })),spawning: snapshotStartupSpawns(input.project.spawning) },
    homeSink: { ...input.homeSink,changes: input.homeSink.changes.map(flow => ({ ...flow })) },
    container: { ...input.container,repairPolicy: input.container.repairPolicy && { ...input.container.repairPolicy } } };
}
