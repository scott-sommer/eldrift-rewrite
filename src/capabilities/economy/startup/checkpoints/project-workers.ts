import { startupProjectCouriers } from '../initial';
import { integer, keys, record, requireCheckpoint } from './validation';
import type { StartupDeliveryInput, StartupCourierState } from '../delivery-model';
import type { StartupScheduledBirth } from '../spawn-model';
import type { StartupCourierCheckpoint } from './project-model';
export function validateProjectCouriers(input: StartupDeliveryInput, births: StartupScheduledBirth[], value: unknown, tick: number): asserts value is StartupCourierCheckpoint[] {
  const expected = startupProjectCouriers(input,births);
  requireCheckpoint(Array.isArray(value) && value.length === expected.length);
  requireCheckpoint((value as unknown[]).every((worker,index) => validWorker(worker,expected[index]!,tick,!!input.motion)));
}
function validWorker(value: unknown, expected: StartupCourierState, tick: number, physical: boolean): boolean {
  if (!record(value) || !keys(value,Object.keys(expected))) return false;
  const immutable = Object.keys(expected).filter(key => !['nextAt','phase','cargo'].includes(key));
  if (!immutable.every(key => value[key] === expected[key as keyof StartupCourierState])) return false;
  if (!['collect','deliver'].includes(String(value.phase)) || !integer(value.cargo,0,expected.capacity)) return false;
  if (value.nextAt === null) return tick > expected.expiresAt && value.cargo === 0;
  return integer(value.nextAt,physical ? 0 : expected.nextAt,Math.max(expected.nextAt,expected.expiresAt+1500));
}
