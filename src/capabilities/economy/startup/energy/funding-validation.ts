import { validateEnergyLayout } from './validation';
import type { StartupSpawnInput } from '../spawn-model';
export function validateStructureFunding(input: StartupSpawnInput): void {
  const layout = input.funding.energyLayout;
  if (!layout) return;
  validateEnergyLayout(layout);
  if (layout.regeneration) throw new Error('Ambient funding integration pending');
  const available = layout.structures.reduce((sum,point) => sum+point.energy-(point.reservedEnergy ?? 0),0);
  const capacity = layout.structures.reduce((sum,point) => sum+point.capacity-(point.reservedEnergy ?? 0)-(point.reservedCapacity ?? 0),0);
  if (available !== input.funding.initialEnergy || capacity !== input.funding.capacity || input.funding.refills.length) throw new Error('Invalid structure funding totals/refills');
  const stock = layout.structures.reduce((sum,point) => sum+point.energy,0);
  if (stock > input.cash.homeEnergy || input.spawns.some(spawn => !layout.orders.some(order => order.spawn === spawn.id))) throw new Error('Invalid structure funding bank/origins');
}
