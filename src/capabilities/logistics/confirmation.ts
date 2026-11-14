export interface TransferAttempt {
  id: string;
  requestKey?: string;
  unit: string;
  target: string;
  room: string;
  resource: string;
  kind: 'withdraw' | 'transfer' | 'pickup';
  tick: number;
  amount: number;
  cargoBefore: number;
}
export interface TransferEvent { source: string; target: string; resource: string; amount: number }
export interface TransferObservation { tick: number; cargo?: number; events?: readonly TransferEvent[] }
export type TransferConfirmation = { status: 'waiting' } | { status: 'unknown' } | { status: 'observed'; amount: number };
export function validateTransferAttempt(attempt: TransferAttempt): void {
  if (![attempt.id, attempt.unit, attempt.target, attempt.room, attempt.resource].every(value => typeof value === 'string' && value.length > 0)) throw new Error('Invalid transfer attempt identity');
  if (attempt.requestKey !== undefined && (typeof attempt.requestKey !== 'string' || !attempt.requestKey)) throw new Error('Invalid transfer request binding');
  if (!['withdraw', 'transfer', 'pickup'].includes(attempt.kind)) throw new Error('Invalid transfer attempt kind');
  if (![attempt.tick, attempt.amount, attempt.cargoBefore].every(value => Number.isSafeInteger(value) && value >= 0)
    || attempt.amount === 0) throw new Error('Invalid transfer attempt quantity');
}
/** Store transfers use native events, so damage or unrelated cargo changes cannot fabricate delivery. */
export function confirmTransfer(attempt: TransferAttempt, observation: TransferObservation): TransferConfirmation {
  validateTransferAttempt(attempt);
  if (!Number.isSafeInteger(observation.tick) || observation.tick < attempt.tick) throw new Error('Invalid transfer observation tick');
  if (observation.tick === attempt.tick) return { status: 'waiting' };
  if (observation.tick !== attempt.tick + 1) return { status: 'unknown' };
  if (attempt.kind === 'pickup') return pickupConfirmation(attempt, observation);
  if (!observation.events) return { status: 'unknown' };
  const source = attempt.kind === 'withdraw' ? attempt.target : attempt.unit;
  const target = attempt.kind === 'withdraw' ? attempt.unit : attempt.target;
  const amount = observation.events.filter(event => event.source === source && event.target === target && event.resource === attempt.resource)
    .reduce((total, event) => total + event.amount, 0);
  return boundedAmount(amount, attempt.amount);
}
function pickupConfirmation(attempt: TransferAttempt, observation: TransferObservation): TransferConfirmation {
  const { cargo, events } = observation;
  if (!events || events.some(event => event.resource === attempt.resource && (event.source === attempt.unit || event.target === attempt.unit))) return { status: 'unknown' };
  if (cargo === undefined) return { status: 'unknown' };
  return boundedAmount(cargo - attempt.cargoBefore, attempt.amount);
}
function boundedAmount(amount: number, maximum: number): TransferConfirmation {
  return Number.isSafeInteger(amount) && amount >= 0 && amount <= maximum
    ? { status: 'observed', amount } : { status: 'unknown' };
}


