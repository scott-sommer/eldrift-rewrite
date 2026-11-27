import { paidCourierStage } from './stage';
import { copyPlain } from '../../../../core/plain-data';
import { movementPosition } from '../../../../adapters/screeps/movement-traffic';
import { peekState } from '../../../../persistence/versioned-state';
import type { StatePort } from '../../../../persistence/versioned-state';
import { taskSchema } from '../../../../persistence/tasks/schema';
import { validHaulingPayload } from '../../../hauling-task';
import { createTransferJournal } from '../../../../features/logistics/transfer-journal';
import { createRemoteAssignmentStore } from '../../../../features/remotes/assignment-store';
import { paidCourierMatches } from './identity';
import { observePaidCourierTask } from './trip';
import { validPaidCourierJournal } from './journal';
import type { PaidCourierContext,PaidCourierResult } from './model';
const definitions = { haul: { phases: ['work'],validPayload: validHaulingPayload } };
/** Observe existing owners only: no task admission, settlement, acknowledgement or namespace initialization. */
export function createNativePaidCourierObservation(state: StatePort) {
  return (context: PaidCourierContext,guard: () => boolean = () => true): PaidCourierResult => {
    if (!guard()) return { status: 'deferred',reason: 'budget' };
    const creep = Game.creeps[context.paid.request];
    if (!creep || !paidCourierMatches(context,creep,Game.time)) return { status: 'deferred',reason: 'paid-courier-identity' };
    try { return observe(state,context,creep,guard); } catch { return { status: 'deferred',reason: 'paid-courier-state' }; }
  };
}
function observe(state: StatePort,context: PaidCourierContext,creep: Creep,guard: () => boolean): PaidCourierResult {
  const lease = createRemoteAssignmentStore(state).owner(context.cohort.room,Game.time);
  if (!lease || lease.home !== context.cohort.home || lease.generation !== context.cohort.generation || !lease.plan.sources.includes(context.cohort.source)) return { status: 'deferred',reason: 'paid-courier-authority' };
  const queue = peekState(state,'tasks/'+creep.name,taskSchema(creep.name,definitions))?.queue ?? [];
  if (queue.length > 1) return { status: 'deferred',reason: 'paid-courier-backlog' };
  const task = queue[0] && observePaidCourierTask(state,context,creep,queue[0]);
  if (queue.length && !task) return { status: 'deferred',reason: 'paid-courier-task' };
  const journal = createTransferJournal(state,creep.id).peek();
  if (!validPaidCourierJournal(context,creep.id,journal,task,Game.time)) return { status: 'deferred',reason: 'paid-courier-journal' };
  const stage = paidCourierStage(creep.spawning,creep.store.energy,task,journal?.acknowledged === false);
  if (!stage) return { status: 'deferred',reason: 'paid-courier-cargo' };
  if (!guard()) return { status: 'deferred',reason: 'budget' };
  return { status: 'ready',observation: copyPlain({ observedAt: Game.time,name: creep.name,unit: creep.id,owner: context.paid.owner,position: movementPosition(creep.pos),
    energy: creep.store.energy,fatigue: creep.fatigue,activeAt: context.paid.activeAt,expiresAt: context.paid.expiresAt,retireAt: context.paid.retireAt,stage,...(task ? { task } : {}),...(journal ? { journal } : {}) }) };
}
