import { startupHasLocatedExpenses } from '../cash-expenses';
import type { StartupDeliveryInput } from '../delivery-model';
/** New physical semantics must never be relabeled as an older aggregate project. */
export function startupProjectFormat(input: StartupDeliveryInput): 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 {
  if (input.motion !== undefined) return 9;
  if (input.shared !== undefined) return 8;
  if (input.household?.labor !== undefined) return 7;
  if (startupHasLocatedExpenses(input.project.spawning.cash.flows)) return 6;
  if (input.project.spawning.funding.energyLayout?.regeneration) return 5;
  if (input.project.spawning.funding.energyLayout) return 4;
  return input.household ? 3 : 2;
}
