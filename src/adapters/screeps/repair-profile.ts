import type { RepairProfile } from '../../capabilities/mining/repair-effect';
import { nativeWorkProfile } from './work-profile';
export function nativeRepairProfile(body: readonly BodyPartDefinition[]): RepairProfile {
  return nativeWorkProfile(body,'repair',100);
}
