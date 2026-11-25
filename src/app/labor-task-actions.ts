import { copyPlain } from '../core/plain-data';
import type { Outcome } from '../core/execution/model';
import { laborBody } from '../capabilities/economy/startup/household/labor/body';
import type { LaborTaskPayload } from '../features/work/labor-task';
import type { LaborTaskPorts, LaborActor } from './labor-task-model';
export function laborPickup<Context>(ports: LaborTaskPorts<Context>, payload: LaborTaskPayload, worker: LaborActor, context: Context, owner: string): Outcome {
  const state = payload.progress!, proposal = payload.proposal, tick = ports.now(context), due = proposal.observedAt+proposal.job.pickupAt;
  if (state.picked) return { status: 'transition',phase: 'loaded' };
  if (tick < due) return { status: 'running' };
  if (tick !== due) return failed('pickup-window');
  if (ports.pickup(context,copyPlain(payload),proposal.job.energy,owner)) state.pending = { kind: 'pickup',tick,before: worker.energy,maximum: proposal.job.energy };
  return { status: 'running' };
}
export function laborWork<Context>(ports: LaborTaskPorts<Context>, payload: LaborTaskPayload, worker: LaborActor, context: Context, owner: string): Outcome {
  const state = payload.progress!, proposal = payload.proposal, job = proposal.job;
  if (state.spent >= job.energy) return { status: 'transition',phase: 'return' };
  const tick = ports.now(context), start = proposal.observedAt+job.pickupAt+1+job.outboundTicks;
  if (tick < start) return { status: 'running' };
  if (tick >= start+job.workTicks || !worker.energy) return failed('work-window');
  const remaining = ports.remainingWork(context,copyPlain(proposal.input.order));
  if (remaining === undefined || remaining <= 0) return failed('target-changed');
  const rate = laborBody(worker.body,job.kind).rate, demand = job.kind === 'repair' ? Math.ceil(remaining/100) : remaining;
  const maximum = Math.min(worker.energy,rate,demand,job.energy-state.spent);
  if (ports.work(context,copyPlain(payload),maximum,owner)) state.pending = { kind: 'work',tick,before: worker.energy,maximum };
  return { status: 'running' };
}
export function laborDeposit<Context>(ports: LaborTaskPorts<Context>, payload: LaborTaskPayload, worker: LaborActor, context: Context, owner: string): Outcome {
  const state = payload.progress!, proposal = payload.proposal, job = proposal.job;
  const due = proposal.observedAt+job.pickupAt+1+job.outboundTicks+job.workTicks+job.returnTicks;
  if (ports.now(context) < due) return { status: 'running' };
  if (!worker.energy) {
    if (state.spent !== payload.proposal.job.energy) return failed('unfinished-work');
    ports.completed(context,{ ...state }); return { status: 'done' };
  }
  if (ports.deposit(context,copyPlain(payload),worker.energy,owner)) state.pending = { kind: 'return',tick: ports.now(context),before: worker.energy,maximum: worker.energy };
  return { status: 'running' };
}
function failed(reason: string): Outcome { return { status: 'failed',reason: 'labor-'+reason }; }
