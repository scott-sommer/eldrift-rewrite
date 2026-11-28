import { remoteBankingTask as bankingTask } from './banking-task';
import type { StatePort } from '../../persistence/versioned-state';
import { peekState } from '../../persistence/versioned-state';
import { stateKey } from '../../persistence/state-key';
import type { TaskDefinition, TaskRecord } from '../../persistence/tasks/schema';
import { taskSchema } from '../../persistence/tasks/schema';
import { roomCoordinates } from '../../core/geometry/room-grid';
import { createTransferJournal } from '../../features/logistics/transfer-journal';
import { createLogisticsRequests } from '../../features/logistics/request-store';
import { observeTransfer } from '../../adapters/screeps/transfer-observation';
import { createNativeHaulingTask } from '../native-hauling-task';
import type { HaulingTaskPayload } from '../hauling-task';
import { recoverNativeCargo } from '../native-cargo-recovery';
import { settleHaulingTask } from '../settle-hauling-task';
import { cancelTask } from '../cancel-task';
import { taskScope } from '../task-runner';
import type { createNativeDispatch } from '../native-dispatch';
import { createNativeRemoteMovement } from './native-movement';
import type { NativeRemoteOptions } from './native-movement';
export interface NativeRemoteBankingPolicy {
  readonly terminalReserve: number;
  readonly acceptsResource?: (resource: ResourceConstant) => boolean;
  readonly acceptsSink?: (sink: AnyStructure) => boolean;
}
export type RemoteBankingMode = 'service' | 'bank' | 'hold';
/** A home-local recovery adapter; quantity booking, intents and credit stay in the shared hauling owners. */
export function createNativeRemoteBanking(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, home: string, options: NativeRemoteOptions, inputPolicy: NativeRemoteBankingPolicy = { terminalReserve: 0 }) {
  roomCoordinates(home);
  const policy = { ...inputPolicy };
  if (!Number.isSafeInteger(policy.terminalReserve) || policy.terminalReserve < 0) throw new Error('Invalid remote banking terminal reserve');
  const travel = createNativeRemoteMovement(state,dispatch,options);
  const hauling = createNativeHaulingTask(state,dispatch,{ version: 'remote-banking:' + home,
    maximumRooms: 1,allowedRooms: [home],blockedRooms: [],costs: {} });
  const behavior = { ...hauling,handlers: (task: Readonly<TaskRecord>) => ({ work: (creep: Creep) => {
    const payload = task.payload as HaulingTaskPayload;
    if (!bankingTask(task,home)) return { status: 'running' as const };
    if (!Game.rooms[home]?.controller?.my) {
      createLogisticsRequests(state,home).cancel(payload.request.owner,payload.request.id);
      return { status: 'failed' as const,reason: 'banking-home-lost' };
    }
    if (creep.pos.roomName !== home) {
      travel.retire(creep,home,taskScope(creep.name,task.id));
      return { status: 'running' as const };
    }
    if (!travel.route(creep,home,home)) return { status: 'running' as const };
    dispatch.activate(); return hauling.handlers(task).work!(creep);
  } }) };
  function queue(creep: Creep, definitions: Readonly<Record<string,TaskDefinition>>): TaskRecord[] {
    return peekState(state,stateKey('tasks',creep.name),taskSchema(creep.name,definitions))?.queue ?? [];
  }
  function priorWork(creep: Creep, head: TaskRecord | undefined, definitions: Readonly<Record<string,TaskDefinition>>): RemoteBankingMode | undefined {
    if (!head || head.kind !== 'haul') return undefined;
    if (!bankingTask(head,home)) return 'hold';
    settleHaulingTask(state,definitions,creep,observeTransfer); return 'bank';
  }
  function admission(creep: Creep, tasks: TaskRecord[], interruptKinds: readonly string[]): RemoteBankingMode | undefined {
    if (unsettled(state,creep.id)) return 'hold';
    if (creep.store.getUsedCapacity() === 0 || !interior(creep,home)) return 'service';
    if (!preemptible(tasks,interruptKinds)) return 'service';
    if (!Game.rooms[home]?.controller?.my || !travel.route(creep,home,home)) return 'hold';
    return undefined;
  }
  return { definitions: { haul: behavior },owns: (task: Readonly<TaskRecord>) => Boolean(bankingTask(task,home)),
    prepare(creep: Creep, definitions: Readonly<Record<string,TaskDefinition>>, interruptKinds: readonly string[] = []): RemoteBankingMode {
      if (!bankActor(creep,home)) return 'hold';
      const tasks = queue(creep,definitions);
      const mode = priorWork(creep,tasks[0],definitions) ?? admission(creep,tasks,interruptKinds);
      if (mode) return mode;
      const head = tasks[0];
      if (head) cancelTask(state,creep.name,head.id,definitions);
      if (queue(creep,definitions).length) return 'hold';
      recoverNativeCargo(state,definitions,creep,home,policy.terminalReserve,policy.acceptsResource,policy.acceptsSink);
      return queue(creep,definitions).length > 0 ? 'bank' : 'hold';
    },
  };
}
function unsettled(state: StatePort, unit: string): boolean {
  if (state.read(stateKey('logistics-attempts',unit)) === undefined) return false;
  const journal = createTransferJournal(state,unit).read();
  return !journal.acknowledged || journal.result?.status === 'unknown';
}
function interior(creep: Creep, home: string): boolean {
  return creep.pos.roomName === home && creep.pos.x > 0 && creep.pos.x < 49 && creep.pos.y > 0 && creep.pos.y < 49;
}

function bankActor(creep: Creep, home: string): boolean {
  return creep.my && !creep.spawning && creep.memory.population?.home === home;
}
function preemptible(tasks: TaskRecord[], kinds: readonly string[]): boolean {
  return tasks.length === 0 || tasks.length === 1 && kinds.includes(tasks[0]!.kind);
}
