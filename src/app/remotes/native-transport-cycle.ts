import { movementPosition } from '../../adapters/screeps/movement-traffic';
import type { StatePort } from '../../persistence/versioned-state';
import type { TaskDefinition, TaskRecord } from '../../persistence/tasks/schema';
import type { LogisticsRequest } from '../../capabilities/logistics/request';
import { logisticsPool } from '../../capabilities/logistics/request';
import type { RemoteTransportDemand } from '../../features/remotes/transport-authority';
import { createNativeHaulingTask } from '../native-hauling-task';
import { submitHaulingTask } from '../submit-hauling-task';
import { createTaskRunner } from '../task-runner';
import { settleHaulingTask } from '../settle-hauling-task';
import { observeTransfer } from '../../adapters/screeps/transfer-observation';
import { observeHauling } from '../../adapters/screeps/hauling-observation';
import type { createNativeDispatch } from '../native-dispatch';
import { eligibleRemoteActor } from './actor';
import type { RemoteActorBinding } from './actor';
import { createNativeRemoteBanking } from './native-banking';
import { createNativeRemoteTransportContext } from './native-transport-context';
import type { NativeRemoteTransportOptions } from './native-transport-context';
import type { RemoteTransportSource } from './native-transport-sources';
import { remoteTransportTasks } from './transport-tasks';
/** One already-recruited courier owns each trip; live source/sink pools and the existing journal arbitrate quantities. */
export function createNativeRemoteTransportCycle(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, binding: RemoteActorBinding,
  options: NativeRemoteTransportOptions, otherDefinitions: Readonly<Record<string,TaskDefinition>> = {}) {
  if (!binding.owner) throw new Error('Remote transport actor owner is required');
  const context = createNativeRemoteTransportContext(state,dispatch,binding,options);
  const bank = createNativeRemoteBanking(state,dispatch,binding.home,options,options.banking);
  const haul = createNativeHaulingTask(state,dispatch,context.route);
  const combined = { ...haul,handlers: (task: Readonly<TaskRecord>) => bank.owns(task) ? bank.definitions.haul.handlers(task) : haul.handlers(task) };
  const behaviors = { haul: combined }, definitions = { ...otherDefinitions,...behaviors };
  const tasks = remoteTransportTasks(state,definitions,binding.home), execute = createTaskRunner(state,behaviors,() => Game.time,definitions);
  const retire = (creep: Creep) => context.travel.retire(creep,binding.home,'remote-transport-return:' + creep.name);
  function existing(creep: Creep, task: TaskRecord, desired: RemoteTransportDemand | undefined): void {
    const payload = tasks.payload(task)!;
    settleHaulingTask(state,definitions,creep,observeTransfer);
    if (tasks.pending(creep.id)) return;
    if (!validTrip(payload.request,desired)) {
      tasks.cancel(creep.name,task); retire(creep); return;
    }
    if (!options.guard()) return;
    if (creep.store.getUsedCapacity() === 0 && !prepareCollection(creep,desired,task)) return;
    dispatch.activate(); execute(creep.name,creep);
    if (!tasks.head(creep.name)) tasks.close(task);
  }
  function prepareCollection(creep: Creep, demand: RemoteTransportDemand, task: TaskRecord): boolean {
    const view = context.source(creep,demand);
    if (!view) { tasks.cancel(creep.name,task); retire(creep); return false; }
    if (view.visible) return true;
    dispatch.activate(); dispatch.movement.move(creep,{ owner: binding.owner,destination: view.position,range: 1,policy: view.route });
    return false;
  }
  function recruitTrip(creep: Creep, demand: RemoteTransportDemand): void {
    const view = context.source(creep,demand);
    if (!view) { retire(creep); return; }
    if (!view.endpoint) {
      stage(creep,view); return;
    }
    const maximum = creep.store.getFreeCapacity(RESOURCE_ENERGY);
    if (maximum < 1) return;
    const sinks = context.sinks();
    for (const sink of sinks) {
      if (!options.guard()) return;
      if (admit(creep,demand,view.endpoint,sink,maximum)) {
        dispatch.activate(); execute(creep.name,creep); return;
      }
    }
    if (sinks.length) stage(creep,view);
  }
  function stage(creep: Creep, view: NonNullable<ReturnType<typeof context.source>>): void {
    const destination = view.endpoint ? movementPosition(view.endpoint.pos) : view.position;
    dispatch.activate(); dispatch.movement.move(creep,{ owner: binding.owner,destination,range: 1,policy: view.route });
  }
  function admit(creep: Creep, demand: RemoteTransportDemand, container: RemoteTransportSource, sink: AnyStructure, maximum: number): boolean {
    const expiresAt = Math.min(demand.expiresAt,Game.time + options.requestLifetime);
    const request = { id: logisticsPool('remote-trip',creep.id,sink.id,String(Game.time)),owner: context.owner(demand),source: container.id,
      sink: sink.id,resource: RESOURCE_ENERGY,quantity: maximum,priority: 0,expiresAt };
    const observed = observeHauling(creep,request,binding.home);
    const available = { ...observed,minimumCollection: Math.max(observed.minimumCollection,Math.min(options.minimumBatch,maximum)) };
    return submitHaulingTask(state,definitions,{ home: binding.home,name: creep.name,unitId: creep.id,tick: Game.time,request,
      phase: 'collect',maximum,sinkRoom: binding.home,available });
  }
  function validTrip(request: LogisticsRequest, desired: RemoteTransportDemand | undefined): desired is RemoteTransportDemand {
    return !!desired && request.owner === context.owner(desired) && !!context.authority(request) && !!Game.rooms[binding.home]?.controller?.my;
  }
  function processExisting(creep: Creep, head: TaskRecord | undefined, desired: RemoteTransportDemand | undefined): boolean {
    const payload = tasks.payload(head);
    if (!head || !payload || !context.owns(payload.request)) return false;
    existing(creep,head,desired); return true;
  }
  function idle(creep: Creep, desired: RemoteTransportDemand | undefined): void {
    if (!options.guard()) return;
    if (creep.store.getUsedCapacity() > 0 || !desired) { retire(creep); return; }
    recruitTrip(creep,desired);
  }
  return { definitions,run(creep: Creep, input?: RemoteTransportDemand): void {
    if (!eligibleRemoteActor(creep,binding)) return;
    const desired = context.current(input), head = tasks.head(creep.name);
    if (processExisting(creep,head,desired)) return;
    const mode = bank.prepare(creep,definitions);
    if (mode === 'bank') { execute(creep.name,creep); return; }
    if (mode === 'service' && !head) idle(creep,desired);
  } };
}
