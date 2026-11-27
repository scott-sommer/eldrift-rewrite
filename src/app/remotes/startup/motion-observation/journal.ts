import { logisticsPool } from '../../../../capabilities/logistics/request';
import type { Journal } from '../../../../features/logistics/transfer-journal';
import type { PaidCourierContext,PaidCourierObservation } from './model';
export function validPaidCourierJournal(context: PaidCourierContext,unit: string,journal: Journal | undefined,task: PaidCourierObservation['task'],tick: number): boolean {
  if (!journal) return true;
  if (journal.attempt && (journal.attempt.unit !== unit || journal.attempt.tick > tick)) return false;
  if (journal.result?.status === 'unknown') return false;
  if (journal.acknowledged) return true;
  return pendingMatches(context,unit,journal,task,tick);
}
function pendingMatches(context: PaidCourierContext,unit: string,journal: Journal,task: PaidCourierObservation['task'],tick: number): boolean {
  const attempt = journal.attempt;
  if (!attempt || !task || attempt.unit !== unit || attempt.tick > tick) return false;
  if (attempt.resource !== 'energy' || attempt.kind === 'pickup') return false;
  if (attempt.requestKey !== logisticsPool('request-binding',context.cohort.home,task.request.owner,task.request.id)) return false;
  if (attempt.tick < tick-1 && journal.result === null) return false;
  return matchingTarget(context,journal,task);
}
function matchingTarget(context: PaidCourierContext,journal: Journal,task: NonNullable<PaidCourierObservation['task']>): boolean {
  const attempt = journal.attempt!;
  const target = attempt.kind === 'withdraw' ? task.request.source : task.request.sink;
  const room = attempt.kind === 'withdraw' ? context.cohort.room : context.cohort.home;
  return attempt.target === target && attempt.room === room;
}
