import { copyPlain } from '../../persistence/plain-data';
import { placementKey } from '../planning/dependencies';
import type { PlanEntry } from '../planning/plan-model';
import type { ConstructionAttempt } from './executor';
export interface ConstructionRetry { failures: number; nextAttempt: number; reason: string; quarantined: boolean }
export type ConstructionRetries = Record<string, ConstructionRetry>;
export interface ConstructionRetryPolicy { attempts: number; delay: number; maximumDelay: number }
export const constructionRetryDefaults: ConstructionRetryPolicy = { attempts: 3, delay: 10, maximumDelay: 1000 };
export function constructionRetries(saved: ConstructionRetries, tick: number, policy: ConstructionRetryPolicy) {
  validatePolicy(tick, policy);
  const records = copyPlain(saved);
  return { before(entry: PlanEntry): ConstructionAttempt | undefined {
    const previous = records[placementKey(entry)];
    if (!previous) return undefined;
    if (previous.quarantined) return { status: 'invalid', reason: 'quarantined:' + previous.reason };
    if (tick < previous.nextAttempt) return { status: 'retry', reason: 'retry-wait' };
    return undefined;
  }, after(entry: PlanEntry, result: ConstructionAttempt) {
    const key = placementKey(entry);
    if (result.status === 'created') { delete records[key]; return; }
    if (!['retry', 'invalid'].includes(result.status)) return;
    const failures = Math.min(1000, (records[key]?.failures ?? 0) + 1);
    records[key] = { failures, nextAttempt: tick + Math.min(policy.maximumDelay, policy.delay * 2 ** Math.min(failures - 1, 30)),
      reason: result.reason, quarantined: result.status === 'invalid' || failures >= policy.attempts };
  }, present(entry: PlanEntry) { delete records[placementKey(entry)]; }, snapshot: () => copyPlain(records) };
}
export function validConstructionRetries(value: unknown): value is ConstructionRetries {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const rows = Object.entries(value);
  return rows.length <= 10000 && rows.every(([key, record]) => key.length > 0 && validRetry(record));
}
function validRetry(value: ConstructionRetry): boolean {
  return !!value && integer(value.failures) && value.failures >= 1 && value.failures <= 1000
    && integer(value.nextAttempt) && typeof value.reason === 'string' && value.reason.length <= 1024
    && typeof value.quarantined === 'boolean';
}
function validatePolicy(tick: number, policy: ConstructionRetryPolicy): void {
  if (!integer(tick) || tick > Number.MAX_SAFE_INTEGER - policy.maximumDelay) throw new Error('Invalid construction retry tick');
  if (![policy.attempts, policy.delay, policy.maximumDelay].every(integer)
    || policy.attempts < 1 || policy.attempts > 1000 || policy.delay < 1 || policy.maximumDelay < policy.delay) {
    throw new Error('Invalid construction retry policy');
  }
}
function integer(value: number): boolean { return Number.isSafeInteger(value) && value >= 0; }
