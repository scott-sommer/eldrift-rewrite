import { openState, saveState } from '../../persistence/versioned-state';
import type { StatePort } from '../../persistence/versioned-state';
import { stateKey } from '../../persistence/state-key';
import { peekTaskHead } from '../../persistence/tasks/head';
import { taskSchema } from '../../persistence/tasks/schema';
import type { TaskDefinition } from '../../persistence/tasks/schema';
import { createReservationCleanup } from '../../persistence/reservation-cleanup';
import { taskScope } from '../../persistence/tasks/scope';
import { laborTaskDefinition, validateStagedLaborTask } from '../../features/work/labor-task';
import type { LaborTaskPayload } from '../../features/work/labor-task';
import { initialLaborProgress } from '../../features/work/labor-progress';
import { settleLaborIntent } from '../labor-task-settlement';
import type { LaborActor } from '../labor-task-model';
import { nativeLaborActor } from './facts';
import { recordNativeLaborFailure } from './receipt';
import type { EmpireFeature } from '../runtime-model';
/** Owned-room execution cannot observe a surviving actor after its home is lost. */
export function createNativeLaborLossFeature(state: StatePort, definitions: Readonly<Record<string,TaskDefinition>>): EmpireFeature {
  return { id: 'labor-home-loss',scope: 'empire',urgency: 'urgent',interval: 1,run() {
    for (const creep of Object.values(Game.creeps)) if (creep.my && !creep.spawning) settleLostLaborHome(state,definitions,creep);
  } };
}
export function settleLostLaborHome(state: StatePort, definitions: Readonly<Record<string,TaskDefinition>>, creep: Creep): boolean {
  if (peekTaskHead(state,creep.name)?.kind !== 'household-labor') return false;
  const key = stateKey('tasks',creep.name), schema = taskSchema(creep.name,{ ...definitions,'household-labor': laborTaskDefinition });
  const tasks = openState(state,key,schema), task = tasks.queue[0]!, payload = task.payload as LaborTaskPayload;
  validateStagedLaborTask(task,creep.name);
  if (!confirmedLostHome(payload.proposal.input.request.room)) return false;
  const worker = nativeLaborActor(creep)!, progress = payload.progress ??= initialLaborProgress();
  if (!matchesLaborOwner(worker,payload)) return false;
  progress.worker ??= worker.id;
  const settled = settleLaborIntent(payload,worker,Game.time);
  if (settled === 'waiting') return false;
  const reason = lossReason(payload,worker,settled);
  recordNativeLaborFailure(creep,progress,payload,reason);
  tasks.queue.shift(); saveState(state,key,schema,tasks);
  createReservationCleanup(state).releaseScope(taskScope(creep.name,task.id));
  return true;
}

function confirmedLostHome(home: string): boolean {
  const room = Game.rooms[home]; return !!room?.controller && !room.controller.my;
}
function matchesLaborOwner(worker: LaborActor, payload: LaborTaskPayload): boolean {
  const request = payload.proposal.input.request, previous = payload.progress?.worker;
  return worker.name === request.name && worker.owner === request.owner && (!previous || previous === worker.id);
}
function lossReason(payload: LaborTaskPayload, worker: LaborActor, settled: 'settled' | 'invalid'): string {
  const progress = payload.progress!;
  return settled === 'invalid' || worker.energy !== progress.picked-progress.spent-progress.returned ? 'labor-settlement' : 'labor-home-lost';
}
