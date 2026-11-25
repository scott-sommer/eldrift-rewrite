import { copyPlain } from '../core/plain-data';
import type { Outcome } from '../core/execution/model';
import type { Position } from '../capabilities/movement/step';
import { initialLaborProgress } from '../features/work/labor-progress';
import { laborTaskDefinition } from '../features/work/labor-task';
import type { LaborTaskPayload } from '../features/work/labor-task';
import { taskScope } from '../persistence/tasks/scope';
import type { TaskBehavior } from './task-runner';
import type { LaborTaskPorts, LaborActor } from './labor-task-model';
import { settleLaborIntent } from './labor-task-settlement';
import { laborPickup, laborWork, laborDeposit } from './labor-task-actions';
/** Effects must use the caller's shared action admission; this behavior owns only its task lifecycle. */
export function createLaborTaskBehavior<Context>(ports: LaborTaskPorts<Context>): TaskBehavior<Context> {
  return { ...laborTaskDefinition,handlers(task) {
    const payload = task.payload as LaborTaskPayload, proposal = payload.proposal;
    payload.progress ??= initialLaborProgress();
    const owner = taskScope(proposal.input.request.name,task.id);
    function guarded(context: Context, action: (worker: LaborActor) => Outcome): Outcome {
      const worker = ports.worker(context);
      if (!validWorker(worker,payload) || !ports.authorized(context,copyPlain(payload))) return failed('authority');
      const state = payload.progress!; state.worker ??= worker.id;
      const settled = settleLaborIntent(payload,worker,ports.now(context));
      if (settled === 'waiting') return { status: 'running' };
      if (settled === 'invalid' || worker.energy !== state.picked-state.spent-state.returned) return failed('settlement');
      return action(worker);
    }
    function travel(context: Context, destination: Position, next: string): Outcome {
      return guarded(context,worker => {
        if (samePosition(worker.position,destination)) return { status: 'transition',phase: next };
        ports.move(context,destination,owner); return { status: 'running' };
      });
    }
    return {
      'await-birth': context => guarded(context,() => ({ status: 'transition',phase: 'approach' })),
      approach: context => travel(context,proposal.input.pickup,'pickup'),
      pickup: context => guarded(context,worker => laborPickup(ports,payload,worker,context,owner)),
      loaded: context => travel(context,proposal.input.service,'work'),
      work: context => guarded(context,worker => laborWork(ports,payload,worker,context,owner)),
      return: context => travel(context,proposal.input.pickup,'deposit'),
      deposit: context => guarded(context,worker => laborDeposit(ports,payload,worker,context,owner)),
    };
  } };
}
function validWorker(worker: LaborActor | undefined, payload: LaborTaskPayload): worker is LaborActor {
  const request = payload.proposal.input.request, previous = payload.progress!.worker;
  return !!worker && !worker.spawning && worker.name === request.name && worker.owner === request.owner
    && (!previous || previous === worker.id) && JSON.stringify(worker.body) === JSON.stringify(request.body);
}
function samePosition(a: Position, b: Position): boolean { return a.room === b.room && a.x === b.x && a.y === b.y; }
function failed(reason: string): Outcome { return { status: 'failed',reason: 'labor-'+reason }; }
