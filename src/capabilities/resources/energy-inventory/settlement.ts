import { validateEnergyLifetimeClocks,positionEnergyBodies } from './lifetime-validation';
import { validateBuildClocks } from './construction';
import { copyPlain } from '../../../core/plain-data';
import { settleEnergyIntent } from './operations';
import { validateEnergyInventories,validateEnergyTransferOrder } from './validation';
import { validateEnergyEcology } from './ecology';
import { validateContainerClocks } from './container';
import { postprocessEnergy } from './postprocess';
import type { EnergyInventory,EnergyEcology,EnergyIntent,EnergyPostprocessOrder,EnergyBornInventory,EnergyBodyPosition } from './model';
export function settleEnergyFrame<T extends EnergyInventory>(stores: ReadonlyMap<string,T>,ecology: EnergyEcology,intents: ReadonlyMap<string,EnergyIntent>,
  order: readonly string[],tick: number,postprocess?: EnergyPostprocessOrder,positions?: readonly EnergyBodyPosition[]) {
  validateEnergyTransferOrder(order,intents);
  const next = new Map<string,T | EnergyBornInventory>([...stores].map(([id,store]) => [id,copyPlain(store)])),nextEcology = copyPlain(ecology);
  positionEnergyBodies(nextEcology,positions);
  const effects = order.map(id => settleEnergyIntent(next,nextEcology,intents.get(id)!,tick));
  postprocessEnergy(next,nextEcology,tick,postprocess);
  validateEnergyEcology(nextEcology,[...next.values()]); validateContainerClocks(nextEcology,tick+1); validateBuildClocks(nextEcology,tick+1); validateEnergyLifetimeClocks(nextEcology,tick+1); validateEnergyInventories([...next.values()]);
  return { stores: next,ecology: nextEcology,effects };
}
