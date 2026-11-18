import { roomCoordinates } from '../../../core/geometry/room-grid';
import { copyPlain } from '../../../persistence/plain-data';
import type { StatePort } from '../../../persistence/versioned-state';
import { natural } from '../assignment-validation';
import { createRemoteDiscoveryStore } from './store';
import type { RemoteDiscoveryPolicy, RemoteDiscoveryPorts, RemoteDiscoveryRecord } from './model';
/** Cardinal breadth-first discovery resumes within an exit row; unknown or denied rooms are never invented as corridors. */
export function createRemoteDiscovery(state: StatePort, home: string) {
  roomCoordinates(home);
  const store = createRemoteDiscoveryStore(state,home);
  return { read: store.read,advance(tick: number, identity: string, policy: RemoteDiscoveryPolicy, reads: number, ports: RemoteDiscoveryPorts, guard: () => boolean) {
    validate(tick,identity,policy,reads);
    const previous = store.read();
    if (tick < previous.clock) return { status: 'stale' as const,rooms: previous.published };
    if (!guard()) return { status: 'deferred' as const,rooms: previous.published };
    const record = resume(previous,tick,JSON.stringify([identity,policy]),policy);
    if (record.completedAt !== null) return { status: 'complete' as const,rooms: record.published,truncated: record.truncated };
    advance(record,policy,reads,ports,guard);
    record.clock = tick;
    if (record.next === record.queue.length && !record.pending) { record.completedAt = tick; record.published = [...record.rooms]; }
    if (!store.save(previous.revision,record)) return { status: 'conflict' as const,rooms: previous.published };
    return { status: record.completedAt === null ? 'discovering' as const : 'complete' as const,rooms: record.published,truncated: record.truncated };
  } };
}
function resume(previous: RemoteDiscoveryRecord, tick: number, identity: string, policy: RemoteDiscoveryPolicy): RemoteDiscoveryRecord {
  if (previous.identity === identity && (previous.completedAt === null || tick-previous.completedAt < policy.refreshInterval)) return copyPlain(previous);
  return { home: previous.home,revision: previous.revision,clock: tick,identity,startedAt: tick,completedAt: null,next: 0,
    queue: [{ room: previous.home,depth: 0 }],seen: [previous.home],rooms: [],published: previous.identity === identity ? previous.published : [],unknown: [],pending: null,truncated: false };
}
function advance(record: RemoteDiscoveryRecord, policy: RemoteDiscoveryPolicy, maximumReads: number, ports: RemoteDiscoveryPorts, guard: () => boolean): void {
  let reads = 0;
  while (record.next < record.queue.length && guard()) {
    if (record.pending) { if (!expand(record,policy,ports,guard)) return; continue; }
    const current = record.queue[record.next]!;
    if (current.depth >= policy.depth) { record.next++; continue; }
    if (reads >= maximumReads) return;
    reads++;
    const exits = ports.exits(current.room);
    if (!exits) { record.unknown.push(current.room); record.next++; continue; }
    if (exits.length > 4) throw new Error('Invalid remote discovery exits');
    for (const next of exits) cardinal(current.room,next);
    record.pending = { depth: current.depth+1,exits: [...new Set(exits)].sort(),next: 0 };
  }
}
function expand(record: RemoteDiscoveryRecord, policy: RemoteDiscoveryPolicy, ports: RemoteDiscoveryPorts, guard: () => boolean): boolean {
  const pending = record.pending!;
  while (pending.next < pending.exits.length) {
    if (!guard()) return false;
    const room = pending.exits[pending.next]!;
    if (record.seen.includes(room)) { pending.next++; continue; }
    const allowed = ports.allows(room);
    if (!guard()) return false;
    record.seen.push(room); pending.next++;
    if (!allowed) continue;
    if (record.rooms.length >= policy.maximumRooms) { record.truncated = true; continue; }
    record.rooms.push(room); record.queue.push({ room,depth: pending.depth });
  }
  record.pending = null; record.next++; return true;
}
function cardinal(origin: string, target: string): void {
  const a = roomCoordinates(origin), b = roomCoordinates(target);
  if (Math.abs(a.x-b.x)+Math.abs(a.y-b.y) !== 1) throw new Error('Remote discovery requires cardinal exits');
}
function validate(tick: number, identity: string, policy: RemoteDiscoveryPolicy, reads: number): void {
  if (!natural(tick) || !identity || identity.length > 90000 || !natural(reads) || reads > 1000) throw new Error('Invalid remote discovery request');
  validatePolicy(policy);
}

function validatePolicy(policy: RemoteDiscoveryPolicy): void {
  if (!natural(policy.depth) || policy.depth > 8 || !natural(policy.maximumRooms) || policy.maximumRooms > 64) throw new Error('Invalid remote discovery bounds');
  if (!natural(policy.refreshInterval) || policy.refreshInterval < 1 || policy.refreshInterval > 1000000) throw new Error('Invalid remote discovery refresh');
}
