import { validateHarvest,settleHarvest } from './ecology';
import { validateRepair,settleRepair } from './repair';
import { validateEnergyTransfer } from './validation';
import type { EnergyInventory,EnergyIntent,EnergyEffect,EnergyEcology,EnergyTransferIntent,EnergyTransferEffect } from './model';
export function validateEnergyIntent(intent: EnergyIntent,stores: ReadonlyMap<string,EnergyInventory>,ecology: EnergyEcology): void {
  if (intent.kind === 'harvest') validateHarvest(intent,stores,ecology);
  else if (intent.kind === 'repair') validateRepair(intent,stores,ecology);
  else validateEnergyTransfer(intent,stores);
}
export function settleEnergyIntent(stores: Map<string,EnergyInventory>,ecology: EnergyEcology,intent: EnergyIntent,tick: number): EnergyEffect {
  if (intent.kind === 'harvest') return settleHarvest(stores,ecology,intent,tick);
  if (intent.kind === 'repair') return settleRepair(stores,ecology,intent,tick);
  return settleTransfer(stores,intent,tick);
}
function settleTransfer(stores: Map<string,EnergyInventory>,intent: EnergyTransferIntent,tick: number): EnergyTransferEffect {
  const source = stores.get(intent.source)!,target = stores.get(intent.target)!;
  // Engine4.3.2 transfers require the full sender amount; withdrawals clip to remaining source stock.
  const available = intent.kind === 'transfer' && source.energy < intent.amount ? 0 : source.energy;
  const amount = Math.min(intent.amount,available,target.freeEnergyCapacity);
  source.energy -= amount; source.usedCapacity -= amount; source.freeEnergyCapacity += amount;
  target.energy += amount; target.usedCapacity += amount; target.freeEnergyCapacity -= amount;
  return { ...intent,amount,issuedAt: tick,settledAt: tick+1 };
}
