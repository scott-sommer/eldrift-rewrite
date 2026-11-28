import { withinRange } from '../../../../../capabilities/movement/path-model';
import { remoteTransportOwner } from '../../../../../features/remotes/transport-authority';
import type { RemoteTransportDemand } from '../../../../../features/remotes/transport-authority';
import { selectedTransportRequest } from '../../../transport-service';
import { remoteCollectionAdmission } from '../../../transport-admission';
import type { RemoteCollectionPolicy } from '../../../transport-admission';
import type { HaulingTaskPayload } from '../../../../hauling-task';
import type { PaidHaulingForecastSeed,PaidHaulingForecastWorker } from '../service';
import { paidTransportBindings,sameTransportAuthority } from './bindings';
import type { PaidTransportBinding,PaidTransportSource,PaidTransportPolicyPorts } from './model';
/** Concrete productive trip policy; physical effects, task ownership and unqualified cleanup stay with their owners. */
export function createPaidHomeTransportPolicy(home: string,sources: readonly PaidTransportSource[],seed: PaidHaulingForecastSeed,
  policy: Pick<RemoteCollectionPolicy,'minimumBatch' | 'requestLifetime'>,ports: PaidTransportPolicyPorts) {
  if (![policy.minimumBatch,policy.requestLifetime].every(value => Number.isSafeInteger(value) && value >= 1)) throw new Error('Invalid paid transport policy');
  const bindings = paidTransportBindings(home,sources,seed);
  function binding(worker: PaidHaulingForecastWorker) { const value = bindings.get(worker.name); if (!value) throw new Error('Unknown paid transport worker'); return value; }
  function authority(worker: PaidHaulingForecastWorker): RemoteTransportDemand | undefined {
    const expected = binding(worker),tick = ports.inventory.tick(),current = ports.authority(worker,tick);
    if (!current || !sameTransportAuthority(expected.source.demand,current,tick)) return undefined;
    if (tick < expected.paid.activeAt || tick >= expected.paid.retireAt || ports.physical(worker).spawning) return undefined;
    return current;
  }
  function stage(worker: PaidHaulingForecastWorker): void {
    ports.move(worker.name,{ owner: binding(worker).paid.owner,destination: binding(worker).source.plan.collection,range: 0,policy: ports.roomPolicy(worker,'collect') });
  }
  function unit(worker: PaidHaulingForecastWorker) {
    const value = ports.inventory.observe(worker.unit);
    if (!value || value.capacity !== binding(worker).paid.capacity || value.usedCapacity !== value.energy) throw new Error('Paid transport physical store changed');
    return value;
  }
  function retire(worker: PaidHaulingForecastWorker,reason: string): void {
    if (!ports.retire) throw new Error(reason);
    ports.retire(worker);
  }
  return {
    authorized(worker: PaidHaulingForecastWorker,payload: HaulingTaskPayload): boolean {
      const current = authority(worker); if (!current) return false;
      const tick = ports.inventory.tick(),request = payload.request;
      return requestValid(home,worker,payload,current,tick) && selectedTransportRequest(request,service(binding(worker)));
    },
    prepare(worker: PaidHaulingForecastWorker): boolean {
      if (unit(worker).energy > 0 || ports.visible(binding(worker).source.plan.room)) return true;
      stage(worker); return false;
    },
    recruit(worker: PaidHaulingForecastWorker) {
      if (ports.physical(worker).spawning) return undefined;
      const current = authority(worker); if (!current) { retire(worker,'Paid transport authority/lifecycle invalidated'); return undefined; }
      const physical = unit(worker),selected = binding(worker),plan = selected.source.plan;
      if (physical.energy > 0) { retire(worker,'Paid transport cargo requires cleanup'); return undefined; }
      const container = ports.visible(plan.room) ? ports.collection(worker) : undefined;
      if (!container || !withinRange(ports.physical(worker).position,plan.collection,0)) { stage(worker); return undefined; }
      if (physical.freeEnergyCapacity < 1) return undefined;
      const admission = remoteCollectionAdmission({ home,name: worker.name,unitId: worker.unit,actor: selected.paid.owner,tick: ports.inventory.tick(),demand: current,
        source: container,sink: plan.endpoint.id,maximum: physical.freeEnergyCapacity },{ ...policy,service: service(selected) },request => ports.view(worker,{ home,unitId: worker.unit,request }));
      if (!admission) return undefined;
      const { request,phase,maximum,available,sinkRoom } = admission;
      return { request,phase,maximum,available,...(sinkRoom ? { sinkRoom } : {}) };
    },
    refused: stage,
  };
}
function service(binding: PaidTransportBinding) { const plan = binding.source.plan; return { station: plan.station,collection: plan.collection,deposit: plan.endpoint.deposit,endpoint: plan.endpoint.id }; }
function requestValid(home: string,worker: PaidHaulingForecastWorker,payload: HaulingTaskPayload,current: RemoteTransportDemand,tick: number): boolean {
  const request = payload.request;
  return payload.home === home && payload.unitId === worker.unit && request.resource === 'energy' && request.owner === remoteTransportOwner(current,worker.opening.observed.owner)
    && request.expiresAt > tick && request.expiresAt <= current.expiresAt;
}
