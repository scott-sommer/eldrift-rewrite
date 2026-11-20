import type { LabConfig } from '../config/labs';
import type { StatePort } from '../persistence/versioned-state';
import { boostRoleLabIds } from '../features/industry/boost-labs/store';
import { reservedBoostLabs } from '../features/industry/boosts/store';
export function nativeLabSettings<T extends Readonly<LabConfig>>(state: StatePort,home: string,settings: T): T {
  return { ...settings,labReservedIds: [...settings.labReservedIds,...boostRoleLabIds(state,home,settings.labBoostRoles),...reservedBoostLabs(state,home)] };
}
