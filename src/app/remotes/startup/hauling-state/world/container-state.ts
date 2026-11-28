import { withinRange } from '../../../../../capabilities/movement/path-model';
import type { EnergyContainer,EnergyEcology } from '../../../../../capabilities/resources/energy-inventory/model';
export function destroyedHomeStores(ecology: EnergyEcology | undefined): ReadonlySet<string> {
  return new Set(ecology?.containers.filter(container => container.destroyedAt !== undefined).map(container => container.id) ?? []);
}
export function validateHomeContainerMetadata(opening: readonly EnergyContainer[],current: readonly EnergyContainer[]): void {
  if (opening.length !== current.length) throw new Error('Home checkpoint container roster mismatch');
  for (const container of current) {
    const initial = opening.find(value => value.id === container.id);
    if (!initial || !withinRange(initial.position,container.position,0)) throw new Error('Home checkpoint container geometry mismatch');
    validateDecayRules(initial,container);
  }
}
function validateDecayRules(opening: EnergyContainer,current: EnergyContainer): void {
  if (opening.decay === undefined && current.decay === undefined) return;
  if (!opening.decay || !current.decay || opening.decay.interval !== current.decay.interval || opening.decay.amount !== current.decay.amount) throw new Error('Home checkpoint container decay rules mismatch');
}
