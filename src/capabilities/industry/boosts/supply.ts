import type { LabWarehouse } from '../labs/transport';
export interface BoostLab { id: string; mineral: string | null; amount: number; free: number; energy: number; energyFree: number }
export interface BoostSupply { resource: string; mineral: number; energy: number; maximum: number; mineralReserve: number; energyReserve: number }
export interface BoostTransfer { direction: string; source: string; sink: string; resource: string; quantity: number }
export function planBoostSupply(lab: BoostLab,stores: readonly LabWarehouse[],need: BoostSupply): BoostTransfer | undefined {
  if (lab.mineral && lab.mineral !== need.resource && lab.amount > 0) {
    const sink = stores.find(store => store.free > 0), quantity = Math.min(lab.amount,sink?.free ?? 0,need.maximum);
    return sink && quantity > 0 ? { direction: 'drain',source: lab.id,sink: sink.id,resource: lab.mineral,quantity } : undefined;
  }
  if (lab.amount < need.mineral) return refill(lab,stores,need.resource,need.mineral-lab.amount,lab.free,need.mineralReserve,need.maximum);
  if (lab.energy < need.energy) return refill(lab,stores,'energy',need.energy-lab.energy,lab.energyFree,need.energyReserve,need.maximum);
  return undefined;
}
function refill(lab: BoostLab,stores: readonly LabWarehouse[],resource: string,missing: number,free: number,reserve: number,maximum: number): BoostTransfer | undefined {
  const source = stores.find(store => (store.stock[resource] ?? 0) > reserve);
  const quantity = Math.min(missing,free,maximum,Math.max(0,(source?.stock[resource] ?? 0)-reserve));
  return source && quantity > 0 ? { direction: 'boost-refill',source: source.id,sink: lab.id,resource,quantity } : undefined;
}
