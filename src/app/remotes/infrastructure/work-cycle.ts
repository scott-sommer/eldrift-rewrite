import { createTransferJournal } from '../../../features/logistics/transfer-journal';
import { settleRemoteFleetTransfers } from '../fleet/confirmations';
import type { StatePort } from '../../../persistence/versioned-state';
import { peekState } from '../../../persistence/versioned-state';
import { stateKey } from '../../../persistence/state-key';
import { taskSchema } from '../../../persistence/tasks/schema';
import type { TaskDefinition } from '../../../persistence/tasks/schema';
import type { RemoteOutpostDemand } from '../../../features/remotes/infrastructure/model';
import type { createNativeDispatch } from '../../native-dispatch';
import { createTaskRunner } from '../../task-runner';
import { cancelTask } from '../../cancel-task';
import { assignRemoteTask } from '../assign-task';
import { createRemoteTaskBehavior } from '../task';
import { eligibleRemoteActor } from '../actor';
import type { RemoteActorBinding } from '../actor';
import { createNativeRemoteBanking } from '../native-banking';
import type { NativeRemoteOptions } from '../native-movement';
import { createNativeRemoteOutpostService } from './outpost-service';
import type { RemoteConstructionSupply } from './outpost-service';
/** Active builders may leave home with collected energy; only withdrawn/finished service invokes cargo banking. */
export function createNativeRemoteWorkCycle(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, binding: RemoteActorBinding,
  options: NativeRemoteOptions, supply: RemoteConstructionSupply, otherDefinitions: Readonly<Record<string,TaskDefinition>> = {}) {
  if (!binding.owner) throw new Error('Remote construction actor owner is required');
  const service = createNativeRemoteOutpostService(state,dispatch,options,supply), bank = createNativeRemoteBanking(state,dispatch,binding.home,options);
  const behaviors = { 'remote-work': createRemoteTaskBehavior(state,'outpost',service),...bank.definitions }, definitions = { ...otherDefinitions,...behaviors };
  const execute = createTaskRunner(state,behaviors,() => Game.time,definitions);
  const head = (creep: Creep) => peekState(state,stateKey('tasks',creep.name),taskSchema(creep.name,definitions))?.queue[0];
  function banking(creep: Creep): void {
    const current = head(creep);
    if (current?.kind === 'remote-work') cancelTask(state,creep.name,current.id,definitions);
    if (head(creep) && head(creep)?.kind !== 'haul') return;
    const mode = bank.prepare(creep,definitions);
    if (mode === 'bank') { dispatch.activate(); execute(creep.name,creep); }
    else if (mode === 'service') service.retire(creep,binding.home,'remote-work-return:'+creep.name);
  }
  function ready(creep: Creep, demand: RemoteOutpostDemand | undefined): demand is RemoteOutpostDemand {
    return demand?.home === binding.home && service.available(creep,demand) && creep.store.getUsedCapacity() === creep.store.energy;
  }
  function mustBank(creep: Creep): boolean { return head(creep)?.kind === 'haul' || pendingTransfer(state,creep.id); }
  return { definitions,
    run(creep: Creep, demand?: RemoteOutpostDemand): void {
      if (!eligibleRemoteActor(creep,binding)) return;
      settleRemoteFleetTransfers(state,[creep],definitions);
      if (mustBank(creep)) { banking(creep); return; }
      if (!options.guard()) return;
      if (!ready(creep,demand)) { banking(creep); return; }
      const current = head(creep);
      if (current && current.kind !== 'remote-work') return;
      assignRemoteTask(state,definitions,'remote-work',creep.name,demand,Game.time,taskLifetime(creep));
      if (!options.guard()) return;
      dispatch.activate(); execute(creep.name,creep);
    },
  };
}

function taskLifetime(creep: Creep): number { return Math.max(1,creep.ticksToLive ?? 1); }
function pendingTransfer(state: StatePort, id: string): boolean {
  if (state.read(stateKey('logistics-attempts',id)) === undefined) return false;
  const journal = createTransferJournal(state,id).read();
  return !journal.acknowledged || journal.result?.status === 'unknown';
}
