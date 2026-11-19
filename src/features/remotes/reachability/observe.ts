import { copyPlain } from '../../../persistence/plain-data';
import { natural, room } from '../assignment-validation';
import { observeReachabilityAttempt } from './attempt';
import { recordReachabilityOutcome } from './outcome';
import { reachabilityLimits } from './model';
import type { ReachabilityAttempt, ReachabilityObservation, ReachabilityRecord } from './model';
export function observeRemoteReachability(previous: ReachabilityRecord, tick: number, observations: readonly ReachabilityObservation[]): ReachabilityRecord | undefined {
  validateObservation(previous.home,tick,observations);
  if (tick <= previous.clock) return undefined;
  const next = copyPlain(previous); next.clock = tick; next.attempts = [];
  for (const unit of [...observations].sort((a,b) => a.name.localeCompare(b.name))) {
    const old = previous.attempts.find(attempt => sameIdentity(attempt,unit));
    const attempt = observeReachabilityAttempt(old,unit,tick);
    if (attempt.phase !== old?.phase) recordReachabilityOutcome(next,attempt,tick);
    next.attempts.push(attempt);
  }
  return next;
}
function sameIdentity(a: ReachabilityAttempt, b: ReachabilityObservation): boolean {
  return a.id === b.id && a.name === b.name && a.room === b.room && a.source === b.source;
}
function validateObservation(home: string, tick: number, units: readonly ReachabilityObservation[]): void {
  if (!natural(tick) || !Array.isArray(units) || units.length > reachabilityLimits.attempts) throw new Error('Invalid reachability observation bounds');
  if (new Set(units.map(unit => unit.id)).size !== units.length || new Set(units.map(unit => unit.name)).size !== units.length) throw new Error('Duplicate reachability actor');
  for (const unit of units) validateUnit(home,unit);
}
function text(value: unknown): boolean { return typeof value === 'string' && value.length > 0 && value.length <= 256; }
function validLifetime(unit: ReachabilityObservation): boolean {
  return natural(unit.lifetime) && unit.lifetime > 1 && unit.lifetime <= 100000 && natural(unit.ttl) && unit.ttl <= unit.lifetime && (unit.spawning || unit.ttl > 0);
}

function validateUnit(home: string, unit: ReachabilityObservation): void {
  if (![unit.name,unit.id,unit.source].every(text) || !room(unit.room) || unit.room === home) throw new Error('Invalid reachability identity');
  if (![unit.spawning,unit.reached,unit.eligible,unit.healthy].every(value => typeof value === 'boolean')) throw new Error('Invalid reachability evidence');
  if (!validLifetime(unit)) throw new Error('Invalid reachability lifetime');
}
