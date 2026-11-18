import { copyPlain } from '../../../persistence/plain-data';
import type { RemoteManagementPorts, RemoteManagementRecord, RemoteManagementRequest, RemoteScanBudget } from './model';
/** Room inventory and expensive source assessment have separate per-call bounds. */
export function advanceRemoteScan(record: RemoteManagementRecord, request: RemoteManagementRequest, ports: RemoteManagementPorts,
  budget: RemoteScanBudget, guard: () => boolean): 'pending' | 'ready' | 'capacity' {
  let rooms = 0;
  while (record.roomIndex < request.policy.candidates.length && rooms < budget.rooms && guard()) {
    const candidate = request.policy.candidates[record.roomIndex++]!; rooms++;
    const summary = ports.summary(candidate.room);
    if (!summary?.sources.length) {
      record.reports.push({ room: candidate.room,source: '',status: 'deferred',reason: summary ? 'inventory:no-sources' : 'inventory:unknown' }); continue;
    }
    const sourceIds = summary.sources.map(source => source.id).sort();
    if (record.offers.reduce((sum,offer) => sum+offer.sourceIds.length,0)+sourceIds.length > 128) return 'capacity';
    record.offers.push({ room: candidate.room,sourceIds,quotes: [],commitment: copyPlain(candidate.commitment) });
  }
  if (record.roomIndex < request.policy.candidates.length) return 'pending';
  const work = record.offers.flatMap(offer => offer.sourceIds.map(source => ({ offer,source })));
  let sources = 0;
  while (record.sourceIndex < work.length && sources < budget.sources && guard()) {
    const { offer,source } = work[record.sourceIndex]!; sources++;
    const result = ports.assess({ home: request.home,room: offer.room,source,tick: request.tick,
      traversal: request.policy.traversal,economics: request.policy.economics },guard);
    if (result.status === 'deferred' && result.reason.endsWith(':admission')) return 'pending';
    record.sourceIndex++;
    if (result.status === 'assessed') offer.quotes.push({ assessment: copyPlain(result) });
    record.reports.push({ room: offer.room,source,status: result.status,reason: result.status === 'assessed' ? '' : result.reason });
  }
  return record.sourceIndex === work.length ? 'ready' : 'pending';
}
