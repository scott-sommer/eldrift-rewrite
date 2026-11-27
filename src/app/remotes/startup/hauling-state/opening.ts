import { copyPlain } from '../../../../core/plain-data';
import { validateHaulingBinding } from '../../../settle-hauling-transfer';
import { taskSchema } from '../../../../persistence/tasks/schema';
import { validHaulingPayload } from '../../../hauling-task';
import { delivered } from '../../../../features/logistics/request-schema';
import type { LogisticsRecord } from '../../../../features/logistics/request-schema';
import { schema as journalSchema } from '../../../../features/logistics/transfer-journal';
import type { Journal } from '../../../../features/logistics/transfer-journal';
import type { PaidCourierOpening } from '../motion-observation/opening-model';
import { resolvePaidCourierOpening } from '../motion-observation/opening';
import type { TaskRecord } from '../../../../persistence/tasks/schema';
export interface NormalizedHaulingOpening { task: TaskRecord | null; request?: LogisticsRecord; journal?: Journal }
export const haulingDefinitions = { haul: { phases: ['work'],validPayload: validHaulingPayload } };
/** Reflected native effects become private settlement evidence, never another physical effect. */
export function normalizeHaulingOpening(home: string, room: string, raw: PaidCourierOpening): NormalizedHaulingOpening {
  const opening = copyPlain(raw), observed = opening.observed;
  const journal = observed.journal;
  if (journal?.result?.status === 'unknown') throw new Error('Forecast unknown journal');
  if (journal && !journalSchema.valid(journal)) throw new Error('Invalid forecast journal');
  if (journal?.attempt && journal.attempt.unit !== observed.unit) throw new Error('Forecast journal unit mismatch');
  const task = taskRecord(home, opening);
  if (journal && !journal.acknowledged) validatePending(home, room, opening);
  applyReflected(opening);
  const resolved = resolvePaidCourierOpening(opening.observed);
  if (resolved.status !== 'ready' || JSON.stringify(resolved.opening.continuation) !== JSON.stringify(opening.continuation)) {
    throw new Error('Forecast continuation mismatch');
  }
  const request = openingRequest(opening);
  return { task,...(request ? { request } : {}),...(journal ? { journal } : {}) };
}
function taskRecord(home: string, opening: PaidCourierOpening): TaskRecord | null {
  const observed = opening.observed, task = observed.task;
  if (!task) {
    if (!['idle','spawning'].includes(observed.stage) || observed.energy !== 0) throw new Error('Forecast missing hauling task');
    return null;
  }
  const record = task.record;
  if (!taskSchema(observed.name, haulingDefinitions).valid({ unit: observed.name,queue: [record] })) throw new Error('Invalid forecast task');
  const payload = record.payload;
  if (!validHaulingPayload(payload) || payload.home !== home || payload.unitId !== observed.unit) throw new Error('Forecast task identity mismatch');
  validateTaskSummary(opening);
  if (JSON.stringify(payload.request) !== JSON.stringify(task.request)) throw new Error('Forecast task request mismatch');
  if (task.remaining !== task.request.quantity-delivered({ request: task.request,cancelled: false,receipts: task.receipts })) {
    throw new Error('Forecast request progress mismatch');
  }
  return record;
}
function validatePending(home: string, room: string, opening: PaidCourierOpening): void {
  const observed = opening.observed, attempt = observed.journal!.attempt, task = observed.task;
  if (!attempt || !task || observed.stage !== 'pending' || attempt.kind === 'pickup') throw new Error('Forecast pending identity mismatch');
  validateHaulingBinding(attempt,{ home,unit: observed.unit,request: task.request });
  if (attempt.room !== (attempt.kind === 'withdraw' ? room : home)) throw new Error('Forecast pending room mismatch');
}
function applyReflected(opening: PaidCourierOpening): void {
  const effect = opening.reflectedEffect, journal = opening.observed.journal;
  if (!effect) {
    if (opening.observed.stage === 'pending') throw new Error('Forecast unresolved opening effect');
    return;
  }
  const attempt = journal?.attempt;
  if (!journal || journal.acknowledged || !attempt || opening.observed.stage !== 'pending') throw new Error('Forecast reflected journal mismatch');
  validateReflectedIdentity(opening);
  journal.result = { status: 'observed',amount: effect.amount };
  if (!journalSchema.valid(journal)) throw new Error('Invalid reflected quantity');
  const resolved = resolvePaidCourierOpening(opening.observed);
  if (resolved.status !== 'ready' || JSON.stringify(resolved.opening.reflectedEffect) !== JSON.stringify(effect)) throw new Error('Forecast reflected progress mismatch');
}
function validateTaskSummary(opening: PaidCourierOpening): void {
  const task = opening.observed.task!, record = task.record;
  if (record.id !== task.id || record.id !== task.request.id || record.wakeAt !== task.wakeAt || record.expiresAt !== task.expiresAt) {
    throw new Error('Forecast task record mismatch');
  }
}
function validateReflectedIdentity(opening: PaidCourierOpening): void {
  const effect = opening.reflectedEffect!, journal = opening.observed.journal!, attempt = journal.attempt!;
  if (attempt.id !== effect.id || attempt.kind !== effect.kind || attempt.tick !== effect.issuedAt || effect.projectedIncome !== 0) {
    throw new Error('Forecast reflected effect mismatch');
  }
  if (journal.result && (journal.result.status !== 'observed' || journal.result.amount !== effect.amount)) throw new Error('Forecast reflected result mismatch');
}
function openingRequest(opening: PaidCourierOpening): LogisticsRecord | undefined {
  const task = opening.observed.task;
  if (!task) return undefined;
  const record = { request: task.request,cancelled: false,receipts: task.receipts };
  const effect = opening.reflectedEffect;
  // Past delivery already exists in opening bank stock. Seed its receipt before advancing any frame.
  if (effect?.kind === 'transfer' && effect.amount > 0 && effect.postedAmount === 0) {
    record.receipts.push({ id: effect.id,amount: effect.amount });
  }
  return record;
}
