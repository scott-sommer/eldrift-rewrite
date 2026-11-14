import type { ExecutionState } from './model';
function nonnegative(value: unknown): boolean {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
export function validExecution(value: Partial<ExecutionState>): value is ExecutionState {
  return typeof value.phase === 'string' && value.phase.length > 0
    && nonnegative(value.wakeAt) && nonnegative(value.expiresAt) && nonnegative(value.retries);
}
