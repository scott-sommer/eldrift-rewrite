import { copySpawnRequest } from '../../spawning/placement';
import { spawnedActiveTicks } from '../../spawning/lifetime';
import type { SpawnRequest } from '../../spawning/request';
import type { StartupDeliveryInput } from './delivery-model';
import type { StartupScheduledBirth } from './spawn-model';
export interface StartupReplacementProposal { parent: string; kind: 'miner' | 'courier'; request: SpawnRequest }
/** Each proposal is scheduled from a paid predecessor's actual forecast admission. */
export function startupReplacementProposals(input: StartupDeliveryInput, births: readonly StartupScheduledBirth[]): StartupReplacementProposal[] {
  const mining = input.project.workers.map(worker => ({ worker,birth: births.find(birth => birth.request === worker.request)! }));
  mining.sort((a,b) => b.birth.activeAt-a.birth.activeAt || a.worker.request.localeCompare(b.worker.request));
  const proposals: StartupReplacementProposal[] = [];
  const miner = mining[0];
  if (miner) addProposal(proposals,input,miner.birth,miner.worker,'miner',miner.worker.travelTicks);
  for (const worker of input.couriers) {
    const birth = births.find(item => item.request === worker.request)!;
    addProposal(proposals,input,birth,worker,'courier',worker.initialOutboundTicks ?? worker.outboundTicks);
  }
  return proposals.sort((a,b) => a.request.readyAt-b.request.readyAt || a.parent.localeCompare(b.parent));
}
function addProposal(proposals: StartupReplacementProposal[], input: StartupDeliveryInput, birth: StartupScheduledBirth,
  worker: { request: string; retireTicks: number }, kind: 'miner' | 'courier', approach: number): void {
  const spawning = input.project.spawning, parent = spawning.requests.find(request => request.id === worker.request)!;
  const id = parent.id+':next';
  if ([...input.project.workers,...input.couriers].some(worker => worker.request === id)) return;
  const serviceAt = birth.activeAt+spawnedActiveTicks(parent.body)-worker.retireTicks;
  if (serviceAt > spawning.cash.horizon) return;
  const readyAt = serviceAt-approach-parent.body.length*3;
  if (readyAt <= birth.startAt) throw new Error('Replacement has no predecessor service interval');
  proposals.push({ parent: parent.id,kind,request: copySpawnRequest({ ...parent,id,name: parent.name+':next',readyAt,expiresAt: spawning.cash.horizon+1 }) });
}
