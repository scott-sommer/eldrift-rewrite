import { reachabilityLimits } from './model';
import type { ReachabilityAttempt, ReachabilityRecord, ReachabilitySource } from './model';
/** Permanent blocks survive later positive observations, matching the legacy blacklist policy. */
export function recordReachabilityOutcome(record: ReachabilityRecord, attempt: ReachabilityAttempt, tick: number): void {
  if (attempt.phase !== 'success' && attempt.phase !== 'failure') return;
  const source = outcomeSource(record,attempt,attempt.phase,tick);
  if (source.room !== attempt.room) throw new Error('Reachability source room changed');
  source.reportedAt = tick;
  source.consecutiveFailures = attempt.phase === 'success' ? 0 : Math.min(2,source.consecutiveFailures+1);
  source.lastResult = attempt.phase;
  if (source.consecutiveFailures < 2) return;
  source.blockedAt ??= tick;
  if (record.blocked.some(item => item.room === attempt.room)) return;
  if (record.blocked.length >= reachabilityLimits.rooms) throw new Error('Reachability room history capacity');
  record.blocked.push({ room: attempt.room,source: attempt.source,tick });
}
function makeSourceSpace(record: ReachabilityRecord): void {
  if (record.sources.length < reachabilityLimits.sources) return;
  const evict = record.sources.filter(source => source.blockedAt === null && source.consecutiveFailures === 0).sort(oldest)[0];
  if (!evict) throw new Error('Reachability source history capacity');
  record.sources = record.sources.filter(source => source !== evict);
}
function oldest(a: ReachabilitySource, b: ReachabilitySource): number { return a.reportedAt-b.reportedAt || a.source.localeCompare(b.source); }

function outcomeSource(record: ReachabilityRecord, attempt: ReachabilityAttempt, result: 'success' | 'failure', tick: number): ReachabilitySource {
  const existing = record.sources.find(item => item.source === attempt.source);
  if (existing) return existing;
  makeSourceSpace(record);
  const source = { source: attempt.source,room: attempt.room,consecutiveFailures: 0,lastResult: result,reportedAt: tick,blockedAt: null };
  record.sources.push(source); return source;
}
