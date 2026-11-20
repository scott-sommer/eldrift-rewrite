import { copyPlain } from '../../../../core/plain-data';
import { integer, keys, record, requireCheckpoint } from './validation';
export interface StartupSinkCheckpoint { free: number; acceptedEnergy: number; through: number }
export function restoreSinkCheckpoint(capacity: number, horizon: number, value: unknown): StartupSinkCheckpoint {
  requireCheckpoint(record(value)); const saved = value as StartupSinkCheckpoint;
  requireCheckpoint(keys(value as Record<string,unknown>,['free','acceptedEnergy','through']));
  requireCheckpoint(integer(saved.free,0,capacity) && integer(saved.acceptedEnergy) && integer(saved.through,-1,horizon));
  return copyPlain(saved);
}
