import { retireGroundUnit } from '../features/logistics/retire-ground-unit';
import type { RemovableStatePort } from '../persistence/versioned-state';
import { retireLogisticsUnit } from '../features/logistics/retire-unit';
/** Compose feature retirement with the lifecycle's previous native identity. */
export function createLogisticsRetirement(state: RemovableStatePort): (unit: string) => void {
  return unit => { retireLogisticsUnit(state, unit); retireGroundUnit(state, unit); };
}
