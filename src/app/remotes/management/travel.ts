import type { StatePort } from '../../../persistence/versioned-state';
import { createRemoteTravelProgress } from '../../../features/remotes/management/travel-progress';
import type { RemoteTravelLeg } from '../../../features/remotes/management/travel-progress';
import { measureRemoteLeg } from '../assessment/travel';
import type { measureRemoteTravel, RemoteLegRequest } from '../assessment/travel';
import { prepareRemoteMatrices } from '../assessment/matrices';
/** Cache only completed static legs, fenced by route, topology, endpoints and the measured body policy. */
export function createResumableRemoteTravel(state: StatePort): typeof measureRemoteTravel {
  return (context,origin,rooms,maximumOps,snapshots,guard) => {
    if (!guard()) return { status: 'deferred',reason: 'admission' };
    const matrices = prepareRemoteMatrices(context,rooms,1,snapshots), store = createRemoteTravelProgress(state,context.request.home);
    const identity = JSON.stringify([context.request.home,context.request.source,origin,context.target,rooms,context.request.economics,matrices.version]);
    let record = store.read();
    const legs = record.identity === identity ? record.legs : [];
    for (let index=legs.length; index<3; index++) {
      if (!guard()) return { status: 'deferred',reason: 'admission' };
      const request = legRequest(index,context.request.economics,origin,context.target,legs);
      const result = measureRemoteLeg(context,request,rooms,maximumOps,snapshots,guard);
      if (result.status !== 'complete') return result;
      legs.push({ ticks: result.ticks,operations: result.operations,arrival: result.arrival });
      if (!store.save(record.revision,context.request.tick,identity,legs)) return { status: 'deferred',reason: 'progress-conflict' };
      record = store.read();
    }
    return { status: 'complete',minerTicks: legs[0]!.ticks,outboundTicks: legs[1]!.ticks,returnTicks: legs[2]!.ticks,
      rooms: [...rooms],operations: legs.reduce((sum,leg) => sum+leg.operations,0) };
  };
}
function legRequest(index: number, policy: Parameters<typeof measureRemoteTravel>[0]['request']['economics'],
  origin: RemoteLegRequest['origin'], target: RemoteLegRequest['origin'], legs: RemoteTravelLeg[]): RemoteLegRequest {
  if (index === 0) return { origin,destination: target,body: policy.miner.body,load: 0 };
  if (index === 1) return { origin,destination: target,body: policy.hauler.body,load: 0 };
  return { origin: legs[1]!.arrival,destination: origin,body: policy.hauler.body,load: policy.hauler.body.filter(part => part === 'carry').length*50 };
}
