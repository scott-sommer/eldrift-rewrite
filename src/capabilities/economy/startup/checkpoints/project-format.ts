import type { StartupDeliveryInput } from '../delivery-model';
/** New physical semantics must never be relabeled as an older aggregate project. */
export function startupProjectFormat(input: StartupDeliveryInput): 2 | 3 | 4 {
  if (input.project.spawning.funding.energyLayout) return 4;
  return input.household ? 3 : 2;
}
