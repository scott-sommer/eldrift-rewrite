export interface EnergyInventory {
  id: string; energy: number; capacity: number; usedCapacity: number; freeEnergyCapacity: number;
}
export interface EnergyTransferIntent { id: string; kind: 'withdraw' | 'transfer'; source: string; target: string; amount: number }
export interface EnergyTransferEffect extends EnergyTransferIntent { issuedAt: number; settledAt: number }
