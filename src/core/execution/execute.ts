import type { ExecutionResult, ExecutionState, Handlers, Outcome } from './model';
function blocked(state: ExecutionState, outcome: Extract<Outcome, { status: 'blocked' }>, tick: number, retryLimit: number): ExecutionResult['outcome'] {
  if (!Number.isSafeInteger(outcome.retryAt) || outcome.retryAt <= tick) return { status: 'failed', reason: 'invalid-retry-tick' };
  state.retries++;
  if (state.retries > retryLimit) return { status: 'failed', reason: 'retry-limit' };
  state.wakeAt = outcome.retryAt;
  return outcome;
}
export function execute<Context>(saved: ExecutionState, handlers: Handlers<Context>, context: Context, tick: number, maximum = 4, retryLimit = 5): ExecutionResult {
  if (!Number.isSafeInteger(maximum) || maximum < 1) throw new Error('Invalid transition limit');
  if (!Number.isSafeInteger(retryLimit) || retryLimit < 0) throw new Error('Invalid retry limit');
  const state = { ...saved };
  if (tick >= state.expiresAt) return { state, outcome: { status: 'failed', reason: 'expired' }, steps: 0 };
  if (tick < state.wakeAt) return { state, outcome: { status: 'blocked', retryAt: state.wakeAt, reason: 'sleeping' }, steps: 0 };
  for (let steps = 1; steps <= maximum; steps++) {
    if (!Object.hasOwn(handlers, state.phase)) return { state, outcome: { status: 'failed', reason: 'unknown-phase' }, steps: steps - 1 };
    const outcome = handlers[state.phase]!(context);
    if (outcome.status === 'transition') {
      state.phase = outcome.phase;
      continue;
    }
    return { state, outcome: outcome.status === 'blocked' ? blocked(state, outcome, tick, retryLimit) : outcome, steps };
  }
  return { state, outcome: { status: 'running' }, steps: maximum };
}
