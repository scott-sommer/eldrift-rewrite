import { copyPlain } from '../../../persistence/plain-data';
import type { StatePort } from '../../../persistence/versioned-state';
import { createRemoteManagementStore } from './store';
import { validateManagementRequest, validateScanBudget } from './validation';
import { advanceRemoteScan } from './scan';
import { commitRemotePortfolio } from './commit';
import type { RemoteManagementPorts, RemoteManagementRecord, RemoteManagementRequest, RemoteScanBudget } from './model';
/** Incremental assessment resumes across resets; partial scans never publish partial assignment batches. */
export function createRemoteManagement(state: StatePort, home: string, ports: RemoteManagementPorts) {
  const store = createRemoteManagementStore(state,home);
  return { read: store.read,advance(input: RemoteManagementRequest, budget: RemoteScanBudget, guard: () => boolean) {
    validateManagementRequest(input); validateScanBudget(budget);
    if (input.home !== home) throw new Error('Remote management home mismatch');
    const request = copyPlain(input), previous = store.read();
    if (request.tick < previous.clock) return { status: 'stale' as const };
    if (!guard()) return { status: 'deferred' as const };
    const identity = JSON.stringify(request.policy), record = resumeRecord(previous,request,identity);
    if (request.policy.portfolio.maximumSlots === 0) { record.offers = []; record.roomIndex = request.policy.candidates.length; record.sourceIndex = 0; }
    const scanned = advanceRemoteScan(record,request,ports,budget,guard);
    record.clock = request.tick;
    if (scanned === 'capacity') return { status: 'capacity' as const };
    if (scanned === 'pending') return { status: saveRecord(store,previous,record) };
    return finishScan(state,store,previous,record,request,ports,guard);
  } };
}
function resumeRecord(previous: RemoteManagementRecord, request: RemoteManagementRequest, identity: string): RemoteManagementRecord {
  if (previous.identity === identity && !expiredScan(previous,request)) return copyPlain(previous);
  return { home: request.home,revision: previous.revision,clock: request.tick,identity,startedAt: request.tick,
    roomIndex: 0,sourceIndex: 0,offers: [],reports: [],scannedAt: null,committedAt: null,managed: copyPlain(previous.managed) };
}
function expiredScan(record: RemoteManagementRecord, request: RemoteManagementRequest): boolean {
  return record.scannedAt === null ? request.tick-record.startedAt >= request.policy.scanLifetime
    : request.tick-record.scannedAt >= request.policy.reassessInterval;
}
function saveRecord(store: ReturnType<typeof createRemoteManagementStore>, previous: RemoteManagementRecord, record: RemoteManagementRecord) {
  return store.save(previous.revision,record) ? 'scanning' as const : 'conflict' as const;
}

function finishScan(state: StatePort, store: ReturnType<typeof createRemoteManagementStore>, previous: RemoteManagementRecord,
  record: RemoteManagementRecord, request: RemoteManagementRequest, ports: RemoteManagementPorts, guard: () => boolean) {
  record.scannedAt ??= request.tick;
  const committed = commitRemotePortfolio(state,record,request,ports,guard,() => store.read().revision === previous.revision);
  if (committed.status === 'applied') {
    record.committedAt = request.tick;
    record.managed = committed.assignments.map(item => ({ room: item.plan.room,generation: item.generation }));
  }
  if (committed.status === 'inventory-changed') record.identity = '';
  if (!store.save(previous.revision,record)) return { status: 'conflict' as const };
  return committed;
}
