import { copyPlain } from '../core/plain-data';
import type { Outcome } from '../core/execution/model';
import type { LaborTaskPayload } from '../features/work/labor-task';
import type { LaborTaskPorts, LaborActor } from './labor-task-model';
export function failLabor<Context>(ports: LaborTaskPorts<Context>, payload: LaborTaskPayload, context: Context, reason: string): Outcome {
  ports.failed?.(context,{ ...payload.progress! },copyPlain(payload),reason);
  return { status: 'failed',reason };
}
/** Refund only cargo reconciled to this task's confirmed pickup, never guessed external stock. */
export function unwindLabor<Context>(ports: LaborTaskPorts<Context>, payload: LaborTaskPayload, worker: LaborActor, context: Context, reason: string): Outcome {
  const state = payload.progress!;
  if (!worker.energy || worker.energy !== state.picked-state.spent-state.returned) return failLabor(ports,payload,context,reason);
  state.failure ??= { reason,tick: ports.now(context) };
  return { status: 'transition',phase: 'recover-return' };
}
export function refundLabor<Context>(ports: LaborTaskPorts<Context>, payload: LaborTaskPayload, worker: LaborActor, context: Context, owner: string): Outcome {
  if (!worker.energy) return failLabor(ports,payload,context,payload.progress!.failure!.reason);
  if (ports.deposit(context,copyPlain(payload),worker.energy,owner)) payload.progress!.pending = { kind: 'return',tick: ports.now(context),before: worker.energy,maximum: worker.energy };
  return { status: 'running' };
}
