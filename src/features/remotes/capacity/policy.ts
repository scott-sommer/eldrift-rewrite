import type { SpawnLoadReport } from '../../population/spawn-load/model';
import type { RemoteCapacityPolicy, RemoteCapacityRecord } from './model';
/** Legacy RCL caps count source miners; room commitments and workforce ceilings remain separate. */
export function supportedRemoteSources(record: RemoteCapacityRecord, level: number, maximum: number): number {
  const supported = level < 3 ? 2 : level === 3 ? 3 : record.supported;
  return Math.min(supported,maximum);
}
export function nextRemoteCapacity(record: RemoteCapacityRecord, tick: number, level: number, load: SpawnLoadReport, policy: RemoteCapacityPolicy): RemoteCapacityRecord | undefined {
  validate(tick,level,policy);
  validateLoad(load);
  if (level < 3 || tick < record.clock) return undefined;
  if (record.evaluatedAt === null) return { ...record,clock: tick,supported: Math.min(policy.initial,policy.maximum),evaluatedAt: tick,observedLoad: null };
  if (tick-record.evaluatedAt < policy.interval || load.coverage < 1 || load.spawnCount === 0) return undefined;
  const change = load.load <= policy.increaseAt ? 1 : load.load >= policy.decreaseAt ? -1 : 0;
  return { ...record,clock: tick,supported: Math.max(0,Math.min(policy.maximum,record.supported+change)),evaluatedAt: tick,observedLoad: load.load };
}
function validate(tick: number, level: number, policy: RemoteCapacityPolicy): void {
  if (![tick,level,policy.initial,policy.maximum,policy.interval].every(value => Number.isSafeInteger(value) && value >= 0) || level > 8 || policy.maximum > 128 || policy.initial > 128 || policy.interval < 1) throw new Error('Invalid remote capacity bounds');
  if (![policy.increaseAt,policy.decreaseAt].every(value => Number.isFinite(value) && value >= 0 && value <= 1) || policy.increaseAt >= policy.decreaseAt) throw new Error('Invalid remote capacity thresholds');
}

function validateLoad(load: SpawnLoadReport): void {
  if (![load.load,load.coverage].every(value => Number.isFinite(value) && value >= 0 && value <= 1)) throw new Error('Invalid remote capacity observation');
  if (![load.busyTicks,load.starvedTicks,load.spawnCount].every(value => Number.isSafeInteger(value) && value >= 0) || load.spawnCount > 3) throw new Error('Invalid remote capacity observation');
}
