import { copyPlain } from '../../../../core/plain-data';
import { integer, keys, numbers, record, requireCheckpoint } from './validation';
import type { StartupContainerInput } from '../container';
export interface StartupContainerCheckpoint {
  previousFrame: number | null; hits: number; decayIn: number; destroyedAt: number | null;
  repairedHits: number; repairEnergy: number; decayEvents: number; unrecoveredEnergy: number;
}
export function restoreContainerCheckpoint(input: StartupContainerInput, value: unknown): StartupContainerCheckpoint {
  requireCheckpoint(record(value)); const saved = value as StartupContainerCheckpoint, data = value as Record<string,unknown>;
  requireCheckpoint(keys(data,['previousFrame','hits','decayIn','destroyedAt','repairedHits','repairEnergy','decayEvents','unrecoveredEnergy']));
  requireCheckpoint(numbers(data,['hits','decayIn','repairedHits','repairEnergy','decayEvents','unrecoveredEnergy']));
  requireCheckpoint(saved.hits <= input.hitsMax && integer(saved.decayIn,1,input.decayInterval));
  requireCheckpoint(saved.previousFrame === null || integer(saved.previousFrame,0,10000));
  requireCheckpoint(saved.destroyedAt === null || integer(saved.destroyedAt,1,Number(saved.previousFrame)+1));
  requireCheckpoint((saved.hits === 0) === (saved.destroyedAt !== null));
  return copyPlain(saved);
}
