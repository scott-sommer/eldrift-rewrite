import type { ReachabilityAttempt, ReachabilityObservation, ReachabilityPhase } from './model';
/** A lifetime failure requires observing birth, an uninterrupted TTL trajectory and its actual final tick. */
export function observeReachabilityAttempt(previous: ReachabilityAttempt | undefined, unit: ReachabilityObservation, tick: number): ReachabilityAttempt {
  const current = previous ?? initialAttempt(unit,tick);
  const next = { ...current,lastSeen: tick };
  if (current.phase === 'success' || current.phase === 'failure') return next;
  if (unit.reached && !unit.spawning) return { ...next,phase: 'success' };
  if (interrupted(previous,unit,tick)) return { ...next,phase: 'interrupted' };
  return { ...next,...advanceLifetime(current,unit,tick) };
}
function advanceLifetime(attempt: ReachabilityAttempt, unit: ReachabilityObservation, tick: number): { phase: ReachabilityPhase; expiresAt: number | null } {
  if (attempt.phase === 'interrupted') return { phase: 'interrupted',expiresAt: attempt.expiresAt };
  if (unit.spawning) return { phase: attempt.phase === 'spawning' ? 'spawning' : 'interrupted',expiresAt: null };
  if (attempt.phase === 'spawning') {
    if (unit.ttl < unit.lifetime-1) return { phase: 'interrupted',expiresAt: null };
    return { phase: unit.ttl === 1 ? 'failure' : 'approach',expiresAt: tick+unit.ttl-1 };
  }
  if (attempt.expiresAt !== tick+unit.ttl-1) return { phase: 'interrupted',expiresAt: attempt.expiresAt };
  return { phase: unit.ttl === 1 ? 'failure' : 'approach',expiresAt: attempt.expiresAt };
}

function initialAttempt(unit: ReachabilityObservation, tick: number): ReachabilityAttempt {
  return { name: unit.name,id: unit.id,room: unit.room,source: unit.source,phase: unit.spawning ? 'spawning' : 'interrupted',startedAt: tick,lastSeen: tick,expiresAt: null };
}
function interrupted(previous: ReachabilityAttempt | undefined, unit: ReachabilityObservation, tick: number): boolean {
  return !unit.eligible || !unit.healthy || !!previous && previous.lastSeen !== tick-1;
}
