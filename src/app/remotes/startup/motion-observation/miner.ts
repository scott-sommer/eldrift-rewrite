import { copyPlain } from '../../../../core/plain-data';
import { movementPosition } from '../../../../adapters/screeps/movement-traffic';
import { withinRange } from '../../../../capabilities/movement/path-model';
import { stationTile } from '../../../../capabilities/mining/station';
import { peekState } from '../../../../persistence/versioned-state';
import type { StatePort } from '../../../../persistence/versioned-state';
import { taskSchema } from '../../../../persistence/tasks/schema';
import type { TaskRecord } from '../../../../persistence/tasks/schema';
import { reservationSchema } from '../../../../persistence/reservations/schema';
import { remoteTaskDefinition } from '../../task';
import type { RemoteTaskPayload } from '../../task';
import { taskScope } from '../../../task-runner';
import { createRemoteAssignmentStore } from '../../../../features/remotes/assignment-store';
import { paidRemoteUnitMatches } from './identity';
import { paidSourceLeaseCurrent } from './scope';
import type { PaidUnitContext } from './model';
import type { PaidMinerResult } from './source-model';
const definitions = { 'remote-mine': remoteTaskDefinition };
export function createNativePaidMinerObservation(state: StatePort) {
  return (context: PaidUnitContext,guard: () => boolean = () => true): PaidMinerResult => {
    if (!guard()) return { status: 'deferred',reason: 'budget' };
    const creep = Game.creeps[context.paid.request];
    if (!creep || !paidRemoteUnitMatches(context,creep,Game.time,'miner')) return { status: 'deferred',reason: 'paid-miner-identity' };
    try { return observe(state,context,creep,guard); } catch { return { status: 'deferred',reason: 'paid-miner-state' }; }
  };
}
function observe(state: StatePort,context: PaidUnitContext,creep: Creep,guard: () => boolean): PaidMinerResult {
  if (!paidSourceLeaseCurrent(state,context)) return { status: 'deferred',reason: 'paid-miner-authority' };
  const queue = peekState(state,'tasks/'+creep.name,taskSchema(creep.name,definitions))?.queue ?? [];
  if (queue.length > 1) return { status: 'deferred',reason: 'paid-miner-backlog' };
  const task = queue[0];
  if (task && !validTask(state,context,task)) return { status: 'deferred',reason: 'paid-miner-task' };
  if (creep.spawning && task || !task && creep.store.energy > 0) return { status: 'deferred',reason: 'paid-miner-phase' };
  const resource = 'mining-tile:'+stationTile(context.plan.station);
  const claim = peekState(state,'reservations/empire',reservationSchema)?.claims.find(claim => claim.resource === resource && claim.expiresAt > Game.time) ?? null;
  const scope = task ? taskScope(creep.name,task.id) : undefined;
  const assigned = claim?.holder === creep.name && claim.scope === scope;
  const stage = stageOf(creep,context,task);
  if (!guard()) return { status: 'deferred',reason: 'budget' };
  return { status: 'ready',observation: copyPlain({ observedAt: Game.time,name: creep.name,unit: creep.id,owner: context.paid.owner,position: movementPosition(creep.pos),energy: creep.store.energy,fatigue: creep.fatigue,
    activeAt: context.paid.activeAt,expiresAt: context.paid.expiresAt,retireAt: context.paid.retireAt,stage,assigned,claim,...(task ? { task: { record: task,id: task.id,wakeAt: task.wakeAt,expiresAt: task.expiresAt,scope: scope! } } : {}) }) };
}
function validTask(state: StatePort,context: PaidUnitContext,task: TaskRecord): boolean {
  const payload = task.payload as RemoteTaskPayload;
  if (payload.home !== context.cohort.home || payload.token.generation !== context.cohort.generation || task.expiresAt <= Game.time) return false;
  const demand = createRemoteAssignmentStore(state).resolve(payload.token,Game.time);
  return demand?.kind === 'mine' && demand.home === context.cohort.home && demand.room === context.cohort.room && demand.source === context.cohort.source;
}
function stageOf(creep: Creep,context: PaidUnitContext,task: TaskRecord | undefined): 'spawning' | 'idle' | 'station' | 'approach' {
  if (creep.spawning) return 'spawning';
  if (!task) return 'idle';
  return withinRange(movementPosition(creep.pos),context.plan.station,0) ? 'station' : 'approach';
}
