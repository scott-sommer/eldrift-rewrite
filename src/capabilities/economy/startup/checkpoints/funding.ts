import { copyPlain } from '../../../../core/plain-data';
import { integer, keys, numbers, record, requireCheckpoint } from './validation';
export interface StartupFundingCheckpoint { bank: number; accessible: number; refilledEnergy: number; unfilledEnergy: number }
export function restoreFundingCheckpoint(capacity: number, value: unknown): StartupFundingCheckpoint {
  requireCheckpoint(record(value)); const saved = value as StartupFundingCheckpoint, data = value as Record<string,unknown>;
  requireCheckpoint(keys(data,['bank','accessible','refilledEnergy','unfilledEnergy']));
  requireCheckpoint(integer(saved.bank,-Number.MAX_SAFE_INTEGER) && numbers(data,['accessible','refilledEnergy','unfilledEnergy']));
  requireCheckpoint(saved.accessible <= Math.min(capacity,Math.max(0,saved.bank)));
  return copyPlain(saved);
}
