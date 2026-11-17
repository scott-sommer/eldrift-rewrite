import { natural } from './validation';
import type { IntelRecord } from './model';
export function requireIntelClock(tick: number, maximumAge: number): void {
  if (!natural(tick) || !natural(maximumAge)) throw new Error('Invalid intel freshness clock');
}
export function intelReadModel(record: IntelRecord, tick: number, maximumAge: number) {
  requireIntelClock(tick, maximumAge);
  const latest = Math.max(record.lastSeen ?? 0, record.lastFailure?.tick ?? 0);
  if (latest > tick) throw new Error('Intel clock precedes observation');
  const age = record.lastSeen === null ? null : tick - record.lastSeen;
  const summaryAge = record.summary === null ? null : tick - record.summary.observedAt;
  return { record, visible: record.lastSeen === tick, age, summaryAge, freshness: freshness(record, summaryAge, maximumAge) };
}
function freshness(record: IntelRecord, age: number | null, maximum: number): 'unknown' | 'fresh' | 'stale' {
  if (age === null) return 'unknown';
  if (record.summary!.observedAt !== record.lastSeen) return 'stale';
  return age <= maximum ? 'fresh' : 'stale';
}
