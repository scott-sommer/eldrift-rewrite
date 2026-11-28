import { remoteBankingTask } from '../../banking-task';
import type { Journal } from '../../../../features/logistics/transfer-journal';
import { peekState } from '../../../../persistence/versioned-state';
import type { StatePort } from '../../../../persistence/versioned-state';
import { stateKey } from '../../../../persistence/state-key';
import { taskSchema } from '../../../../persistence/tasks/schema';
import { createTransferJournal } from '../../../../features/logistics/transfer-journal';
import { validateHaulingBinding } from '../../../settle-hauling-transfer';
import { resolvePaidCourierOpening,resolvePaidCourierBankingOpening } from '../motion-observation/opening';
import { paidCourierTaskProgress } from '../motion-observation/trip';
import { paidCourierStage } from '../motion-observation/stage';
import type { PaidCourierObservation } from '../motion-observation/model';
import type { EnergyInventoryFrame } from '../../../../capabilities/resources/energy-inventory/frame';
import type { Position } from '../../../../capabilities/movement/step';
import type { TransferAttempt,TransferObservation } from '../../../../capabilities/logistics/confirmation';
import { haulingDefinitions } from './opening';
import type { PaidHaulingForecastWorker } from './service';
export interface ForecastCourierPhysical { position: Position; fatigue: number; spawning: boolean }
/** Private owners and current physical effects feed the same opening resolver used by native qualification. */
export function readPaidHaulingForecastOpening(home: string,state: StatePort,inventory: EnergyInventoryFrame,worker: PaidHaulingForecastWorker,
  physical: ForecastCourierPhysical,observe: (attempt: TransferAttempt) => TransferObservation,recovering = false) {
  const task = readTask(home,state,worker), journal = readJournal(state,worker.unit), unit = inventory.observe(worker.unit);
  if (!unit) throw new Error('Forecast courier physical unavailable');
  const stage = paidCourierStage(physical.spawning,unit.energy,task,journal?.acknowledged === false)
    ?? recoveryStage(home,recovering,physical,unit.energy,task,journal);
  if (!stage) throw new Error('Forecast courier stage unavailable');
  const lifetime = worker.opening.observed;
  const opening: PaidCourierObservation = { observedAt: inventory.tick(),name: worker.name,unit: worker.unit,owner: lifetime.owner,
    position: physical.position,fatigue: physical.fatigue,energy: unit.energy,stage,
    activeAt: lifetime.activeAt,retireAt: lifetime.retireAt,expiresAt: lifetime.expiresAt,...(task ? { task } : {}),...(journal ? { journal } : {}) };
  const witness = pendingWitness(home,worker,task,journal,observe);
  const banking = recovering && task && remoteBankingTask(task.record,home);
  const resolved = banking ? resolvePaidCourierBankingOpening(home,opening,witness) : resolvePaidCourierOpening(opening,witness);
  if (resolved.status !== 'ready') throw new Error('Forecast courier opening: '+resolved.reason);
  return resolved.opening;
}
function readTask(home: string,state: StatePort,worker: PaidHaulingForecastWorker) {
  const queue = peekState(state,stateKey('tasks',worker.name),taskSchema(worker.name,haulingDefinitions))?.queue ?? [];
  if (queue.length > 1) throw new Error('Unsupported forecast task backlog');
  const task = queue[0] && paidCourierTaskProgress(state,home,worker.unit,queue[0]);
  if (queue.length && !task) throw new Error('Forecast task progress mismatch');
  return task;
}
function readJournal(state: StatePort,unit: string) {
  const journal = createTransferJournal(state,unit).peek();
  if (journal?.result?.status === 'unknown') throw new Error('Forecast courier journal unavailable');
  if (journal?.attempt && journal.attempt.unit !== unit) throw new Error('Forecast journal unit mismatch');
  return journal;
}
function pendingWitness(home: string,worker: PaidHaulingForecastWorker,task: PaidCourierObservation['task'],journal: Journal | undefined,
  observe: (attempt: TransferAttempt) => TransferObservation): TransferObservation | undefined {
  if (!journal?.attempt || journal.acknowledged) return undefined;
  if (!task) throw new Error('Forecast pending task unavailable');
  validateHaulingBinding(journal.attempt,{ home,unit: worker.unit,request: task.request });
  return observe(journal.attempt);
}

function recoveryStage(home: string,recovering: boolean,physical: ForecastCourierPhysical,energy: number,task: PaidCourierObservation['task'],journal: Journal | undefined) {
  const surplus = !task || task.remaining === 0 && remoteBankingTask(task.record,home);
  return recovering && !physical.spawning && energy > 0 && surplus && journal?.acknowledged !== false ? 'deliver' as const : undefined;
}
