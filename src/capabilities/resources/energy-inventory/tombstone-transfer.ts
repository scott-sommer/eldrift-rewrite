import type { EnergyEcology,EnergyInventory,EnergyTransferIntent,EnergyTransferEffect } from './model';
/** Tombstones expose stock, never receiving capacity or home cash. */
export function settleTombstoneWithdrawal(stores: Map<string,EnergyInventory>,ecology: EnergyEcology,intent: EnergyTransferIntent,tick: number): EnergyTransferEffect {
  const source = ecology.tombstones!.find(tomb => tomb.id === intent.source)!,target = stores.get(intent.target)!;
  const amount = Math.min(intent.amount,source.energy,target.freeEnergyCapacity);
  source.energy -= amount; target.energy += amount; target.usedCapacity += amount; target.freeEnergyCapacity -= amount;
  return { ...intent,amount,issuedAt: tick,settledAt: tick+1 };
}
