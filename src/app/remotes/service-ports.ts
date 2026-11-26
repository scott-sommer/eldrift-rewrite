import { peekState } from '../../persistence/versioned-state';
import { taskSchema } from '../../persistence/tasks/schema';
import type { TaskDefinition } from '../../persistence/tasks/schema';
import type { StatePort } from '../../persistence/versioned-state';
import type { Position } from '../../capabilities/movement/step';
import type { LogisticsRequest } from '../../capabilities/logistics/request';
import { validHaulingPayload } from '../hauling-task';
import type { HaulingTaskPayload } from '../hauling-task';
import { createRemoteAssignmentStore } from '../../features/remotes/assignment-store';
import { remoteFleetIdentity } from '../../features/remotes/fleet/identity';
import { transportToken } from '../../features/remotes/transport-authority';
/** Transient home-port access from current owned tasks/leases, never a new persistent reservation ledger. */
export function createNativeRemoteServicePorts(state: StatePort, definitions: Readonly<Record<string,TaskDefinition>>) {
  const assignments = createRemoteAssignmentStore(state);
  return () => {
    const facts = Object.values(Game.creeps).flatMap(creep => { const fact = observe(creep); return fact ? [fact] : []; });
    const active = new Set(facts.filter(fact => fact.active).map(fact => fact.key));
    return [...active].map(key => { const group = facts.filter(fact => fact.key === key); return { owner: 'remote-service:'+key,position: group[0]!.position,allowed: group.map(fact => fact.name) }; });
  };
  function observe(creep: Creep) {
    if (!eligibleCourier(creep)) return undefined;
    const payload = serviceTask(state,creep,definitions); if (!payload || !authorized(creep,payload,assignments)) return undefined;
    const position = deposit(payload.request,payload.home); if (!position) return undefined;
    return { name: creep.name,position,key: JSON.stringify(position),active: creep.store.energy > 0 && creep.getActiveBodyparts(MOVE) > 0 && near(creep,position) };
  }
}
function serviceTask(state: StatePort, creep: Creep, definitions: Readonly<Record<string,TaskDefinition>>): HaulingTaskPayload | undefined {
  const task = peekState(state,'tasks/'+creep.name,taskSchema(creep.name,definitions))?.queue[0];
  if (task?.kind !== 'haul' || task.phase !== 'work' || task.expiresAt <= Game.time || !validHaulingPayload(task.payload)) return undefined;
  return task.payload.unitId === creep.id && task.payload.home === creep.memory.population?.home ? task.payload : undefined;
}
function authorized(creep: Creep, payload: HaulingTaskPayload, assignments: ReturnType<typeof createRemoteAssignmentStore>): boolean {
  const token = transportToken(payload.request); if (!token || token.actor !== creep.memory.population?.owner || token.home !== payload.home) return false;
  const demand = assignments.resolve(token,Game.time), identity = remoteFleetIdentity(token.actor);
  return demand?.kind === 'mine' && demand.home === payload.home && identity?.source === demand.source && identity.room === demand.room;
}
function deposit(request: LogisticsRequest, home: string): Position | undefined {
  const position = request.service?.deposit;
  if (request.resource !== 'energy' || request.expiresAt <= Game.time || position?.room !== home || !Game.rooms[home]?.controller?.my) return undefined;
  const sink = Game.getObjectById(request.sink as Id<StructureStorage | StructureTerminal | StructureContainer>);
  return validSink(sink,position) ? { ...position } : undefined;
}
function validSink(sink: StructureStorage | StructureTerminal | StructureContainer | null, point: Position): boolean {
  return !!sink && ['storage','terminal','container'].includes(sink.structureType) && (sink.structureType === 'container' || sink.my) && sink.pos.roomName === point.room && sink.isActive()
    && sink.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && Math.max(Math.abs(sink.pos.x-point.x),Math.abs(sink.pos.y-point.y)) === 1;
}
function near(creep: Creep, point: Position): boolean { return creep.pos.roomName === point.room && Math.max(Math.abs(creep.pos.x-point.x),Math.abs(creep.pos.y-point.y)) <= 3; }

function eligibleCourier(creep: Creep): boolean {
  const identity = remoteFleetIdentity(creep.memory.population?.owner ?? '');
  return creep.my && !creep.spawning && identity?.kind === 'courier' && identity.home === creep.memory.population?.home;
}
