import type { StatePort } from '../../../persistence/versioned-state';
import { peekState } from '../../../persistence/versioned-state';
import { stateKey } from '../../../persistence/state-key';
import { taskSchema } from '../../../persistence/tasks/schema';
import type { TaskDefinition } from '../../../persistence/tasks/schema';
import type { createNativeDispatch } from '../../native-dispatch';
import { createTaskRunner } from '../../task-runner';
import { cancelTask } from '../../cancel-task';
import { createNativeReservationService } from '../native-reservation-service';
import { createReservationTaskBehavior } from '../reservation-task';
import type { ReservationDemand } from '../reservation-task';
import { assignReservationTask } from '../assign-reservation-task';
import { eligibleRemoteActor } from '../actor';
import type { RemoteActorBinding } from '../actor';
import type { NativeRemoteOptions } from '../native-movement';
/** CLAIM/MOVE service uses the shared task/controller/movement owners and carries no cargo state. */
export function createNativeReservationCycle(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, binding: RemoteActorBinding, options: NativeRemoteOptions, otherDefinitions: Readonly<Record<string,TaskDefinition>>) {
  const service = createNativeReservationService(state,dispatch,options), behaviors = { reserve: createReservationTaskBehavior(state,service) };
  const definitions = { ...otherDefinitions,...behaviors }, execute = createTaskRunner(state,behaviors,() => Game.time,definitions);
  const head = (creep: Creep) => peekState(state,stateKey('tasks',creep.name),taskSchema(creep.name,definitions))?.queue[0];
  function prepare(creep: Creep, demand?: ReservationDemand): boolean {
    const current = head(creep);
    if (current && current.kind !== 'reserve') return false;
    if (!demand && current) cancelTask(state,creep.name,current.id,definitions);
    if (demand?.home === binding.home) assignReservationTask(state,definitions,creep.name,demand,Game.time,creep.ticksToLive ?? 1);
    return true;
  }
  return { run(creep: Creep, demand?: ReservationDemand): void {
    if (!eligibleRemoteActor(creep,binding) || !prepare(creep,demand)) return;
    if (head(creep)) execute(creep.name,creep);
    else service.retire(creep,binding.home,'remote-return:'+creep.name);
  } };
}
