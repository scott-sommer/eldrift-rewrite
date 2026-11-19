import { natural, object, room } from '../assignment-validation';
import { reachabilityLimits } from './model';
import type { ReachabilityRecord } from './model';
export function validReachabilityRecord(value: unknown, home: string): value is ReachabilityRecord {
  if (!object(value) || value.home !== home || !natural(value.revision) || !natural(value.clock)) return false;
  return entries(value.attempts,reachabilityLimits.attempts,'id',item => validAttempt(item,value.clock as number))
    && entries(value.sources,reachabilityLimits.sources,'source',item => validSource(item,value.clock as number))
    && entries(value.blocked,reachabilityLimits.rooms,'room',item => validBlock(item,value.clock as number))
    && validLinks(value as unknown as ReachabilityRecord);
}
function entries(value: unknown, limit: number, key: string, valid: (item: Record<string,unknown>) => boolean): boolean {
  return Array.isArray(value) && value.length <= limit && value.every(item => object(item) && valid(item)) && new Set(value.map(item => item[key])).size === value.length;
}
function text(value: unknown): boolean { return typeof value === 'string' && value.length > 0 && value.length <= 256; }
function validAttempt(value: Record<string,unknown>, clock: number): boolean {
  if (![value.name,value.id,value.source].every(text) || !room(value.room)) return false;
  if (!member(value.phase,['spawning','approach','success','failure','interrupted'])) return false;
  if (!natural(value.startedAt) || !natural(value.lastSeen) || value.startedAt > value.lastSeen || value.lastSeen !== clock) return false;
  return validExpiry(value);
}
function validSource(value: Record<string,unknown>, clock: number): boolean {
  if (!text(value.source) || !room(value.room) || !member(value.lastResult,['success','failure'])) return false;
  if (!natural(value.consecutiveFailures) || value.consecutiveFailures > 2 || !validTick(value.reportedAt,clock)) return false;
  return validResult(value) && (value.blockedAt === null || validTick(value.blockedAt,clock));
}
function validBlock(value: Record<string,unknown>, clock: number): boolean {
  return room(value.room) && text(value.source) && validTick(value.tick,clock);
}
function validTick(value: unknown, clock: number): boolean { return natural(value) && value <= clock; }

function validLinks(record: ReachabilityRecord): boolean {
  if (new Set(record.attempts.map(attempt => attempt.name)).size !== record.attempts.length) return false;
  if ([...record.attempts,...record.sources,...record.blocked].some(item => item.room === record.home)) return false;
  return record.blocked.every(block => record.sources.some(source => source.source === block.source && source.room === block.room && source.blockedAt === block.tick))
    && record.sources.every(source => source.blockedAt === null || record.blocked.some(block => block.room === source.room));
}

function validExpiry(value: Record<string,unknown>): boolean {
  if (value.expiresAt !== null) return natural(value.expiresAt) && Number(value.expiresAt) >= Number(value.startedAt);
  return value.phase !== 'approach' && value.phase !== 'failure';
}

function member(value: unknown, options: readonly string[]): boolean { return typeof value === 'string' && options.includes(value); }
function validResult(value: Record<string,unknown>): boolean {
  if (value.consecutiveFailures === 2 && value.blockedAt === null) return false;
  return value.lastResult === 'success' ? value.consecutiveFailures === 0 : Number(value.consecutiveFailures) > 0;
}
