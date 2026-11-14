import type { Position } from '../movement/step';
export interface GroundAttempt {
  id: string; unit: string; resource: string; tick: number; position: Position;
  amount: number; cargoBefore: number; hitsBefore: number; groundBefore: number;
}
export interface GroundObservation {
  tick: number; unit?: string; position?: Position; cargo?: number; hits?: number; ground?: number;
  /** Caller must inspect interfering work/transfer/damage evidence, not merely assume an empty list. */
  isolated?: boolean;
}
export type GroundConfirmation = { status: 'waiting' | 'unknown' } | { status: 'released'; amount: number };
export function validateGroundAttempt(attempt: GroundAttempt): void {
  if (![attempt.id, attempt.unit, attempt.resource, attempt.position?.room].every(value => typeof value === 'string' && value.length > 0)) throw new Error('Invalid ground identity');
  if (![attempt.tick, attempt.amount, attempt.cargoBefore, attempt.hitsBefore, attempt.groundBefore].every(value => Number.isSafeInteger(value) && value >= 0)
    || attempt.amount === 0 || attempt.amount > attempt.cargoBefore) throw new Error('Invalid ground quantity');
  if (![attempt.position.x, attempt.position.y].every(value => Number.isInteger(value) && value >= 0 && value < 50)) throw new Error('Invalid ground position');
}
/** Ground release is distinct from a transfer receipt or a promise that recipients collected it. */
export function confirmGroundRelease(attempt: GroundAttempt, observation: GroundObservation, decayDivisor: number): GroundConfirmation {
  validateGroundAttempt(attempt);
  if (!Number.isSafeInteger(observation.tick) || observation.tick < attempt.tick) throw new Error('Invalid ground observation tick');
  if (!Number.isSafeInteger(decayDivisor) || decayDivisor <= 0) throw new Error('Invalid ground decay divisor');
  if (observation.tick === attempt.tick) return { status: 'waiting' };
  if (!matchingObservation(attempt, observation)) return { status: 'unknown' };
  const expected = attempt.groundBefore + attempt.amount;
  const minimum = expected - Math.ceil(expected / decayDivisor);
  if (observation.ground! < minimum || observation.ground! > expected) return { status: 'unknown' };
  return { status: 'released', amount: attempt.amount };
}
function matchingObservation(attempt: GroundAttempt, observation: GroundObservation): boolean {
  return observation.tick === attempt.tick + 1 && observation.unit === attempt.unit && observation.isolated === true
    && observation.hits === attempt.hitsBefore && observation.cargo === attempt.cargoBefore - attempt.amount
    && JSON.stringify(observation.position) === JSON.stringify(attempt.position)
    && Number.isSafeInteger(observation.ground) && observation.ground! >= 0;
}
