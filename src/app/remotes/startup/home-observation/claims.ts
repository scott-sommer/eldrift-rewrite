import { partitionQuantityClaims } from '../../../../persistence/quantities/partition';
import { taskScope } from '../../../../persistence/tasks/scope';
import { logisticsPool } from '../../../../capabilities/logistics/request';
import type { QuantityClaim } from '../../../../persistence/quantities/schema';
import type { PaidHomeSourceObservation } from './model';
export function paidHomeClaims(claims: readonly QuantityClaim[],homePools: readonly string[],sources: readonly PaidHomeSourceObservation[]) {
  const participants = sources.flatMap(source => source.couriers.flatMap(courier => {
    const task = courier.opening.observed.task;
    return task ? [{ owner: task.request.owner,holder: courier.paid.request,scope: taskScope(courier.paid.request,task.id) }] : [];
  }));
  const stationPools = sources.flatMap(source => {
    const station = source.observation.station.facts;
    return station.status === 'ready' ? [logisticsPool('stock',station.id,'energy'),logisticsPool('capacity',station.id)] : [];
  });
  const pools = [...new Set([...homePools,...stationPools])];
  const partition = partitionQuantityClaims(claims,Game.time,participants,pools),selected = new Set([...partition.owned,...partition.external].map(claim => claim.id));
  if (sources.some(source => source.claimIds.some(id => !selected.has(id)))) throw new Error('Missing source claim in home snapshot');
  return partition;
}
